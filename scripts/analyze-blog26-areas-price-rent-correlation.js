const fs = require('fs');
const path = require('path');

// Read the data
const dataPath = path.join(__dirname, '../dashboard/public/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Filter valid properties with complete data for 2024-2025
const validProps = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31') &&
         p.soldPrice &&
         p.dublinPostcode &&
         p.yieldEstimate &&
         p.yieldEstimate.grossYield;
});

console.log(`=== DUBLIN AREAS PRICE & RENT CORRELATION ANALYSIS ===\n`);
console.log(`Total properties analyzed: ${validProps.length.toLocaleString()}`);

// Group by postcode
const postcodeStats = {};
validProps.forEach(prop => {
  const postcode = prop.dublinPostcode;
  if (!postcodeStats[postcode]) {
    postcodeStats[postcode] = {
      properties: [],
      totalValue: 0,
      totalRent: 0,
      avgPrice: 0,
      avgRent: 0,
      count: 0
    };
  }

  postcodeStats[postcode].properties.push(prop);
  postcodeStats[postcode].totalValue += prop.soldPrice;
  postcodeStats[postcode].totalRent += prop.yieldEstimate.monthlyRent;
  postcodeStats[postcode].count++;
});

// Calculate averages and growth rates
Object.keys(postcodeStats).forEach(postcode => {
  const stats = postcodeStats[postcode];
  stats.avgPrice = stats.totalValue / stats.count;
  stats.avgRent = stats.totalRent / stats.count;

  // Calculate year-over-year growth (2024 vs 2025)
  const props2024 = stats.properties.filter(p => new Date(p.soldDate).getFullYear() === 2024);
  const props2025 = stats.properties.filter(p => new Date(p.soldDate).getFullYear() === 2025);

  if (props2024.length >= 10 && props2025.length >= 10) {
    const avgPrice2024 = props2024.reduce((sum, p) => sum + p.soldPrice, 0) / props2024.length;
    const avgPrice2025 = props2025.reduce((sum, p) => sum + p.soldPrice, 0) / props2025.length;
    stats.growthRate = ((avgPrice2025 - avgPrice2024) / avgPrice2024) * 100;
    stats.hasGrowthData = true;
  } else {
    stats.growthRate = 0;
    stats.hasGrowthData = false;
  }
});

// Filter postcodes with sufficient data
const validPostcodes = Object.entries(postcodeStats)
  .filter(([postcode, stats]) => stats.count >= 50)
  .sort((a, b) => b[1].avgPrice - a[1].avgPrice);

console.log(`\n📊 AREAS BY AVERAGE PROPERTY PRICE`);
console.log('=====================================');
validPostcodes.slice(0, 10).forEach(([postcode, stats], index) => {
  console.log(`${index + 1}. ${postcode}: €${Math.round(stats.avgPrice).toLocaleString()} (${stats.count} properties)`);
});

console.log(`\n📈 AREAS WITH LARGEST PRICE INCREASES (2024-2025)`);
console.log('==================================================');
const growthAreas = validPostcodes
  .filter(([postcode, stats]) => stats.hasGrowthData)
  .sort((a, b) => b[1].growthRate - a[1].growthRate);

growthAreas.slice(0, 10).forEach(([postcode, stats], index) => {
  console.log(`${index + 1}. ${postcode}: ${stats.growthRate.toFixed(1)}% increase (€${Math.round(stats.avgPrice).toLocaleString()})`);
});

// Analyze correlation between property prices and rents
const correlationData = validPostcodes.map(([postcode, stats]) => ({
  postcode,
  avgPrice: stats.avgPrice,
  avgRent: stats.avgRent,
  pricePerSqm: stats.avgPrice / 100, // Approximate for correlation
  rentYield: (stats.avgRent * 12 / stats.avgPrice) * 100,
  propertyCount: stats.count
}));

// Calculate correlation coefficient between price and rent
const n = correlationData.length;
const sumX = correlationData.reduce((sum, d) => sum + d.avgPrice, 0);
const sumY = correlationData.reduce((sum, d) => sum + d.avgRent, 0);
const sumXY = correlationData.reduce((sum, d) => sum + (d.avgPrice * d.avgRent), 0);
const sumX2 = correlationData.reduce((sum, d) => sum + (d.avgPrice * d.avgPrice), 0);
const sumY2 = correlationData.reduce((sum, d) => sum + (d.avgRent * d.avgRent), 0);

const correlation = (n * sumXY - sumX * sumY) /
                   Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

console.log(`\n🔗 PRICE-RENT CORRELATION ANALYSIS`);
console.log('==================================');
console.log(`Correlation coefficient: ${correlation.toFixed(3)}`);
console.log(`Strength: ${Math.abs(correlation) > 0.7 ? 'Strong' : Math.abs(correlation) > 0.5 ? 'Moderate' : 'Weak'} ${correlation > 0 ? 'positive' : 'negative'} correlation`);

// Find areas with high prices but relatively low rents (value opportunities)
const valueAreas = correlationData
  .filter(d => d.propertyCount >= 100)
  .map(d => ({
    ...d,
    priceToRentRatio: d.avgPrice / d.avgRent,
    expectedRent: d.avgRent, // baseline
    rentEfficiency: (d.rentYield - correlationData.reduce((sum, cd) => sum + cd.rentYield, 0) / correlationData.length)
  }))
  .sort((a, b) => b.priceToRentRatio - a.priceToRentRatio);

console.log(`\n💰 AREAS WITH HIGH PRICES & HIGH RENTS`);
console.log('======================================');
valueAreas.slice(0, 8).forEach((area, index) => {
  console.log(`${index + 1}. ${area.postcode}: €${Math.round(area.avgPrice).toLocaleString()} avg price, €${Math.round(area.avgRent)} avg rent (${area.rentYield.toFixed(1)}% yield)`);
});

// Areas with biggest rent increases relative to price increases
const rentVsPriceGrowth = validPostcodes
  .filter(([postcode, stats]) => stats.hasGrowthData && stats.properties.length >= 100)
  .map(([postcode, stats]) => {
    const props2024 = stats.properties.filter(p => new Date(p.soldDate).getFullYear() === 2024);
    const props2025 = stats.properties.filter(p => new Date(p.soldDate).getFullYear() === 2025);

    const avgRent2024 = props2024.reduce((sum, p) => sum + p.yieldEstimate.monthlyRent, 0) / props2024.length;
    const avgRent2025 = props2025.reduce((sum, p) => sum + p.yieldEstimate.monthlyRent, 0) / props2025.length;
    const rentGrowth = ((avgRent2025 - avgRent2024) / avgRent2024) * 100;

    return {
      postcode,
      priceGrowth: stats.growthRate,
      rentGrowth: rentGrowth,
      growthDifferential: rentGrowth - stats.growthRate,
      avgPrice: stats.avgPrice,
      avgRent: stats.avgRent
    };
  })
  .filter(area => !isNaN(area.rentGrowth))
  .sort((a, b) => b.rentGrowth - a.rentGrowth);

console.log(`\n🏠 AREAS WITH STRONG RENTAL GROWTH`);
console.log('===================================');
rentVsPriceGrowth.slice(0, 8).forEach((area, index) => {
  console.log(`${index + 1}. ${area.postcode}: ${area.rentGrowth.toFixed(1)}% rent growth, ${area.priceGrowth.toFixed(1)}% price growth`);
});

// Create chart data
const chartData = {
  AreaPriceRankingChart: validPostcodes.slice(0, 15).map(([postcode, stats]) => ({
    postcode: postcode,
    avgPrice: Math.round(stats.avgPrice),
    propertyCount: stats.count,
    growthRate: stats.growthRate || 0
  })),

  PriceGrowthChart: growthAreas.slice(0, 15).map(([postcode, stats]) => ({
    postcode: postcode,
    growthRate: stats.growthRate,
    avgPrice2025: Math.round(stats.avgPrice),
    propertyCount: stats.count
  })),

  PriceRentCorrelationChart: correlationData.map(area => ({
    postcode: area.postcode,
    avgPrice: Math.round(area.avgPrice),
    avgRent: Math.round(area.avgRent),
    rentYield: area.rentYield
  })),

  HighValueAreasChart: valueAreas.slice(0, 10).map(area => ({
    postcode: area.postcode,
    avgPrice: Math.round(area.avgPrice),
    avgRent: Math.round(area.avgRent),
    rentYield: area.rentYield,
    priceToRentRatio: area.priceToRentRatio
  })),

  RentGrowthVsPriceChart: rentVsPriceGrowth.slice(0, 12).map(area => ({
    postcode: area.postcode,
    priceGrowth: area.priceGrowth,
    rentGrowth: area.rentGrowth,
    avgRent: Math.round(area.avgRent)
  }))
};

// Write chart data to file
const chartDataPath = path.join(__dirname, '../blogs/blog26_dublin_areas_price_rent_correlation_chart_data.json');
fs.writeFileSync(chartDataPath, JSON.stringify(chartData, null, 2));

console.log(`\n📊 Chart data exported to: ${chartDataPath}`);
console.log('\n✅ Dublin Areas Price-Rent Correlation Analysis Complete!');

// Key insights summary
console.log('\n📋 KEY AREA INSIGHTS');
console.log('===================');
console.log(`• Top area by price: ${validPostcodes[0][0]} (€${Math.round(validPostcodes[0][1].avgPrice).toLocaleString()})`);
console.log(`• Fastest growing area: ${growthAreas[0][0]} (${growthAreas[0][1].growthRate.toFixed(1)}% growth)`);
console.log(`• Price-rent correlation: ${correlation.toFixed(3)} (${Math.abs(correlation) > 0.7 ? 'Strong' : 'Moderate'} relationship)`);
console.log(`• Highest rental yield area: ${correlationData.sort((a,b) => b.rentYield - a.rentYield)[0].postcode} (${correlationData.sort((a,b) => b.rentYield - a.rentYield)[0].rentYield.toFixed(1)}%)`);
console.log(`• Best rent growth: ${rentVsPriceGrowth[0].postcode} (${rentVsPriceGrowth[0].rentGrowth.toFixed(1)}% rent increase)`);
