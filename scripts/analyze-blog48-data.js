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

// Conservative Market Strategy: Areas with Least Price Increases and Over-Asking
console.log('\n=== CONSERVATIVE MARKET STRATEGY ANALYSIS ===');

// Group properties by Dublin postcode
const postcodeGroups = {};
validProperties.forEach(p => {
  const postcode = p.dublinPostcode;
  if (!postcodeGroups[postcode]) {
    postcodeGroups[postcode] = [];
  }
  postcodeGroups[postcode].push(p);
});

// Price appreciation analysis (2024 vs 2025)
console.log('\nAnnual Price Appreciation by Postcode:');
const annualAppreciation = Object.entries(postcodeGroups)
  .filter(([postcode, properties]) => properties.length >= 20)
  .map(([postcode, properties]) => {
    const year2024 = properties.filter(p => new Date(p.soldDate).getFullYear() === 2024);
    const year2025 = properties.filter(p => new Date(p.soldDate).getFullYear() === 2025);

    if (year2024.length >= 10 && year2025.length >= 10) {
      const avg2024 = year2024.reduce((sum, p) => sum + p.soldPrice, 0) / year2024.length;
      const avg2025 = year2025.reduce((sum, p) => sum + p.soldPrice, 0) / year2025.length;
      const appreciation = ((avg2025 - avg2024) / avg2024) * 100;

      return {
        postcode,
        avg2024,
        avg2025,
        appreciation,
        totalSales: properties.length,
        sales2024: year2024.length,
        sales2025: year2025.length
      };
    }
    return null;
  })
  .filter(Boolean)
  .sort((a, b) => a.appreciation); // Sort by least appreciation

annualAppreciation.forEach(data => {
  console.log(`${data.postcode}: ${data.appreciation > 0 ? '+' : ''}${data.appreciation.toFixed(1)}% appreciation (€${data.avg2024.toLocaleString()} → €${data.avg2025.toLocaleString()}), ${data.totalSales} total sales`);
});

// Over-asking conservatism analysis
console.log('\nOver-Asking Conservatism by Postcode:');
const overAskingConservatism = Object.entries(postcodeGroups)
  .filter(([postcode, properties]) => properties.length >= 20)
  .map(([postcode, properties]) => {
    const overAskingRate = properties.filter(p => p.overUnderPercent > 0).length / properties.length * 100;
    const avgOverAsking = properties.reduce((sum, p) => sum + p.overUnderPercent, 0) / properties.length;
    const avgPremium = properties.filter(p => p.overUnderPercent > 0).length > 0 ?
      properties.filter(p => p.overUnderPercent > 0).reduce((sum, p) => sum + p.overUnderPercent, 0) /
      properties.filter(p => p.overUnderPercent > 0).length : 0;

    return {
      postcode,
      overAskingRate,
      avgOverAsking,
      avgPremium,
      salesCount: properties.length
    };
  })
  .sort((a, b) => a.overAskingRate); // Sort by lowest over-asking rate

overAskingConservatism.forEach(data => {
  console.log(`${data.postcode}: ${data.overAskingRate.toFixed(1)}% over-asking rate, ${data.avgPremium.toFixed(1)}% avg premium, ${data.salesCount} sales`);
});

// Combined conservative strategy score
console.log('\nConservative Strategy Rankings:');
const conservativeStrategy = Object.keys(postcodeGroups)
  .filter(postcode => postcodeGroups[postcode].length >= 20)
  .map(postcode => {
    const appreciation = annualAppreciation.find(a => a.postcode === postcode);
    const conservatism = overAskingConservatism.find(c => c.postcode === postcode);

    if (!appreciation || !conservatism) return null;

    // Conservative score: lower appreciation + lower over-asking rate = more conservative
    const conservativeScore = (Math.abs(appreciation.appreciation) * 0.6) + (conservatism.overAskingRate * 0.4);

    return {
      postcode,
      conservativeScore,
      appreciation: appreciation.appreciation,
      overAskingRate: conservatism.overAskingRate,
      avgPremium: conservatism.avgPremium,
      avgPrice2025: appreciation.avg2025,
      salesCount: conservatism.salesCount
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.conservativeScore); // Sort by most conservative

conservativeStrategy.forEach(data => {
  console.log(`${data.postcode}: Conservative score ${data.conservativeScore.toFixed(1)}, ${data.appreciation > 0 ? '+' : ''}${data.appreciation.toFixed(1)}% appreciation, ${data.overAskingRate.toFixed(1)}% over-asking rate, €${data.avgPrice2025.toLocaleString()} avg price`);
});

// Buyer advantage zones (areas where sellers are least aggressive)
console.log('\nBuyer Advantage Zones:');
const buyerAdvantage = overAskingConservatism
  .filter(data => data.overAskingRate < 80) // Less than 80% over-asking success
  .sort((a, b) => a.overAskingRate);

buyerAdvantage.forEach(data => {
  const appreciation = annualAppreciation.find(a => a.postcode === data.postcode);
  console.log(`${data.postcode}: ${data.overAskingRate.toFixed(1)}% over-asking success, ${data.avgPremium.toFixed(1)}% avg premium${appreciation ? `, ${appreciation.appreciation > 0 ? '+' : ''}${appreciation.appreciation.toFixed(1)}% YoY change` : ''}, ${data.salesCount} sales`);
});

// Seller strategy zones (areas with stable pricing for confident selling)
console.log('\nStable Pricing Zones for Sellers:');
const sellerStrategy = annualAppreciation
  .filter(data => Math.abs(data.appreciation) < 10) // Less than 10% annual change
  .sort((a, b) => Math.abs(a.appreciation));

sellerStrategy.forEach(data => {
  const conservatism = overAskingConservatism.find(c => c.postcode === data.postcode);
  console.log(`${data.postcode}: ${data.appreciation > 0 ? '+' : ''}${data.appreciation.toFixed(1)}% annual change, €${data.avg2025.toLocaleString()} current avg${conservatism ? `, ${conservatism.overAskingRate.toFixed(1)}% over-asking success` : ''}, ${data.totalSales} sales`);
});

// Risk-adjusted return analysis
console.log('\nRisk-Adjusted Strategy Analysis:');
const riskAdjustedStrategy = conservativeStrategy.map(area => {
  // Calculate risk-adjusted score: appreciation divided by over-asking volatility
  const overAskingVolatility = area.overAskingRate * 0.01; // Convert percentage to decimal
  const riskAdjustedReturn = area.appreciation > 0 ? area.appreciation / overAskingVolatility : 0;

  return {
    ...area,
    riskAdjustedReturn,
    overAskingVolatility
  };
}).sort((a, b) => b.riskAdjustedReturn - a.riskAdjustedReturn); // Sort by best risk-adjusted return

riskAdjustedStrategy.forEach(data => {
  console.log(`${data.postcode}: Risk-adjusted return ${data.riskAdjustedReturn.toFixed(2)}, ${data.appreciation > 0 ? '+' : ''}${data.appreciation.toFixed(1)}% appreciation, ${data.overAskingVolatility.toFixed(2)} volatility factor`);
});

// Quarterly stability analysis for strategic timing
console.log('\nQuarterly Price Stability Analysis:');
const quarters = ['2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4', '2025-Q1', '2025-Q2'];

const quarterlyStability = {};
quarters.forEach(quarter => {
  quarterlyStability[quarter] = {};
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
      const avgOverAsking = quarterProps.reduce((sum, p) => sum + p.overUnderPercent, 0) / quarterProps.length;
      quarterlyStability[quarter][postcode] = { avgPrice, avgOverAsking, sampleSize: quarterProps.length };
    }
  });
});

// Calculate quarterly volatility
console.log('\nQuarterly Price Volatility Rankings:');
const quarterlyVolatility = Object.keys(postcodeGroups)
  .filter(postcode => {
    const quartersWithData = quarters.filter(q => quarterlyStability[q][postcode]);
    return quartersWithData.length >= 3;
  })
  .map(postcode => {
    const prices = quarters
      .map(q => quarterlyStability[q][postcode]?.avgPrice)
      .filter(Boolean);

    if (prices.length < 3) return null;

    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
    const volatility = Math.sqrt(variance) / avgPrice * 100; // Coefficient of variation

    return {
      postcode,
      volatility,
      avgPrice,
      quartersAnalyzed: prices.length,
      salesCount: postcodeGroups[postcode].length
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.volatility); // Sort by least volatility

quarterlyVolatility.forEach(data => {
  console.log(`${data.postcode}: ${data.volatility.toFixed(1)}% quarterly volatility, €${data.avgPrice.toLocaleString()} avg price, ${data.quartersAnalyzed} quarters analyzed`);
});

// Export chart data
const chartData = {
  annualAppreciationChart: annualAppreciation.slice(0, 15).map(data => ({
    postcode: data.postcode,
    appreciation: data.appreciation,
    avgPrice2024: Math.round(data.avg2024),
    avgPrice2025: Math.round(data.avg2025),
    totalSales: data.totalSales
  })),

  overAskingConservatismChart: overAskingConservatism.slice(0, 15).map(data => ({
    postcode: data.postcode,
    overAskingRate: data.overAskingRate,
    avgPremium: data.avgPremium,
    avgOverAsking: data.avgOverAsking,
    salesCount: data.salesCount
  })),

  conservativeStrategyChart: conservativeStrategy.slice(0, 15).map(data => ({
    postcode: data.postcode,
    conservativeScore: data.conservativeScore,
    appreciation: data.appreciation,
    overAskingRate: data.overAskingRate,
    avgPrice2025: Math.round(data.avgPrice2025),
    salesCount: data.salesCount
  })),

  buyerAdvantageChart: buyerAdvantage.slice(0, 10).map(data => {
    const appreciation = annualAppreciation.find(a => a.postcode === data.postcode);
    return {
      postcode: data.postcode,
      overAskingRate: data.overAskingRate,
      avgPremium: data.avgPremium,
      appreciation: appreciation ? appreciation.appreciation : null,
      salesCount: data.salesCount
    };
  }),

  sellerStrategyChart: sellerStrategy.slice(0, 10).map(data => {
    const conservatism = overAskingConservatism.find(c => c.postcode === data.postcode);
    return {
      postcode: data.postcode,
      appreciation: data.appreciation,
      avgPrice2025: Math.round(data.avg2025),
      overAskingRate: conservatism ? conservatism.overAskingRate : null,
      totalSales: data.totalSales
    };
  }),

  quarterlyVolatilityChart: quarterlyVolatility.slice(0, 15).map(data => ({
    postcode: data.postcode,
    volatility: data.volatility,
    avgPrice: Math.round(data.avgPrice),
    quartersAnalyzed: data.quartersAnalyzed,
    salesCount: data.salesCount
  })),

  riskAdjustedStrategyChart: riskAdjustedStrategy.slice(0, 15).map(data => ({
    postcode: data.postcode,
    riskAdjustedReturn: data.riskAdjustedReturn,
    appreciation: data.appreciation,
    overAskingVolatility: data.overAskingVolatility,
    conservativeScore: data.conservativeScore
  }))
};

fs.writeFileSync('blog48_conservative_market_strategy_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('\nChart data exported to blog48_conservative_market_strategy_chart_data.json');

// Summary insights
console.log('\n=== KEY INSIGHTS ===');
console.log(`Total areas analyzed: ${Object.keys(postcodeGroups).length}`);
console.log(`Areas with annual appreciation < 5%: ${annualAppreciation.filter(a => Math.abs(a.appreciation) < 5).length}`);
console.log(`Areas with over-asking success < 80%: ${buyerAdvantage.length}`);
console.log(`Most conservative area: ${conservativeStrategy[0]?.postcode} (score: ${conservativeStrategy[0]?.conservativeScore.toFixed(1)})`);
console.log(`Least volatile area quarterly: ${quarterlyVolatility[0]?.postcode} (${quarterlyVolatility[0]?.volatility.toFixed(1)}% volatility)`);
console.log(`Average annual appreciation: ${(annualAppreciation.reduce((sum, a) => sum + a.appreciation, 0) / annualAppreciation.length).toFixed(1)}%`);
console.log(`Average over-asking success rate: ${(overAskingConservatism.reduce((sum, c) => sum + c.overAskingRate, 0) / overAskingConservatism.length).toFixed(1)}%`);
