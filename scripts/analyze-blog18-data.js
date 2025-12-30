const fs = require('fs');
const path = require('path');

// Read the data
const dataPath = path.join(__dirname, '../dashboard/public/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Filter to valid 2024-2025 data only (exclude future dates)
const validProps = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') && soldDate <= new Date('2025-12-31');
});

console.log('=== DUBLIN PROPERTY VALUATION INCREASES ANALYSIS ===\n');
console.log(`Total properties in 2024-2025: ${validProps.length.toLocaleString()}`);

// Split into 2024 and 2025 data
const props2024 = validProps.filter(p => p.soldDate.startsWith('2024'));
const props2025 = validProps.filter(p => p.soldDate.startsWith('2025'));

console.log(`2024 properties: ${props2024.length.toLocaleString()}`);
console.log(`2025 properties: ${props2025.length.toLocaleString()}\n`);

// Calculate average prices by area for each year
function calculateAreaAverages(props) {
  const areaStats = {};
  props.forEach(p => {
    if (!p.dublinPostcode) return;

    if (!areaStats[p.dublinPostcode]) {
      areaStats[p.dublinPostcode] = { total: 0, count: 0, sum: 0 };
    }
    areaStats[p.dublinPostcode].count++;
    areaStats[p.dublinPostcode].sum += p.soldPrice;
    areaStats[p.dublinPostcode].total++;
  });

  // Calculate averages
  Object.keys(areaStats).forEach(area => {
    areaStats[area].avgPrice = areaStats[area].sum / areaStats[area].count;
  });

  return areaStats;
}

const areaStats2024 = calculateAreaAverages(props2024);
const areaStats2025 = calculateAreaAverages(props2025);

// Calculate year-over-year changes
const yoyChanges = {};
Object.keys(areaStats2025).forEach(area => {
  if (areaStats2024[area] && areaStats2025[area].count >= 50) { // Minimum sample size
    const changePercent = ((areaStats2025[area].avgPrice - areaStats2024[area].avgPrice) / areaStats2024[area].avgPrice) * 100;
    yoyChanges[area] = {
      area,
      avgPrice2024: Math.round(areaStats2024[area].avgPrice),
      avgPrice2025: Math.round(areaStats2025[area].avgPrice),
      changePercent: changePercent,
      sampleSize: areaStats2025[area].count,
      changeDirection: changePercent > 0 ? 'up' : 'down'
    };
  }
});

// Sort by price increase
const topIncreases = Object.values(yoyChanges)
  .filter(change => change.changePercent > 0)
  .sort((a, b) => b.changePercent - a.changePercent)
  .slice(0, 10);

const topDecreases = Object.values(yoyChanges)
  .filter(change => change.changePercent < 0)
  .sort((a, b) => a.changePercent - b.changePercent)
  .slice(0, 10);

console.log('🏆 AREAS WITH HIGHEST PRICE INCREASES (2024 → 2025)');
console.log('===================================================');
console.log('| Area | 2024 Avg Price | 2025 Avg Price | Increase | Sample Size |');
console.log('|------|----------------|----------------|----------|-------------|');
topIncreases.forEach(area => {
  console.log(`| ${area.area} | €${area.avgPrice2024.toLocaleString()} | €${area.avgPrice2025.toLocaleString()} | ${area.changePercent.toFixed(1)}% | ${area.sampleSize} |`);
});

console.log('\n📉 AREAS WITH PRICE DECREASES (2024 → 2025)');
console.log('===========================================');
console.log('| Area | 2024 Avg Price | 2025 Avg Price | Decrease | Sample Size |');
console.log('|------|----------------|----------------|----------|-------------|');
topDecreases.forEach(area => {
  console.log(`| ${area.area} | €${area.avgPrice2024.toLocaleString()} | €${area.avgPrice2025.toLocaleString()} | ${Math.abs(area.changePercent).toFixed(1)}% | ${area.sampleSize} |`);
});

// Analyze bidding wars in 2025
const biddingProps2025 = props2025.filter(p =>
  p.overUnderPercent !== null &&
  p.overUnderPercent !== undefined &&
  p.dublinPostcode
);

console.log('\n🎯 2025 BIDDING WAR ANALYSIS');
console.log('===========================');

const biddingByArea = {};
biddingProps2025.forEach(p => {
  if (!biddingByArea[p.dublinPostcode]) {
    biddingByArea[p.dublinPostcode] = { total: 0, over: 0, totalPremium: 0 };
  }
  biddingByArea[p.dublinPostcode].total++;
  if (p.overUnderPercent > 0) {
    biddingByArea[p.dublinPostcode].over++;
    biddingByArea[p.dublinPostcode].totalPremium += p.overUnderPercent;
  }
});

const biddingResults = Object.entries(biddingByArea)
  .filter(([area, data]) => data.total >= 30) // Minimum sample size
  .map(([area, data]) => ({
    area,
    total: data.total,
    overRate: (data.over / data.total * 100),
    avgPremium: data.over > 0 ? (data.totalPremium / data.over) : 0
  }))
  .sort((a, b) => b.overRate - a.overRate)
  .slice(0, 10);

console.log('| Area | Properties | Over Asking Rate | Avg Premium |');
console.log('|------|------------|------------------|-------------|');
biddingResults.forEach(area => {
  console.log(`| ${area.area} | ${area.total} | ${area.overRate.toFixed(1)}% | ${area.avgPremium.toFixed(1)}% |`);
});

// Create chart data
const chartData = {
  PriceIncreaseChart: topIncreases.slice(0, 8).map(area => ({
    area: area.area,
    increase: parseFloat(area.changePercent.toFixed(1)),
    avgPrice2025: area.avgPrice2025
  })),

  BiddingWarsChart: biddingResults.slice(0, 8).map(area => ({
    area: area.area,
    overAskingRate: parseFloat(area.overRate.toFixed(1)),
    avgPremium: parseFloat(area.avgPremium.toFixed(1))
  })),

  PriceChangeComparisonChart: [
    ...topIncreases.slice(0, 5).map(area => ({
      area: area.area,
      change: parseFloat(area.changePercent.toFixed(1)),
      type: 'Increase'
    })),
    ...topDecreases.slice(0, 5).map(area => ({
      area: area.area,
      change: parseFloat(area.changePercent.toFixed(1)),
      type: 'Decrease'
    }))
  ]
};

// Write chart data to file
const chartDataPath = path.join(__dirname, '../blogs/blog18_property_valuation_increases_chart_data.json');
fs.writeFileSync(chartDataPath, JSON.stringify(chartData, null, 2));

console.log(`\n📊 Chart data exported to: ${chartDataPath}`);
console.log('\n✅ Analysis complete!');

// Summary statistics
const totalChange = Object.values(yoyChanges).reduce((sum, area) => sum + area.changePercent, 0) / Object.values(yoyChanges).length;
const areasUp = Object.values(yoyChanges).filter(area => area.changePercent > 0).length;
const areasDown = Object.values(yoyChanges).filter(area => area.changePercent < 0).length;

console.log('\n📈 MARKET SUMMARY');
console.log('================');
console.log(`Average price change across Dublin: ${totalChange.toFixed(1)}%`);
console.log(`Areas with price increases: ${areasUp}`);
console.log(`Areas with price decreases: ${areasDown}`);
console.log(`Top increase: ${topIncreases[0]?.area} (+${topIncreases[0]?.changePercent.toFixed(1)}%)`);
console.log(`Strongest bidding wars: ${biddingResults[0]?.area} (${biddingResults[0]?.overRate.toFixed(1)}% over asking)`);
