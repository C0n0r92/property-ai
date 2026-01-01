const fs = require('fs');
const path = require('path');

// Read the data
const dataPath = path.join(__dirname, '../dashboard/public/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Filter valid properties for seasonal analysis
const validProps = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31') &&
         p.soldPrice;
});

console.log(`=== DUBLIN SEASONAL PROPERTY TIMING ANALYSIS ===\n`);
console.log(`Total properties analyzed: ${validProps.length.toLocaleString()}`);

// Group by month
const monthlyStats = {};
validProps.forEach(prop => {
  const date = new Date(prop.soldDate);
  const month = date.getMonth() + 1; // 1-12
  const monthKey = `${date.getFullYear()}-${month.toString().padStart(2, '0')}`;

  if (!monthlyStats[monthKey]) {
    monthlyStats[monthKey] = {
      properties: [],
      totalValue: 0,
      count: 0,
      month: month,
      year: date.getFullYear()
    };
  }

  monthlyStats[monthKey].properties.push(prop);
  monthlyStats[monthKey].totalValue += prop.soldPrice;
  monthlyStats[monthKey].count++;
});

// Calculate monthly averages and seasonal patterns
Object.keys(monthlyStats).forEach(monthKey => {
  const stats = monthlyStats[monthKey];
  stats.avgPrice = stats.totalValue / stats.count;

  // Calculate over-asking rate for the month
  stats.overAskingCount = stats.properties.filter(p => p.overUnderPercent > 0).length;
  stats.overAskingRate = (stats.overAskingCount / stats.count) * 100;
});

// Group by month of year (seasonal pattern)
const seasonalStats = {};
Object.values(monthlyStats).forEach(stats => {
  const month = stats.month;
  if (!seasonalStats[month]) {
    seasonalStats[month] = {
      months: [],
      totalValue: 0,
      totalCount: 0,
      avgPrices: [],
      overAskingRates: []
    };
  }

  seasonalStats[month].months.push(stats);
  seasonalStats[month].totalValue += stats.totalValue;
  seasonalStats[month].totalCount += stats.count;
  seasonalStats[month].avgPrices.push(stats.avgPrice);
  seasonalStats[month].overAskingRates.push(stats.overAskingRate);
});

// Calculate seasonal averages
Object.keys(seasonalStats).forEach(month => {
  const stats = seasonalStats[month];
  stats.avgPrice = stats.totalValue / stats.totalCount;
  stats.avgOverAskingRate = stats.overAskingRates.reduce((a, b) => a + b, 0) / stats.overAskingRates.length;
  stats.volume = stats.totalCount;
});

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

console.log('\n📅 MONTHLY AVERAGE PRICES (2024-2025)');
console.log('=====================================');
Object.keys(monthlyStats)
  .sort()
  .forEach(monthKey => {
    const stats = monthlyStats[monthKey];
    console.log(`${monthKey}: €${Math.round(stats.avgPrice).toLocaleString()} (${stats.count} sales, ${stats.overAskingRate.toFixed(1)}% over-asking)`);
  });

console.log('\n🌸 SEASONAL PRICE PATTERNS');
console.log('===========================');
const seasonalData = Object.entries(seasonalStats)
  .sort(([a], [b]) => parseInt(a) - parseInt(b))
  .map(([month, stats]) => ({
    month: parseInt(month),
    monthName: monthNames[parseInt(month) - 1],
    avgPrice: Math.round(stats.avgPrice),
    volume: stats.totalCount,
    overAskingRate: stats.avgOverAskingRate
  }));

seasonalData.forEach(season => {
  console.log(`${season.monthName}: €${season.avgPrice.toLocaleString()} (${season.volume} sales, ${season.overAskingRate.toFixed(1)}% over-asking)`);
});

// Find peak and trough months
const peakMonth = seasonalData.reduce((max, curr) => curr.avgPrice > max.avgPrice ? curr : max);
const troughMonth = seasonalData.reduce((min, curr) => curr.avgPrice < min.avgPrice ? curr : min);

console.log('\n📈 SEASONAL INSIGHTS');
console.log('====================');
console.log(`Peak month: ${peakMonth.monthName} (€${peakMonth.avgPrice.toLocaleString()})`);
console.log(`Trough month: ${troughMonth.monthName} (€${troughMonth.avgPrice.toLocaleString()})`);
console.log(`Peak-to-trough difference: €${(peakMonth.avgPrice - troughMonth.avgPrice).toLocaleString()} (${(((peakMonth.avgPrice - troughMonth.avgPrice) / troughMonth.avgPrice) * 100).toFixed(1)}%)`);

// Volume analysis
const peakVolumeMonth = seasonalData.reduce((max, curr) => curr.volume > max.volume ? curr : max);
const lowVolumeMonth = seasonalData.reduce((min, curr) => curr.volume < min.volume ? curr : min);

console.log(`\n🏠 SALES VOLUME PATTERNS`);
console.log('========================');
console.log(`Peak volume: ${peakVolumeMonth.monthName} (${peakVolumeMonth.volume} sales)`);
console.log(`Low volume: ${lowVolumeMonth.monthName} (${lowVolumeMonth.volume} sales)`);

// Seasonal timing strategy
console.log('\n💡 TIMING STRATEGY INSIGHTS');
console.log('===========================');

// Best months for sellers (high prices + good over-asking)
const sellerFavored = seasonalData
  .sort((a, b) => (b.avgPrice * b.overAskingRate) - (a.avgPrice * a.overAskingRate))
  .slice(0, 3);

console.log('Best months for sellers:');
sellerFavored.forEach(month => {
  console.log(`• ${month.monthName}: €${month.avgPrice.toLocaleString()} avg, ${month.overAskingRate.toFixed(1)}% over-asking`);
});

// Best months for buyers (lower prices)
const buyerFavored = seasonalData
  .sort((a, b) => a.avgPrice - b.avgPrice)
  .slice(0, 3);

console.log('\nBest months for buyers:');
buyerFavored.forEach(month => {
  console.log(`• ${month.monthName}: €${month.avgPrice.toLocaleString()} avg price`);
});

// Create chart data
const chartData = {
  MonthlyPriceTrendChart: seasonalData.map(month => ({
    month: month.monthName,
    avgPrice: month.avgPrice,
    volume: month.volume,
    overAskingRate: month.overAskingRate
  })),

  SeasonalVolumeChart: seasonalData.map(month => ({
    month: month.monthName,
    volume: month.volume,
    avgPrice: month.avgPrice
  })),

  SellerTimingChart: sellerFavored.map(month => ({
    month: month.monthName,
    avgPrice: month.avgPrice,
    overAskingRate: month.overAskingRate,
    sellerScore: month.avgPrice * month.overAskingRate / 1000 // Normalized score
  })),

  BuyerTimingChart: buyerFavored.map(month => ({
    month: month.monthName,
    avgPrice: month.avgPrice,
    savingsVsPeak: peakMonth.avgPrice - month.avgPrice
  })),

  PriceVolatilityChart: seasonalData.map(month => ({
    month: month.monthName,
    priceDeviation: ((month.avgPrice - troughMonth.avgPrice) / (peakMonth.avgPrice - troughMonth.avgPrice)) * 100
  }))
};

// Write chart data to file
const chartDataPath = path.join(__dirname, '../blogs/blog30_seasonal_timing_analysis_chart_data.json');
fs.writeFileSync(chartDataPath, JSON.stringify(chartData, null, 2));

console.log(`\n📊 Chart data exported to: ${chartDataPath}`);
console.log('\n✅ Seasonal Timing Analysis Complete!');

// Key insights summary
console.log('\n📋 KEY SEASONAL TIMING INSIGHTS');
console.log('===============================');
console.log(`• Peak month: ${peakMonth.monthName} (€${peakMonth.avgPrice.toLocaleString()})`);
console.log(`• Best buyer month: ${buyerFavored[0].monthName} (€${buyerFavored[0].avgPrice.toLocaleString()})`);
console.log(`• Price volatility: ${(((peakMonth.avgPrice - troughMonth.avgPrice) / troughMonth.avgPrice) * 100).toFixed(1)}% annual range`);
console.log(`• Peak volume month: ${peakVolumeMonth.monthName} (${peakVolumeMonth.volume} sales)`);
console.log(`• Best seller timing: ${sellerFavored[0].monthName} (combines price + over-asking success)`);
