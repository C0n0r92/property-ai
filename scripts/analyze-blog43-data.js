const fs = require('fs');

// Load data
const data = JSON.parse(fs.readFileSync('dashboard/public/data.json', 'utf8'));

// Filter for valid 2024-2025 properties
const validProperties = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31');
});

console.log(`Total valid properties analyzed: ${validProperties.length}`);

// Geographic Price Intelligence: How Map Features Enable Smart Property Decisions
console.log('\nGeographic Price Intelligence Analysis:');

// Analyze price variations by Dublin postcode
const postcodes = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6W', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18', 'D20', 'D22', 'D24'];

const areaStats = postcodes.map(postcode => {
  const areaProps = validProperties.filter(p => p.dublinPostcode === postcode);
  if (areaProps.length < 50) return null;

  const avgPrice = areaProps.reduce((sum, p) => sum + p.soldPrice, 0) / areaProps.length;
  const avgSize = areaProps.reduce((sum, p) => sum + p.areaSqm, 0) / areaProps.length;
  const avgPricePerSqm = areaProps.reduce((sum, p) => sum + p.pricePerSqm, 0) / areaProps.length;

  return {
    postcode,
    count: areaProps.length,
    avgPrice,
    avgSize,
    avgPricePerSqm
  };
}).filter(Boolean);

console.log('Price Variations by Dublin Postcode:');
areaStats.forEach(stat => {
  console.log(`${stat.postcode}: ${stat.count} props, €${stat.avgPrice.toLocaleString()}, ${stat.avgSize.toFixed(0)}sqm, €${stat.avgPricePerSqm.toFixed(0)}/sqm`);
});

// Price efficiency analysis (value for money)
console.log('\nPrice Efficiency Analysis (Best Value Areas):');
const sortedByPricePerSqm = areaStats.sort((a, b) => a.avgPricePerSqm - b.avgPricePerSqm);
console.log('Most Price-Efficient Areas (lowest €/sqm):');
sortedByPricePerSqm.slice(0, 5).forEach(stat => {
  console.log(`  ${stat.postcode}: €${stat.avgPricePerSqm.toFixed(0)}/sqm, €${stat.avgPrice.toLocaleString()} avg`);
});

console.log('Premium Areas (highest €/sqm):');
sortedByPricePerSqm.slice(-5).forEach(stat => {
  console.log(`  ${stat.postcode}: €${stat.avgPricePerSqm.toFixed(0)}/sqm, €${stat.avgPrice.toLocaleString()} avg`);
});

// Geographic over-asking success patterns
console.log('\nGeographic Over-Asking Patterns:');
areaStats.forEach(stat => {
  const areaProps = validProperties.filter(p => p.dublinPostcode === stat.postcode);
  const overAsking = areaProps.filter(p => p.overUnderPercent > 0);
  const successRate = (overAsking.length / areaProps.length * 100);
  const avgPremium = overAsking.length > 0 ?
    overAsking.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAsking.length : 0;

  stat.overAskingSuccessRate = successRate;
  stat.avgPremium = avgPremium;
});

const sortedBySuccessRate = areaStats.sort((a, b) => b.overAskingSuccessRate - a.overAskingSuccessRate);
console.log('Areas with Highest Over-Asking Success:');
sortedBySuccessRate.slice(0, 5).forEach(stat => {
  console.log(`  ${stat.postcode}: ${stat.overAskingSuccessRate.toFixed(1)}% success, ${stat.avgPremium.toFixed(1)}% avg premium`);
});

// Size variations by area (helps with map-based filtering)
console.log('\nProperty Size Variations by Area:');
areaStats.forEach(stat => {
  console.log(`${stat.postcode}: ${stat.avgSize.toFixed(0)}sqm average`);
});

// Price predictability by area (lower variance = more predictable market)
console.log('\nPrice Predictability Analysis:');
areaStats.forEach(stat => {
  const areaProps = validProperties.filter(p => p.dublinPostcode === stat.postcode);
  const prices = areaProps.map(p => p.soldPrice);
  const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / mean;

  stat.pricePredictability = coefficientOfVariation;
});

const sortedByPredictability = areaStats.sort((a, b) => a.pricePredictability - b.pricePredictability);
console.log('Most Predictable Markets (lowest price variation):');
sortedByPredictability.slice(0, 5).forEach(stat => {
  console.log(`  ${stat.postcode}: ${(stat.pricePredictability * 100).toFixed(1)}% variation`);
});

// Geographic yield analysis (rental investment opportunities)
console.log('\nGeographic Rental Yield Analysis:');
areaStats.forEach(stat => {
  const areaProps = validProperties.filter(p => p.dublinPostcode === stat.postcode);
  const yieldProps = areaProps.filter(p => p.yieldEstimate && p.yieldEstimate.grossYield > 0);

  if (yieldProps.length < 10) {
    stat.avgYield = 0;
    return;
  }

  const avgYield = yieldProps.reduce((sum, p) => sum + p.yieldEstimate.grossYield, 0) / yieldProps.length;
  stat.avgYield = avgYield;
});

const sortedByYield = areaStats.filter(stat => stat.avgYield > 0).sort((a, b) => b.avgYield - a.avgYield);
console.log('Highest Rental Yield Areas:');
sortedByYield.slice(0, 5).forEach(stat => {
  console.log(`  ${stat.postcode}: ${stat.avgYield.toFixed(2)}% avg yield`);
});

// Decision-making framework using geographic data
console.log('\nSmart Decision-Making Framework:');

// Calculate area scores for different buyer types
areaStats.forEach(stat => {
  // First-time buyer score (affordability + predictability)
  const affordabilityScore = Math.max(0, 100 - (stat.avgPrice / 1000000) * 10); // Higher for cheaper areas
  const predictabilityScore = Math.max(0, 100 - (stat.pricePredictability * 1000));
  stat.firstTimeBuyerScore = (affordabilityScore + predictabilityScore) / 2;

  // Investor score (yield + over-asking success)
  const yieldScore = stat.avgYield * 100; // Convert percentage to score
  const overAskingScore = stat.overAskingSuccessRate;
  stat.investorScore = (yieldScore + overAskingScore) / 2;

  // Luxury buyer score (premium pricing + size)
  const premiumScore = Math.min(100, (stat.avgPricePerSqm / 10000) * 100);
  const sizeScore = Math.min(100, stat.avgSize / 2);
  stat.luxuryBuyerScore = (premiumScore + sizeScore) / 2;
});

console.log('Area Scores by Buyer Type:');
console.log('Best for First-Time Buyers:');
areaStats.sort((a, b) => b.firstTimeBuyerScore - a.firstTimeBuyerScore).slice(0, 3).forEach(stat => {
  console.log(`  ${stat.postcode}: ${stat.firstTimeBuyerScore.toFixed(0)}/100 score`);
});

console.log('Best for Investors:');
areaStats.filter(stat => stat.avgYield > 0).sort((a, b) => b.investorScore - a.investorScore).slice(0, 3).forEach(stat => {
  console.log(`  ${stat.postcode}: ${stat.investorScore.toFixed(0)}/100 score`);
});

console.log('Best for Luxury Buyers:');
areaStats.sort((a, b) => b.luxuryBuyerScore - a.luxuryBuyerScore).slice(0, 3).forEach(stat => {
  console.log(`  ${stat.postcode}: ${stat.luxuryBuyerScore.toFixed(0)}/100 score`);
});

// Export chart data
const chartData = {
  geographicPriceVariationsChart: areaStats.map(stat => ({
    postcode: stat.postcode,
    averagePrice: Math.round(stat.avgPrice),
    pricePerSqm: Math.round(stat.avgPricePerSqm),
    sampleSize: stat.count
  })),

  priceEfficiencyChart: sortedByPricePerSqm.map(stat => ({
    postcode: stat.postcode,
    pricePerSqm: Math.round(stat.avgPricePerSqm),
    rank: sortedByPricePerSqm.indexOf(stat) + 1
  })),

  overAskingSuccessChart: sortedBySuccessRate.map(stat => ({
    postcode: stat.postcode,
    successRate: stat.overAskingSuccessRate,
    averagePremium: stat.avgPremium
  })),

  propertySizeVariationsChart: areaStats.map(stat => ({
    postcode: stat.postcode,
    averageSize: Math.round(stat.avgSize),
    pricePerSqm: Math.round(stat.avgPricePerSqm)
  })),

  pricePredictabilityChart: sortedByPredictability.map(stat => ({
    postcode: stat.postcode,
    coefficientOfVariation: stat.pricePredictability * 100,
    predictabilityRank: sortedByPredictability.indexOf(stat) + 1
  })),

  rentalYieldMapChart: sortedByYield.map(stat => ({
    postcode: stat.postcode,
    averageYield: stat.avgYield,
    averagePrice: Math.round(stat.avgPrice)
  })),

  buyerTypeScoresChart: areaStats.map(stat => ({
    postcode: stat.postcode,
    firstTimeBuyerScore: Math.round(stat.firstTimeBuyerScore),
    investorScore: Math.round(stat.investorScore),
    luxuryBuyerScore: Math.round(stat.luxuryBuyerScore)
  })),

  decisionFrameworkChart: [
    {
      buyerType: 'First-Time Buyers',
      topAreas: areaStats.sort((a, b) => b.firstTimeBuyerScore - a.firstTimeBuyerScore).slice(0, 3).map(stat => stat.postcode),
      keyFactors: ['Affordability', 'Price Predictability', 'Market Stability']
    },
    {
      buyerType: 'Investors',
      topAreas: areaStats.filter(stat => stat.avgYield > 0).sort((a, b) => b.investorScore - a.investorScore).slice(0, 3).map(stat => stat.postcode),
      keyFactors: ['Rental Yield', 'Over-Asking Success', 'Capital Appreciation']
    },
    {
      buyerType: 'Luxury Buyers',
      topAreas: areaStats.sort((a, b) => b.luxuryBuyerScore - a.luxuryBuyerScore).slice(0, 3).map(stat => stat.postcode),
      keyFactors: ['Premium Pricing', 'Property Size', 'Area Prestige']
    }
  ]
};

fs.writeFileSync('blog43_geographic_price_intelligence_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('\nChart data exported to blog43_geographic_price_intelligence_chart_data.json');
