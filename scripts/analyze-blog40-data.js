const fs = require('fs');

// Load data
const data = JSON.parse(fs.readFileSync('dashboard/public/data.json', 'utf8'));

// Filter for valid 2024-2025 properties
const validProperties = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31');
});

console.log(`Properties analyzed: ${validProperties.length}`);

// Bathroom Premium Deep Dive Analysis
console.log('\nBathroom Premium Analysis:');

// Comprehensive bathroom analysis by bedroom count
console.log('Bathroom Distribution by Bedroom Count:');
for (let beds = 1; beds <= 5; beds++) {
  const bedProps = validProperties.filter(p => p.beds === beds);
  if (bedProps.length < 50) continue;

  console.log(`${beds} bedroom properties:`);

  const bathroomCounts = {};
  bedProps.forEach(p => {
    const baths = Math.min(p.baths || 1, 5); // Cap at 5 for analysis
    bathroomCounts[baths] = (bathroomCounts[baths] || 0) + 1;
  });

  Object.entries(bathroomCounts).sort(([a], [b]) => parseInt(a) - parseInt(b)).forEach(([baths, count]) => {
    const percentage = (count / bedProps.length * 100).toFixed(1);
    console.log(`  ${baths} bathrooms: ${count} properties (${percentage}%)`);
  });
  console.log('');
}

// Bathroom premium by property size and type
console.log('Bathroom Premium by Property Type:');
const propertyTypes = ['Apartment', 'Terrace', 'Semi-D', 'Detached'];
propertyTypes.forEach(type => {
  const typeProps = validProperties.filter(p => p.propertyType === type);
  if (typeProps.length < 200) return;

  console.log(`${type} properties:`);

  const bathroomPremiums = {};
  for (let baths = 1; baths <= 4; baths++) {
    const bathProps = typeProps.filter(p => p.baths === baths);
    if (bathProps.length < 20) continue;

    const avgPrice = bathProps.reduce((sum, p) => sum + p.soldPrice, 0) / bathProps.length;
    const avgSize = bathProps.reduce((sum, p) => sum + p.areaSqm, 0) / bathProps.length;
    bathroomPremiums[baths] = { avgPrice, avgSize, count: bathProps.length };
  }

  // Calculate premiums
  for (let baths = 2; baths <= 4; baths++) {
    if (bathroomPremiums[baths] && bathroomPremiums[baths-1]) {
      const pricePremium = bathroomPremiums[baths].avgPrice - bathroomPremiums[baths-1].avgPrice;
      const sizePremium = bathroomPremiums[baths].avgSize - bathroomPremiums[baths-1].avgSize;
      const premiumPerSqm = pricePremium / sizePremium;

      console.log(`  ${baths-1}→${baths} baths: €${pricePremium.toLocaleString()} premium (+${sizePremium.toFixed(0)}sqm = €${premiumPerSqm.toFixed(0)}/sqm)`);
    }
  }
  console.log('');
});

// Bathroom efficiency analysis - value per bathroom
console.log('Bathroom Value Efficiency:');
const bathroomEfficiency = {};

for (let baths = 1; baths <= 5; baths++) {
  const bathProps = validProperties.filter(p => p.baths === baths && p.areaSqm > 0);
  if (bathProps.length < 50) continue;

  const avgPrice = bathProps.reduce((sum, p) => sum + p.soldPrice, 0) / bathProps.length;
  const avgSize = bathProps.reduce((sum, p) => sum + p.areaSqm, 0) / bathProps.length;
  const pricePerSqm = avgPrice / avgSize;
  const pricePerBathroom = avgPrice / baths;
  const sqmPerBathroom = avgSize / baths;

  bathroomEfficiency[baths] = {
    avgPrice,
    avgSize,
    pricePerSqm,
    pricePerBathroom,
    sqmPerBathroom,
    count: bathProps.length
  };

  console.log(`${baths} bathroom properties:`);
  console.log(`  Average price: €${avgPrice.toLocaleString()}`);
  console.log(`  Price per bathroom: €${pricePerBathroom.toLocaleString()}`);
  console.log(`  SqM per bathroom: ${sqmPerBathroom.toFixed(1)}`);
  console.log(`  Price efficiency: €${pricePerSqm.toFixed(0)}/sqm`);
  console.log('');
}

// Optimal bathroom configurations
console.log('Optimal Bathroom Configurations:');

// Find the most cost-effective bathroom setups
const efficiencyMetrics = Object.entries(bathroomEfficiency).map(([baths, data]) => ({
  bathrooms: parseInt(baths),
  priceEfficiency: data.pricePerBathroom,
  spaceEfficiency: data.sqmPerBathroom,
  overallEfficiency: data.pricePerSqm / data.sqmPerBathroom,
  avgPrice: data.avgPrice
}));

const mostPriceEfficient = efficiencyMetrics.reduce((best, current) =>
  current.priceEfficiency < best.priceEfficiency ? current : best
);

const mostSpaceEfficient = efficiencyMetrics.reduce((best, current) =>
  current.spaceEfficiency > best.spaceEfficiency ? current : best
);

console.log(`Most price-efficient: ${mostPriceEfficient.bathrooms} bathrooms (€${mostPriceEfficient.priceEfficiency.toLocaleString()} per bathroom)`);
console.log(`Most space-efficient: ${mostSpaceEfficient.bathrooms} bathrooms (${mostSpaceEfficient.spaceEfficiency.toFixed(1)} sqm per bathroom)`);

// Bathroom premium by location (Dublin postcode)
console.log('\nBathroom Premium by Dublin Area:');
const postcodes = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6W', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18', 'D20', 'D22', 'D24'];

postcodes.forEach(postcode => {
  const areaProps = validProperties.filter(p => p.dublinPostcode === postcode);
  if (areaProps.length < 100) return;

  console.log(`${postcode} area (${areaProps.length} properties):`);

  const bathroomData = {};
  for (let baths = 1; baths <= 4; baths++) {
    const bathProps = areaProps.filter(p => p.baths === baths);
    if (bathProps.length < 10) continue;

    const avgPrice = bathProps.reduce((sum, p) => sum + p.soldPrice, 0) / bathProps.length;
    bathroomData[baths] = avgPrice;
  }

  // Calculate premium for 2 vs 1 bathroom
  if (bathroomData[2] && bathroomData[1]) {
    const premium = bathroomData[2] - bathroomData[1];
    const premiumPercent = (premium / bathroomData[1]) * 100;
    console.log(`  1→2 bathroom premium: €${premium.toLocaleString()} (${premiumPercent.toFixed(1)}%)`);
  }

  // Calculate premium for 3 vs 2 bathroom
  if (bathroomData[3] && bathroomData[2]) {
    const premium = bathroomData[3] - bathroomData[2];
    const premiumPercent = (premium / bathroomData[2]) * 100;
    console.log(`  2→3 bathroom premium: €${premium.toLocaleString()} (${premiumPercent.toFixed(1)}%)`);
  }
  console.log('');
});

// Bathroom impact on property appreciation potential
console.log('Bathroom Impact on Market Trends:');

// Analyze how bathroom count affects over-asking success
for (let baths = 1; baths <= 4; baths++) {
  const bathProps = validProperties.filter(p => p.baths === baths);
  if (bathProps.length < 100) continue;

  const overAskingProps = bathProps.filter(p => p.overUnderPercent > 0);
  const successRate = overAskingProps.length / bathProps.length;
  const avgPremium = overAskingProps.length > 0 ?
    overAskingProps.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAskingProps.length : 0;

  console.log(`${baths} bathroom properties:`);
  console.log(`  Over-asking success rate: ${(successRate * 100).toFixed(1)}%`);
  console.log(`  Average premium when successful: ${avgPremium.toFixed(1)}%`);
  console.log('');
}

// Export chart data
const chartData = {
  bathroomDistributionChart: (() => {
    const distribution = {};
    for (let beds = 1; beds <= 5; beds++) {
      const bedProps = validProperties.filter(p => p.beds === beds);
      if (bedProps.length < 50) continue;

      distribution[beds] = {};
      const bathroomCounts = {};
      bedProps.forEach(p => {
        const baths = Math.min(p.baths || 1, 5);
        bathroomCounts[baths] = (bathroomCounts[baths] || 0) + 1;
      });

      Object.entries(bathroomCounts).forEach(([baths, count]) => {
        distribution[beds][baths] = {
          count,
          percentage: (count / bedProps.length * 100)
        };
      });
    }
    return distribution;
  })(),

  bathroomPremiumByTypeChart: propertyTypes.map(type => {
    const typeProps = validProperties.filter(p => p.propertyType === type);
    if (typeProps.length < 200) return null;

    const premiums = [];
    for (let baths = 2; baths <= 4; baths++) {
      const bathProps = typeProps.filter(p => p.baths === baths);
      const prevBathProps = typeProps.filter(p => p.baths === baths - 1);
      if (bathProps.length < 20 || prevBathProps.length < 20) continue;

      const avgPrice = bathProps.reduce((sum, p) => sum + p.soldPrice, 0) / bathProps.length;
      const prevAvgPrice = prevBathProps.reduce((sum, p) => sum + p.soldPrice, 0) / prevBathProps.length;
      const premium = avgPrice - prevAvgPrice;

      premiums.push({
        upgrade: `${baths-1}→${baths}`,
        premium: Math.round(premium),
        percentage: ((premium / prevAvgPrice) * 100)
      });
    }

    return {
      propertyType: type,
      premiums
    };
  }).filter(Boolean),

  bathroomEfficiencyChart: Object.entries(bathroomEfficiency).map(([baths, data]) => ({
    bathrooms: parseInt(baths),
    pricePerBathroom: Math.round(data.pricePerBathroom),
    sqmPerBathroom: data.sqmPerBathroom,
    pricePerSqm: Math.round(data.pricePerSqm),
    sampleSize: data.count
  })),

  bathroomPremiumByAreaChart: postcodes.map(postcode => {
    const areaProps = validProperties.filter(p => p.dublinPostcode === postcode);
    if (areaProps.length < 100) return null;

    const premiums = [];
    for (let baths = 2; baths <= 3; baths++) {
      const bathProps = areaProps.filter(p => p.baths === baths);
      const prevBathProps = areaProps.filter(p => p.baths === baths - 1);
      if (bathProps.length < 10 || prevBathProps.length < 10) continue;

      const avgPrice = bathProps.reduce((sum, p) => sum + p.soldPrice, 0) / bathProps.length;
      const prevAvgPrice = prevBathProps.reduce((sum, p) => sum + p.soldPrice, 0) / prevBathProps.length;
      const premium = avgPrice - prevAvgPrice;

      premiums.push({
        upgrade: `${baths-1}→${baths}`,
        premium: Math.round(premium),
        percentage: ((premium / prevAvgPrice) * 100)
      });
    }

    return {
      area: postcode,
      premiums,
      sampleSize: areaProps.length
    };
  }).filter(Boolean),

  bathroomOverAskingChart: [1,2,3,4].map(baths => {
    const bathProps = validProperties.filter(p => p.baths === baths);
    if (bathProps.length < 100) return null;

    const overAskingProps = bathProps.filter(p => p.overUnderPercent > 0);
    const successRate = overAskingProps.length / bathProps.length * 100;
    const avgPremium = overAskingProps.length > 0 ?
      overAskingProps.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAskingProps.length : 0;

    return {
      bathrooms: baths,
      successRate,
      averagePremium: avgPremium,
      sampleSize: bathProps.length
    };
  }).filter(Boolean),

  optimalConfigurationChart: efficiencyMetrics.map(metric => ({
    bathrooms: metric.bathrooms,
    priceEfficiency: Math.round(metric.priceEfficiency),
    spaceEfficiency: metric.spaceEfficiency,
    overallEfficiency: metric.overallEfficiency,
    averagePrice: Math.round(metric.avgPrice)
  }))
};

fs.writeFileSync('blog40_bathroom_premium_analysis_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('\nChart data exported to blog40_bathroom_premium_analysis_chart_data.json');
