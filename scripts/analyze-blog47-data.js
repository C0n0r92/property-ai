const fs = require('fs');

// Load data
const data = JSON.parse(fs.readFileSync('dashboard/public/data.json', 'utf8'));

// Filter for valid 2024-2025 properties
const validProperties = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31') &&
         p.areaSqm > 0 &&
         p.dublinPostcode;
});

console.log(`Total valid properties analyzed: ${validProperties.length}`);

// Market Quiet Zones: Areas with Lowest Sales Activity and Price Stability
console.log('\n=== MARKET QUIET ZONES ANALYSIS ===');

// Group properties by Dublin postcode
const postcodeGroups = {};
validProperties.forEach(p => {
  const postcode = p.dublinPostcode;
  if (!postcodeGroups[postcode]) {
    postcodeGroups[postcode] = [];
  }
  postcodeGroups[postcode].push(p);
});

console.log('\nSales Volume by Postcode:');
const salesVolumeData = Object.entries(postcodeGroups)
  .map(([postcode, properties]) => ({
    postcode,
    salesCount: properties.length,
    avgPrice: properties.reduce((sum, p) => sum + p.soldPrice, 0) / properties.length,
    avgOverAsking: properties.reduce((sum, p) => sum + p.overUnderPercent, 0) / properties.length,
    overAskingSuccess: properties.filter(p => p.overUnderPercent > 0).length / properties.length * 100
  }))
  .sort((a, b) => a.salesCount - b.salesCount)
  .filter(data => data.salesCount >= 10); // Minimum sample size

salesVolumeData.forEach(data => {
  console.log(`${data.postcode}: ${data.salesCount} sales, €${data.avgPrice.toLocaleString()} avg, ${data.avgOverAsking.toFixed(1)}% over-asking`);
});

// Price trend analysis (comparing quarters)
console.log('\nPrice Trend Analysis by Quarter:');
const quarters = ['2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4', '2025-Q1', '2025-Q2'];

const quarterlyTrends = {};
quarters.forEach(quarter => {
  quarterlyTrends[quarter] = {};
});

Object.keys(postcodeGroups).forEach(postcode => {
  const properties = postcodeGroups[postcode];

  quarters.forEach(quarter => {
    const quarterProps = properties.filter(p => {
      const date = new Date(p.soldDate);
      const year = date.getFullYear();
      const q = Math.ceil((date.getMonth() + 1) / 3);
      return `${year}-Q${q}` === quarter;
    });

    if (quarterProps.length >= 5) {
      const avgPrice = quarterProps.reduce((sum, p) => sum + p.soldPrice, 0) / quarterProps.length;
      quarterlyTrends[quarter][postcode] = avgPrice;
    }
  });
});

// Calculate price changes between quarters
console.log('\nPrice Change Analysis (Q1 2024 to Q2 2025):');
const priceChangeData = Object.keys(postcodeGroups)
  .filter(postcode => {
    const q1Price = quarterlyTrends['2024-Q1'][postcode];
    const q2Price = quarterlyTrends['2025-Q2'][postcode];
    return q1Price && q2Price && postcodeGroups[postcode].length >= 20;
  })
  .map(postcode => {
    const q1Price = quarterlyTrends['2024-Q1'][postcode];
    const q2Price = quarterlyTrends['2025-Q2'][postcode];
    const priceChange = ((q2Price - q1Price) / q1Price) * 100;

    return {
      postcode,
      q1Price,
      q2Price,
      priceChange,
      salesCount: postcodeGroups[postcode].length
    };
  })
  .sort((a, b) => Math.abs(a.priceChange)); // Sort by least change (most stable)

priceChangeData.forEach(data => {
  console.log(`${data.postcode}: ${data.priceChange > 0 ? '+' : ''}${data.priceChange.toFixed(1)}% change (€${data.q1Price.toLocaleString()} → €${data.q2Price.toLocaleString()}), ${data.salesCount} sales`);
});

// Over-asking stability analysis
console.log('\nOver-Asking Stability Analysis:');
const overAskingStability = Object.entries(postcodeGroups)
  .filter(([postcode, properties]) => properties.length >= 20)
  .map(([postcode, properties]) => {
    const overAskingRates = quarters.map(quarter => {
      const quarterProps = properties.filter(p => {
        const date = new Date(p.soldDate);
        const year = date.getFullYear();
        const q = Math.ceil((date.getMonth() + 1) / 3);
        return `${year}-Q${q}` === quarter;
      });

      if (quarterProps.length >= 5) {
        const successRate = quarterProps.filter(p => p.overUnderPercent > 0).length / quarterProps.length * 100;
        const avgPremium = quarterProps.filter(p => p.overUnderPercent > 0)
          .reduce((sum, p) => sum + p.overUnderPercent, 0) / quarterProps.filter(p => p.overUnderPercent > 0).length || 0;
        return { quarter, successRate, avgPremium, sampleSize: quarterProps.length };
      }
      return null;
    }).filter(Boolean);

    const avgSuccessRate = overAskingRates.reduce((sum, q) => sum + q.successRate, 0) / overAskingRates.length;
    const successRateStdDev = Math.sqrt(
      overAskingRates.reduce((sum, q) => sum + Math.pow(q.successRate - avgSuccessRate, 2), 0) / overAskingRates.length
    );

    const avgPremium = overAskingRates.reduce((sum, q) => sum + q.avgPremium, 0) / overAskingRates.length;

    return {
      postcode,
      avgSuccessRate,
      successRateStdDev,
      avgPremium,
      salesCount: properties.length,
      quartersAnalyzed: overAskingRates.length
    };
  })
  .filter(data => data.quartersAnalyzed >= 2)
  .sort((a, b) => a.successRateStdDev); // Sort by most stable over-asking

overAskingStability.forEach(data => {
  console.log(`${data.postcode}: ${data.avgSuccessRate.toFixed(1)}% success rate (±${data.successRateStdDev.toFixed(1)}%), ${data.avgPremium.toFixed(1)}% avg premium, ${data.salesCount} total sales`);
});

// Market quiet zones identification
console.log('\n=== MARKET QUIET ZONES IDENTIFICATION ===');

const quietZones = salesVolumeData
  .filter(data => data.salesCount <= salesVolumeData[Math.floor(salesVolumeData.length * 0.25)].salesCount) // Bottom 25% by sales volume
  .map(area => {
    const trend = priceChangeData.find(t => t.postcode === area.postcode);
    const stability = overAskingStability.find(s => s.postcode === area.postcode);

    return {
      postcode: area.postcode,
      salesCount: area.salesCount,
      avgPrice: area.avgPrice,
      overAskingSuccess: area.overAskingSuccess,
      priceChange: trend ? trend.priceChange : null,
      successRateStability: stability ? stability.successRateStdDev : null,
      avgPremium: stability ? stability.avgPremium : area.avgOverAsking
    };
  })
  .sort((a, b) => a.salesCount);

console.log('\nQuiet Market Zones (Lowest Activity):');
quietZones.forEach(zone => {
  console.log(`${zone.postcode}: ${zone.salesCount} sales, €${zone.avgPrice.toLocaleString()} avg, ${zone.overAskingSuccess.toFixed(1)}% success rate${zone.priceChange !== null ? `, ${zone.priceChange > 0 ? '+' : ''}${zone.priceChange.toFixed(1)}% price change` : ''}`);
});

// Price stability zones
console.log('\nPrice Stability Zones (Least Price Movement):');
const stabilityZones = priceChangeData
  .filter(data => Math.abs(data.priceChange) <= 5.0) // Less than 5% change
  .sort((a, b) => Math.abs(a.priceChange));

stabilityZones.forEach(zone => {
  console.log(`${zone.postcode}: ${zone.priceChange > 0 ? '+' : ''}${zone.priceChange.toFixed(1)}% change, ${zone.salesCount} sales, €${zone.q2Price.toLocaleString()} current avg`);
});

// Export chart data
const chartData = {
  salesVolumeChart: salesVolumeData.slice(0, 15).map(data => ({ // Bottom 15 areas by sales
    postcode: data.postcode,
    salesCount: data.salesCount,
    averagePrice: Math.round(data.avgPrice),
    overAskingSuccess: data.overAskingSuccess,
    averageOverAsking: data.avgOverAsking
  })),

  priceStabilityChart: priceChangeData.slice(0, 15).map(data => ({
    postcode: data.postcode,
    priceChange: data.priceChange,
    q1Price: Math.round(data.q1Price),
    q2Price: Math.round(data.q2Price),
    salesCount: data.salesCount
  })),

  overAskingStabilityChart: overAskingStability.slice(0, 15).map(data => ({
    postcode: data.postcode,
    avgSuccessRate: data.avgSuccessRate,
    successRateStdDev: data.successRateStdDev,
    avgPremium: data.avgPremium,
    salesCount: data.salesCount
  })),

  quietZonesComparisonChart: quietZones.slice(0, 10).map(zone => ({
    postcode: zone.postcode,
    salesCount: zone.salesCount,
    averagePrice: Math.round(zone.avgPrice),
    overAskingSuccess: zone.overAskingSuccess,
    priceChange: zone.priceChange,
    successRateStability: zone.successRateStability
  })),

  quarterlyPriceTrendsChart: quarters.map(quarter => {
    const quarterData = Object.keys(postcodeGroups)
      .filter(postcode => quarterlyTrends[quarter][postcode])
      .map(postcode => ({
        postcode,
        averagePrice: Math.round(quarterlyTrends[quarter][postcode]),
        salesCount: postcodeGroups[postcode].length
      }))
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 10); // Top 10 by sales volume for readability

    return {
      quarter,
      areas: quarterData
    };
  })
};

fs.writeFileSync('blog47_market_quiet_zones_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('\nChart data exported to blog47_market_quiet_zones_chart_data.json');

// Summary insights
console.log('\n=== KEY INSIGHTS ===');
console.log(`Total areas analyzed: ${Object.keys(postcodeGroups).length}`);
console.log(`Areas with lowest sales activity (bottom 25%): ${quietZones.length}`);
console.log(`Areas with price stability (<5% change): ${stabilityZones.length}`);
console.log(`Average sales per quiet zone: ${quietZones.reduce((sum, z) => sum + z.salesCount, 0) / quietZones.length}`);
console.log(`Average price change in stable areas: ${(stabilityZones.reduce((sum, z) => sum + Math.abs(z.priceChange), 0) / stabilityZones.length).toFixed(1)}%`);
