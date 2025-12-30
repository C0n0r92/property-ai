const fs = require('fs');
const path = require('path');

// Read the data
const dataPath = path.join(__dirname, '../dashboard/public/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Focus on D6W area
const FOCUS_AREA = 'D6W';
const validProps = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') && soldDate <= new Date('2025-12-31') && p.dublinPostcode === FOCUS_AREA;
});

console.log(`=== D6W AREA DEEP DIVE ANALYSIS ===\n`);
console.log(`Total D6W properties analyzed: ${validProps.length.toLocaleString()}`);

// Split by year
const props2024 = validProps.filter(p => p.soldDate.startsWith('2024'));
const props2025 = validProps.filter(p => p.soldDate.startsWith('2025'));

console.log(`2024 D6W properties: ${props2024.length}`);
console.log(`2025 D6W properties: ${props2025.length}\n`);

// Price analysis
const avgPrice2024 = props2024.length > 0 ? props2024.reduce((sum, p) => sum + p.soldPrice, 0) / props2024.length : 0;
const avgPrice2025 = props2025.length > 0 ? props2025.reduce((sum, p) => sum + p.soldPrice, 0) / props2025.length : 0;
const growthRate = avgPrice2024 > 0 ? ((avgPrice2025 - avgPrice2024) / avgPrice2024) * 100 : 0;

console.log('🏠 D6W PRICE ANALYSIS');
console.log('===================');
console.log(`2024 Average Price: €${Math.round(avgPrice2024).toLocaleString()}`);
console.log(`2025 Average Price: €${Math.round(avgPrice2025).toLocaleString()}`);
console.log(`Annual Growth: ${growthRate.toFixed(1)}%`);
console.log(`Value Increase: €${Math.round(avgPrice2025 - avgPrice2024).toLocaleString()}\n`);

// Property type breakdown
const typeBreakdown = {};
validProps.forEach(p => {
  if (!typeBreakdown[p.propertyType]) {
    typeBreakdown[p.propertyType] = { count: 0, totalValue: 0, avgPrice: 0 };
  }
  typeBreakdown[p.propertyType].count++;
  typeBreakdown[p.propertyType].totalValue += p.soldPrice;
});

Object.keys(typeBreakdown).forEach(type => {
  typeBreakdown[type].avgPrice = typeBreakdown[type].totalValue / typeBreakdown[type].count;
});

console.log('🏘️ D6W PROPERTY TYPES');
console.log('====================');
Object.entries(typeBreakdown)
  .sort((a, b) => b[1].count - a[1].count)
  .forEach(([type, data]) => {
    const percentage = ((data.count / validProps.length) * 100).toFixed(1);
    console.log(`${type}: ${data.count} properties (${percentage}%) - Avg €${Math.round(data.avgPrice).toLocaleString()}`);
  });

console.log();

// Monthly price trends
const monthlyTrends = {};
validProps.forEach(p => {
  const date = new Date(p.soldDate);
  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  if (!monthlyTrends[monthKey]) {
    monthlyTrends[monthKey] = { count: 0, totalValue: 0, avgPrice: 0 };
  }
  monthlyTrends[monthKey].count++;
  monthlyTrends[monthKey].totalValue += p.soldPrice;
});

Object.keys(monthlyTrends).forEach(month => {
  monthlyTrends[month].avgPrice = monthlyTrends[month].totalValue / monthlyTrends[month].count;
});

console.log('📈 D6W MONTHLY PRICE TRENDS');
console.log('===========================');
Object.entries(monthlyTrends)
  .sort(([a], [b]) => a.localeCompare(b))
  .forEach(([month, data]) => {
    console.log(`${month}: ${data.count} sales - Avg €${Math.round(data.avgPrice).toLocaleString()}`);
  });

console.log();

// Price distribution
const priceRanges = {
  'Under €400k': 0,
  '€400k-€600k': 0,
  '€600k-€800k': 0,
  '€800k-€1M': 0,
  'Over €1M': 0
};

validProps.forEach(p => {
  if (p.soldPrice < 400000) priceRanges['Under €400k']++;
  else if (p.soldPrice < 600000) priceRanges['€400k-€600k']++;
  else if (p.soldPrice < 800000) priceRanges['€600k-€800k']++;
  else if (p.soldPrice < 1000000) priceRanges['€800k-€1M']++;
  else priceRanges['Over €1M']++;
});

console.log('💰 D6W PRICE DISTRIBUTION');
console.log('=========================');
Object.entries(priceRanges).forEach(([range, count]) => {
  const percentage = ((count / validProps.length) * 100).toFixed(1);
  console.log(`${range}: ${count} properties (${percentage}%)`);
});

console.log();

// Bidding war analysis for D6W
const biddingProps = validProps.filter(p => p.overUnderPercent !== null && p.overUnderPercent !== undefined);
const overAsking = biddingProps.filter(p => p.overUnderPercent > 0);
const avgPremium = overAsking.length > 0 ? (overAsking.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAsking.length) : 0;

console.log('🎯 D6W BIDDING WAR ANALYSIS');
console.log('===========================');
console.log(`Properties with bidding data: ${biddingProps.length}`);
console.log(`Over-asking rate: ${((overAsking.length / biddingProps.length) * 100).toFixed(1)}%`);
console.log(`Average premium: ${avgPremium.toFixed(1)}%`);

// Create chart data
const chartData = {
  PriceTrendChart: Object.entries(monthlyTrends)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month: month,
      avgPrice: Math.round(data.avgPrice),
      sales: data.count
    })),

  PropertyTypeChart: Object.entries(typeBreakdown)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([type, data]) => ({
      type: type,
      count: data.count,
      avgPrice: Math.round(data.avgPrice),
      percentage: ((data.count / validProps.length) * 100).toFixed(1)
    })),

  PriceDistributionChart: Object.entries(priceRanges).map(([range, count]) => ({
    range: range,
    count: count,
    percentage: ((count / validProps.length) * 100).toFixed(1)
  })),

  YearOverYearChart: [
    { year: '2024', avgPrice: Math.round(avgPrice2024), sales: props2024.length },
    { year: '2025', avgPrice: Math.round(avgPrice2025), sales: props2025.length }
  ]
};

// Write chart data to file
const chartDataPath = path.join(__dirname, '../blogs/blog19_d6w_area_deep_dive_chart_data.json');
fs.writeFileSync(chartDataPath, JSON.stringify(chartData, null, 2));

console.log(`\n📊 Chart data exported to: ${chartDataPath}`);
console.log('\n✅ D6W Area Analysis Complete!');

// Key statistics summary
console.log('\n📋 D6W KEY STATISTICS');
console.log('=====================');
console.log(`• Total Properties: ${validProps.length}`);
console.log(`• Average Price: €${Math.round(avgPrice2025).toLocaleString()}`);
console.log(`• Year-over-Year Growth: ${growthRate.toFixed(1)}%`);
console.log(`• Value Increase: €${Math.round(avgPrice2025 - avgPrice2024).toLocaleString()}`);
console.log(`• Over-Asking Rate: ${((overAsking.length / biddingProps.length) * 100).toFixed(1)}%`);
console.log(`• Average Premium: ${avgPremium.toFixed(1)}%`);
console.log(`• Dominant Property Type: Semi-Detached (${typeBreakdown['Semi-Detached'] ? ((typeBreakdown['Semi-Detached'].count / validProps.length) * 100).toFixed(1) : 0}%)`);
