// Dublin Market Slowdown with Rising Prices Analysis
// Blog 58: Current market trends (January 2026 vs December 2025)

const fs = require('fs');
const path = require('path');

console.log('Analyzing Dublin market trends: January 2026 vs December 2025...');

// Load the data
const dataPath = path.join(__dirname, '..', 'dashboard', 'public', 'data.json');
const rawData = fs.readFileSync(dataPath, 'utf8');
const data = JSON.parse(rawData);

// Filter to valid sales data including January 2026
const validSales = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2020-01-01') && soldDate <= new Date('2026-01-31') &&
         !isNaN(soldDate.getTime());
});

// Get January 2026 data (current/latest)
const currentPeriodSales = validSales.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate.getFullYear() === 2026 && soldDate.getMonth() === 0; // January
});

// Get December 2025 data for comparison
const previousPeriodSales = validSales.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate.getFullYear() === 2025 && soldDate.getMonth() === 11; // December
});

console.log(`Current period (January 2026): ${currentPeriodSales.length} sales`);
console.log(`Previous period (December 2025): ${previousPeriodSales.length} sales`);

// Calculate overall market statistics (handle cases with zero current period sales)
const currentAvgPrice = currentPeriodSales.length > 0 ?
  currentPeriodSales.reduce((sum, p) => sum + p.soldPrice, 0) / currentPeriodSales.length : 0;
const previousAvgPrice = previousPeriodSales.reduce((sum, p) => sum + p.soldPrice, 0) / previousPeriodSales.length;
const priceChange = currentPeriodSales.length > 0 ? ((currentAvgPrice - previousAvgPrice) / previousAvgPrice) * 100 : 0;

const currentOverAskingRate = currentPeriodSales.length > 0 ?
  (currentPeriodSales.filter(p => p.overUnderPercent > 0).length / currentPeriodSales.length) * 100 : 0;
const previousOverAskingRate = (previousPeriodSales.filter(p => p.overUnderPercent > 0).length / previousPeriodSales.length) * 100;

// Activity change
const activityChange = ((currentPeriodSales.length - previousPeriodSales.length) / previousPeriodSales.length) * 100;

// Get area statistics
const areas = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D6W', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18', 'D20', 'D22', 'D24'];

const areaStats = areas.map(area => {
  const currentAreaSales = currentPeriodSales.filter(p => p.dublinPostcode === area);
  const previousAreaSales = previousPeriodSales.filter(p => p.dublinPostcode === area);

  const currentCount = currentAreaSales.length;
  const previousCount = previousAreaSales.length;
  const countChange = previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : 0;

  let priceChange = 0;
  if (currentAreaSales.length >= 3 && previousAreaSales.length >= 3) {
    const currentAvg = currentAreaSales.reduce((sum, p) => sum + p.soldPrice, 0) / currentAreaSales.length;
    const previousAvg = previousAreaSales.reduce((sum, p) => sum + p.soldPrice, 0) / previousAreaSales.length;
    priceChange = ((currentAvg - previousAvg) / previousAvg) * 100;
  }

  return {
    area,
    currentCount,
    previousCount,
    countChange,
    priceChange,
    currentAvgPrice: currentAreaSales.length > 0 ?
      currentAreaSales.reduce((sum, p) => sum + p.soldPrice, 0) / currentAreaSales.length : 0,
    previousAvgPrice: previousAreaSales.length > 0 ?
      previousAreaSales.reduce((sum, p) => sum + p.soldPrice, 0) / previousAreaSales.length : 0
  };
});

// Sort areas by activity change and price change
const areasByActivityDecline = areaStats
  .filter(stat => stat.previousCount >= 5)
  .sort((a, b) => a.countChange - b.countChange);

const areasByPriceIncrease = areaStats
  .filter(stat => stat.currentCount >= 3 && stat.previousCount >= 3 && stat.priceChange > 2)
  .sort((a, b) => b.priceChange - a.priceChange);

// Rental analysis
const rentalSales = validSales.filter(p => p.yieldEstimate);

const currentPeriodRentals = rentalSales.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate.getFullYear() === 2026 && soldDate.getMonth() === 0; // January 2026
});

const previousPeriodRentals = rentalSales.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate.getFullYear() === 2025 && soldDate.getMonth() === 11; // December 2025
});

const currentAvgRent = currentPeriodRentals.length > 0 ?
  currentPeriodRentals.reduce((sum, p) => sum + p.yieldEstimate.monthlyRent, 0) / currentPeriodRentals.length : 0;
const previousAvgRent = previousPeriodRentals.reduce((sum, p) => sum + p.yieldEstimate.monthlyRent, 0) / previousPeriodRentals.length;
const rentChange = currentPeriodRentals.length > 0 ? ((currentAvgRent - previousAvgRent) / previousAvgRent) * 100 : 0;

const currentAvgYield = currentPeriodRentals.length > 0 ?
  currentPeriodRentals.reduce((sum, p) => sum + p.yieldEstimate.grossYield, 0) / currentPeriodRentals.length : 0;
const previousAvgYield = previousPeriodRentals.reduce((sum, p) => sum + p.yieldEstimate.grossYield, 0) / previousPeriodRentals.length;
const yieldChange = currentPeriodRentals.length > 0 ? ((currentAvgYield - previousAvgYield) / previousAvgYield) * 100 : 0;

// Rental area analysis
const rentalAreaStats = areas.map(area => {
  const currentAreaRentals = currentPeriodRentals.filter(p => p.dublinPostcode === area);
  const previousAreaRentals = previousPeriodRentals.filter(p => p.dublinPostcode === area);

  let rentChange = 0;
  if (currentAreaRentals.length >= 3 && previousAreaRentals.length >= 3) {
    const currentAvg = currentAreaRentals.reduce((sum, p) => sum + p.yieldEstimate.monthlyRent, 0) / currentAreaRentals.length;
    const previousAvg = previousAreaRentals.reduce((sum, p) => sum + p.yieldEstimate.monthlyRent, 0) / previousAreaRentals.length;
    rentChange = ((currentAvg - previousAvg) / previousAvg) * 100;
  }

  return {
    area,
    currentCount: currentAreaRentals.length,
    previousCount: previousAreaRentals.length,
    rentChange,
    currentAvgRent: currentAreaRentals.length > 0 ?
      currentAreaRentals.reduce((sum, p) => sum + p.yieldEstimate.monthlyRent, 0) / currentAreaRentals.length : 0
  };
});

const areasByRentIncrease = rentalAreaStats
  .filter(stat => stat.currentCount >= 3 && stat.previousCount >= 3 && stat.rentChange > 2)
  .sort((a, b) => b.rentChange - a.rentChange);

// Generate chart data
const chartData = {
  MarketActivityDeclineChart: [
    { period: 'Previous Month', sales: previousPeriodSales.length, rentals: previousPeriodRentals.length },
    { period: 'Current Month', sales: currentPeriodSales.length, rentals: currentPeriodRentals.length }
  ],

  PriceIncreaseAreasChart: areasByPriceIncrease.slice(0, 8).map(stat => ({
    area: stat.area,
    priceChange: Math.round(stat.priceChange * 10) / 10,
    currentPrice: Math.round(stat.currentAvgPrice)
  })),

  ActivityDeclineByAreaChart: areasByActivityDecline.slice(0, 10).map(stat => ({
    area: stat.area,
    activityChange: Math.round(stat.countChange),
    currentSales: stat.currentCount
  })),

  RentIncreaseAreasChart: areasByRentIncrease.slice(0, 8).map(stat => ({
    area: stat.area,
    rentChange: Math.round(stat.rentChange * 10) / 10,
    currentRent: Math.round(stat.currentAvgRent)
  })),

  OverAskingTrendChart: [
    { period: 'Previous Month', successRate: Math.round(previousOverAskingRate * 10) / 10 },
    { period: 'Current Month', successRate: Math.round(currentOverAskingRate * 10) / 10 }
  ]
};

// Save chart data
const chartDataPath = path.join(__dirname, '..', 'blog58_dublin_market_slowdown_chart_data.json');
fs.writeFileSync(chartDataPath, JSON.stringify(chartData, null, 2));

console.log('Analysis complete. Chart data saved to:', chartDataPath);

// Summary statistics for blog (January 2026 vs December 2025)
const summary = {
  currentPeriod: 'January 2026',
  previousPeriod: 'December 2025',
  salesActivityChange: Math.round(activityChange),
  priceChange: Math.round(priceChange * 10) / 10,
  overAskingChange: Math.round((currentOverAskingRate - previousOverAskingRate) * 10) / 10,
  rentalActivityChange: Math.round(((currentPeriodRentals.length - previousPeriodRentals.length) / previousPeriodRentals.length) * 100),
  rentChange: Math.round(rentChange * 10) / 10,
  yieldChange: Math.round(yieldChange * 10) / 10,
  topPriceAreas: areasByPriceIncrease.slice(0, 3).map(a => `${a.area} (+${Math.round(a.priceChange)}%)`),
  topRentAreas: areasByRentIncrease.slice(0, 3).map(a => `${a.area} (+${Math.round(a.rentChange)}%`)
};

console.log('\nKey Findings:');
console.log(`- Sales activity: ${summary.salesActivityChange}% change`);
console.log(`- Average price: +${summary.priceChange}%`);
console.log(`- Over-asking success: ${summary.overAskingChange > 0 ? '+' : ''}${summary.overAskingChange}%`);
console.log(`- Top price areas: ${summary.topPriceAreas.join(', ')}`);
console.log(`- Rental activity: ${summary.rentalActivityChange}% change`);
console.log(`- Average rent: +${summary.rentChange}%`);
console.log(`- Top rent areas: ${summary.topRentAreas.join(', ')}`);