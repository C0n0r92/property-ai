const fs = require('fs');
const path = require('path');

// Read the data
const dataPath = path.join(__dirname, '../dashboard/public/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Filter valid properties for comprehensive analysis
const validProps = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31') &&
         p.soldPrice &&
         p.propertyType &&
         p.overUnderPercent !== null &&
         p.overUnderPercent !== undefined;
});

console.log(`=== DUBLIN PROPERTY TYPE PERFORMANCE ANALYSIS ===\n`);
console.log(`Total properties analyzed: ${validProps.length.toLocaleString()}`);

// Group by property type
const typeStats = {};
validProps.forEach(prop => {
  const type = prop.propertyType;
  if (!typeStats[type]) {
    typeStats[type] = {
      properties: [],
      totalValue: 0,
      totalAsking: 0,
      count: 0
    };
  }

  typeStats[type].properties.push(prop);
  typeStats[type].totalValue += prop.soldPrice;
  typeStats[type].totalAsking += prop.askingPrice;
  typeStats[type].count++;
});

// Calculate performance metrics
Object.keys(typeStats).forEach(type => {
  const stats = typeStats[type];
  stats.avgPrice = stats.totalValue / stats.count;
  stats.avgAsking = stats.totalAsking / stats.count;
  stats.avgPremium = ((stats.avgPrice - stats.avgAsking) / stats.avgAsking) * 100;

  // Calculate over-asking rate (properties sold above asking)
  stats.overAskingCount = stats.properties.filter(p => p.overUnderPercent > 0).length;
  stats.overAskingRate = (stats.overAskingCount / stats.count) * 100;

  // Market share
  stats.marketShare = (stats.count / validProps.length) * 100;
});

const validTypes = Object.entries(typeStats)
  .filter(([type, stats]) => stats.count >= 50)
  .sort((a, b) => b[1].avgPrice - a[1].avgPrice);

console.log('\n🏠 PROPERTY TYPES BY AVERAGE PRICE');
console.log('===================================');
validTypes.forEach(([type, stats], index) => {
  console.log(`${index + 1}. ${type}: €${Math.round(stats.avgPrice).toLocaleString()} (${stats.count} properties, ${stats.marketShare.toFixed(1)}% market share)`);
});

console.log('\n📈 OVER-ASKING PERFORMANCE BY TYPE');
console.log('===================================');
const overAskingRank = Object.entries(typeStats)
  .filter(([type, stats]) => stats.count >= 50)
  .sort((a, b) => b[1].overAskingRate - a[1].overAskingRate);

overAskingRank.forEach(([type, stats], index) => {
  console.log(`${index + 1}. ${type}: ${stats.overAskingRate.toFixed(1)}% over-asking rate (${stats.overAskingCount}/${stats.count} properties)`);
});

console.log('\n💰 PREMIUM PERFORMANCE BY TYPE');
console.log('==============================');
const premiumRank = Object.entries(typeStats)
  .filter(([type, stats]) => stats.count >= 50)
  .sort((a, b) => b[1].avgPremium - a[1].avgPremium);

premiumRank.forEach(([type, stats], index) => {
  console.log(`${index + 1}. ${type}: ${stats.avgPremium.toFixed(1)}% average premium`);
});

// Year-over-year performance comparison
const yoyStats = {};
validProps.forEach(prop => {
  const type = prop.propertyType;
  const year = new Date(prop.soldDate).getFullYear();

  if (!yoyStats[type]) {
    yoyStats[type] = { 2024: { total: 0, count: 0 }, 2025: { total: 0, count: 0 } };
  }

  yoyStats[type][year].total += prop.soldPrice;
  yoyStats[type][year].count++;
});

Object.keys(yoyStats).forEach(type => {
  const stats = yoyStats[type];
  if (stats[2024].count >= 10 && stats[2025].count >= 10) {
    stats.avg2024 = stats[2024].total / stats[2024].count;
    stats.avg2025 = stats[2025].total / stats[2025].count;
    stats.growthRate = ((stats.avg2025 - stats.avg2024) / stats.avg2024) * 100;
  }
});

console.log('\n📊 YEAR-OVER-YEAR GROWTH BY TYPE');
console.log('=================================');
const growthRank = Object.entries(yoyStats)
  .filter(([type, stats]) => stats.growthRate !== undefined)
  .sort((a, b) => b[1].growthRate - a[1].growthRate);

growthRank.forEach(([type, stats], index) => {
  console.log(`${index + 1}. ${type}: ${stats.growthRate.toFixed(1)}% growth (€${Math.round(stats.avg2024).toLocaleString()} → €${Math.round(stats.avg2025).toLocaleString()})`);
});

// Value efficiency analysis (price per bedroom)
const bedroomStats = {};
validProps.forEach(prop => {
  const type = prop.propertyType;
  if (prop.beds && prop.beds > 0) {
    if (!bedroomStats[type]) {
      bedroomStats[type] = { totalPrice: 0, totalBeds: 0, count: 0 };
    }

    bedroomStats[type].totalPrice += prop.soldPrice;
    bedroomStats[type].totalBeds += prop.beds;
    bedroomStats[type].count++;
  }
});

Object.keys(bedroomStats).forEach(type => {
  const stats = bedroomStats[type];
  stats.avgPricePerBed = stats.totalPrice / stats.totalBeds;
  stats.avgBeds = stats.totalBeds / stats.count;
});

console.log('\n🛏️ VALUE EFFICIENCY BY TYPE (€ per Bedroom)');
console.log('===========================================');
const efficiencyRank = Object.entries(bedroomStats)
  .filter(([type, stats]) => stats.count >= 50)
  .sort((a, b) => a[1].avgPricePerBed - b[1].avgPricePerBed);

efficiencyRank.forEach(([type, stats], index) => {
  console.log(`${index + 1}. ${type}: €${Math.round(stats.avgPricePerBed).toLocaleString()}/bed (${stats.avgBeds.toFixed(1)} avg beds)`);
});

// Create chart data
const chartData = {
  PropertyTypePriceRankingChart: validTypes.slice(0, 8).map(([type, stats]) => ({
    type: type,
    avgPrice: Math.round(stats.avgPrice),
    marketShare: stats.marketShare,
    count: stats.count
  })),

  OverAskingPerformanceChart: overAskingRank.slice(0, 8).map(([type, stats]) => ({
    type: type,
    overAskingRate: stats.overAskingRate,
    overAskingCount: stats.overAskingCount,
    totalCount: stats.count
  })),

  PremiumPerformanceChart: premiumRank.slice(0, 8).map(([type, stats]) => ({
    type: type,
    avgPremium: stats.avgPremium,
    avgPrice: Math.round(stats.avgPrice),
    avgAsking: Math.round(stats.avgAsking)
  })),

  GrowthPerformanceChart: growthRank.slice(0, 8).map(([type, stats]) => ({
    type: type,
    growthRate: stats.growthRate,
    avg2024: Math.round(stats.avg2024),
    avg2025: Math.round(stats.avg2025)
  })),

  ValueEfficiencyChart: efficiencyRank.slice(0, 8).map(([type, stats]) => ({
    type: type,
    pricePerBed: Math.round(stats.avgPricePerBed),
    avgBeds: stats.avgBeds,
    totalBedrooms: stats.totalBeds
  }))
};

// Write chart data to file
const chartDataPath = path.join(__dirname, '../blogs/blog29_property_type_performance_chart_data.json');
fs.writeFileSync(chartDataPath, JSON.stringify(chartData, null, 2));

console.log(`\n📊 Chart data exported to: ${chartDataPath}`);
console.log('\n✅ Property Type Performance Analysis Complete!');

// Key insights summary
console.log('\n📋 KEY PROPERTY TYPE INSIGHTS');
console.log('==============================');
console.log(`• Highest value type: ${validTypes[0][0]} (€${Math.round(validTypes[0][1].avgPrice).toLocaleString()})`);
console.log(`• Best over-asking performance: ${overAskingRank[0][0]} (${overAskingRank[0][1].overAskingRate.toFixed(1)}% rate)`);
console.log(`• Strongest growth: ${growthRank[0][0]} (${growthRank[0][1].growthRate.toFixed(1)}% YoY)`);
console.log(`• Best value efficiency: ${efficiencyRank[0][0]} (€${Math.round(efficiencyRank[0][1].avgPricePerBed).toLocaleString()}/bed)`);
console.log(`• Market leader by share: ${validTypes.sort((a,b) => b[1].marketShare - a[1].marketShare)[0][0]} (${validTypes.sort((a,b) => b[1].marketShare - a[1].marketShare)[0][1].marketShare.toFixed(1)}%)`);
