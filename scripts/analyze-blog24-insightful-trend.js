const fs = require('fs');
const path = require('path');

// Read the data
const dataPath = path.join(__dirname, '../dashboard/public/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Filter valid properties
const validProps = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31') &&
         p.soldPrice &&
         p.areaSqm &&
         p.beds &&
         p.beds > 0 &&
         p.beds < 20 && // Filter out anomalies
         p.areaSqm > 20 && // Reasonable minimum size
         p.areaSqm < 1000; // Reasonable maximum size
});

console.log(`=== INSIGHTFUL TREND ANALYSIS ===\n`);
console.log(`Total valid properties analyzed: ${validProps.length.toLocaleString()}`);

// INSIGHT 1: Size Efficiency Paradox - Smaller properties often have higher price per sqm
console.log('\n🔍 INSIGHT 1: SIZE EFFICIENCY PARADOX');
console.log('=====================================');

// Group by bedroom count and calculate efficiency metrics
const sizeEfficiency = {};
validProps.forEach(p => {
  const bedKey = `${p.beds} bed`;
  if (!sizeEfficiency[bedKey]) {
    sizeEfficiency[bedKey] = {
      count: 0,
      totalPricePerSqm: 0,
      totalSizePerBed: 0,
      avgPrices: []
    };
  }
  sizeEfficiency[bedKey].count++;
  sizeEfficiency[bedKey].totalPricePerSqm += p.soldPrice / p.areaSqm;
  sizeEfficiency[bedKey].totalSizePerBed += p.areaSqm / p.beds;
  sizeEfficiency[bedKey].avgPrices.push(p.soldPrice);
});

Object.keys(sizeEfficiency).forEach(bedKey => {
  const data = sizeEfficiency[bedKey];
  data.avgPricePerSqm = data.totalPricePerSqm / data.count;
  data.avgSizePerBed = data.totalSizePerBed / data.count;
  data.medianPrice = data.avgPrices.sort((a, b) => a - b)[Math.floor(data.avgPrices.length / 2)];
});

console.log('Property Type Efficiency Analysis:');
Object.entries(sizeEfficiency)
  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
  .forEach(([bedKey, data]) => {
    console.log(`${bedKey}: ${data.count} properties - €${Math.round(data.avgPricePerSqm)}/sqm - ${Math.round(data.avgSizePerBed)} sqm/bed - Median €${Math.round(data.medianPrice).toLocaleString()}`);
  });

// INSIGHT 2: Seasonal Timing Impact on Pricing
console.log('\n📅 INSIGHT 2: SEASONAL TIMING IMPACT');
console.log('====================================');

const seasonalData = {};
validProps.forEach(p => {
  const date = new Date(p.soldDate);
  const month = date.getMonth();
  const season = month >= 2 && month <= 4 ? 'Spring' :
                month >= 5 && month <= 7 ? 'Summer' :
                month >= 8 && month <= 10 ? 'Autumn' : 'Winter';

  if (!seasonalData[season]) {
    seasonalData[season] = { count: 0, totalPrice: 0, prices: [] };
  }
  seasonalData[season].count++;
  seasonalData[season].totalPrice += p.soldPrice;
  seasonalData[season].prices.push(p.soldPrice);
});

Object.keys(seasonalData).forEach(season => {
  const data = seasonalData[season];
  data.avgPrice = data.totalPrice / data.count;
  data.medianPrice = data.prices.sort((a, b) => a - b)[Math.floor(data.prices.length / 2)];
});

const seasons = ['Winter', 'Spring', 'Summer', 'Autumn'];
seasons.forEach(season => {
  if (seasonalData[season]) {
    const data = seasonalData[season];
    console.log(`${season}: ${data.count} sales - Avg €${Math.round(data.avgPrice).toLocaleString()} - Median €${Math.round(data.medianPrice).toLocaleString()}`);
  }
});

// Calculate seasonal premium (vs winter baseline)
const winterAvg = seasonalData['Winter']?.avgPrice || 0;
seasons.forEach(season => {
  if (seasonalData[season] && season !== 'Winter') {
    const premium = ((seasonalData[season].avgPrice - winterAvg) / winterAvg) * 100;
    console.log(`${season} premium vs Winter: ${premium.toFixed(1)}%`);
  }
});

// INSIGHT 3: Property Type Performance by Area
console.log('\n🏙️ INSIGHT 3: PROPERTY TYPE PERFORMANCE BY AREA');
console.log('=============================================');

const areaTypePerformance = {};
validProps.forEach(p => {
  if (!p.dublinPostcode) return;

  const area = p.dublinPostcode;
  const type = p.propertyType;

  if (!areaTypePerformance[area]) {
    areaTypePerformance[area] = {};
  }
  if (!areaTypePerformance[area][type]) {
    areaTypePerformance[area][type] = { count: 0, totalPrice: 0, prices: [] };
  }

  areaTypePerformance[area][type].count++;
  areaTypePerformance[area][type].totalPrice += p.soldPrice;
  areaTypePerformance[area][type].prices.push(p.soldPrice);
});

// Calculate averages and find best performing combinations
const typePerformance = {};
Object.entries(areaTypePerformance).forEach(([area, types]) => {
  Object.entries(types).forEach(([type, data]) => {
    data.avgPrice = data.totalPrice / data.count;
    data.medianPrice = data.prices.sort((a, b) => a - b)[Math.floor(data.prices.length / 2)];

    const key = `${type}-${area}`;
    typePerformance[key] = {
      area,
      type,
      avgPrice: data.avgPrice,
      medianPrice: data.medianPrice,
      count: data.count
    };
  });
});

// Find most valuable property type in each area
const bestTypeByArea = {};
Object.entries(areaTypePerformance).forEach(([area, types]) => {
  let bestType = null;
  let bestAvgPrice = 0;

  Object.entries(types).forEach(([type, data]) => {
    data.avgPrice = data.totalPrice / data.count;
    if (data.avgPrice > bestAvgPrice && data.count >= 10) { // Minimum sample size
      bestAvgPrice = data.avgPrice;
      bestType = type;
    }
  });

  if (bestType) {
    bestTypeByArea[area] = {
      type: bestType,
      avgPrice: bestAvgPrice,
      count: types[bestType].count
    };
  }
});

console.log('Best Performing Property Type by Area:');
Object.entries(bestTypeByArea)
  .sort((a, b) => b[1].avgPrice - a[1].avgPrice)
  .slice(0, 10)
  .forEach(([area, data]) => {
    console.log(`${area}: ${data.type} - €${Math.round(data.avgPrice).toLocaleString()} (${data.count} sales)`);
  });

// INSIGHT 4: The Luxury Threshold Effect
console.log('\n💎 INSIGHT 4: LUXURY THRESHOLD EFFECT');
console.log('====================================');

// Analyze how properties perform at different price thresholds
const priceThresholds = [500000, 750000, 1000000, 1500000, 2000000];
const thresholdAnalysis = {};

priceThresholds.forEach(threshold => {
  const aboveThreshold = validProps.filter(p => p.soldPrice >= threshold);
  const belowThreshold = validProps.filter(p => p.soldPrice < threshold);

  if (aboveThreshold.length >= 50 && belowThreshold.length >= 50) {
    const avgAbove = aboveThreshold.reduce((sum, p) => sum + p.soldPrice, 0) / aboveThreshold.length;
    const avgBelow = belowThreshold.reduce((sum, p) => sum + p.soldPrice, 0) / belowThreshold.length;

    thresholdAnalysis[threshold] = {
      aboveCount: aboveThreshold.length,
      belowCount: belowThreshold.length,
      avgAbove: avgAbove,
      avgBelow: avgBelow,
      premium: ((avgAbove - avgBelow) / avgBelow) * 100
    };
  }
});

console.log('Price Threshold Analysis:');
Object.entries(thresholdAnalysis).forEach(([threshold, data]) => {
  console.log(`€${parseInt(threshold).toLocaleString()}+ properties: ${data.aboveCount} sales - Avg €${Math.round(data.avgAbove).toLocaleString()} (${data.premium.toFixed(1)}% premium)`);
});

// INSIGHT 5: Timing vs Value Trade-off (Most Insightful!)
console.log('\n⏰ INSIGHT 5: TIMING VS VALUE TRADE-OFF');
console.log('======================================');

// Analyze monthly performance to find best/worst timing
const monthlyPerformance = {};
validProps.forEach(p => {
  const date = new Date(p.soldDate);
  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  if (!monthlyPerformance[monthKey]) {
    monthlyPerformance[monthKey] = { count: 0, totalPrice: 0, totalSqmPrice: 0, prices: [] };
  }
  monthlyPerformance[monthKey].count++;
  monthlyPerformance[monthKey].totalPrice += p.soldPrice;
  monthlyPerformance[monthKey].totalSqmPrice += p.soldPrice / p.areaSqm;
  monthlyPerformance[monthKey].prices.push(p.soldPrice);
});

Object.keys(monthlyPerformance).forEach(month => {
  const data = monthlyPerformance[month];
  data.avgPrice = data.totalPrice / data.count;
  data.avgSqmPrice = data.totalSqmPrice / data.count;
  data.medianPrice = data.prices.sort((a, b) => a - b)[Math.floor(data.prices.length / 2)];
});

console.log('Monthly Market Performance (2024-2025):');
Object.entries(monthlyPerformance)
  .sort(([a], [b]) => a.localeCompare(b))
  .forEach(([month, data]) => {
    console.log(`${month}: ${data.count} sales - Avg €${Math.round(data.avgPrice).toLocaleString()} - €${Math.round(data.avgSqmPrice)}/sqm`);
  });

// Find best and worst months for pricing
const sortedMonths = Object.entries(monthlyPerformance)
  .sort((a, b) => b[1].avgPrice - a[1].avgPrice);

console.log('\nBest Performing Months:');
sortedMonths.slice(0, 3).forEach(([month, data]) => {
  console.log(`${month}: €${Math.round(data.avgPrice).toLocaleString()} average (${data.count} sales)`);
});

console.log('\nWorst Performing Months:');
sortedMonths.slice(-3).forEach(([month, data]) => {
  console.log(`${month}: €${Math.round(data.avgPrice).toLocaleString()} average (${data.count} sales)`);
});

// Calculate potential savings from timing
const bestMonth = sortedMonths[0][1];
const worstMonth = sortedMonths[sortedMonths.length - 1][1];
const timingPremium = ((bestMonth.avgPrice - worstMonth.avgPrice) / worstMonth.avgPrice) * 100;

console.log(`\nTiming Premium: ${timingPremium.toFixed(1)}% difference between best and worst months`);

// Create chart data for the timing insight (most compelling)
const chartData = {
  SeasonalPerformanceChart: seasons.map(season => {
    const data = seasonalData[season];
    return {
      season: season,
      avgPrice: Math.round(data.avgPrice),
      medianPrice: Math.round(data.medianPrice),
      sales: data.count
    };
  }),

  MonthlyTimingChart: Object.entries(monthlyPerformance)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month: month,
      avgPrice: Math.round(data.avgPrice),
      avgSqmPrice: Math.round(data.avgSqmPrice),
      sales: data.count
    })),

  SizeEfficiencyChart: Object.entries(sizeEfficiency)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([bedKey, data]) => ({
      bedrooms: bedKey,
      avgPricePerSqm: Math.round(data.avgPricePerSqm),
      avgSizePerBed: Math.round(data.avgSizePerBed),
      medianPrice: Math.round(data.medianPrice),
      count: data.count
    })),

  BestTypeByAreaChart: Object.entries(bestTypeByArea)
    .sort((a, b) => b[1].avgPrice - a[1].avgPrice)
    .slice(0, 10)
    .map(([area, data]) => ({
      area: area,
      bestType: data.type,
      avgPrice: Math.round(data.avgPrice),
      count: data.count
    })),

  TimingValueTradeoffChart: [
    { timing: 'Best Month', avgPrice: Math.round(bestMonth.avgPrice), month: sortedMonths[0][0] },
    { timing: 'Worst Month', avgPrice: Math.round(worstMonth.avgPrice), month: sortedMonths[sortedMonths.length - 1][0] },
    { timing: 'Average', avgPrice: Math.round(validProps.reduce((sum, p) => sum + p.soldPrice, 0) / validProps.length) }
  ]
};

// Write chart data to file
const chartDataPath = path.join(__dirname, '../blogs/blog24_timing_value_tradeoff_chart_data.json');
fs.writeFileSync(chartDataPath, JSON.stringify(chartData, null, 2));

console.log(`\n📊 Chart data exported to: ${chartDataPath}`);
console.log('\n✅ Insightful Trend Analysis Complete!');

// Key insights summary
console.log('\n📋 KEY MARKET INSIGHTS DISCOVERED');
console.log('==================================');
console.log(`• Size Efficiency Paradox: 1-bed properties command €${Math.round(sizeEfficiency['1 bed'].avgPricePerSqm)}/sqm vs 5-bed at €${Math.round(sizeEfficiency['5 bed'].avgPricePerSqm)}/sqm`);
console.log(`• Seasonal Premium: Spring properties sell for ${(((seasonalData['Spring']?.avgPrice || 0) - winterAvg) / winterAvg * 100).toFixed(1)}% more than winter`);
console.log(`• Timing Value Trade-off: ${timingPremium.toFixed(1)}% price difference between best and worst months`);
console.log(`• Luxury Threshold: €1M+ properties sell at ${(thresholdAnalysis[1000000]?.premium || 0).toFixed(1)}% premium`);
console.log(`• Most Valuable Combo: ${Object.entries(bestTypeByArea).sort((a, b) => b[1].avgPrice - a[1].avgPrice)[0]?.[0]} ${Object.entries(bestTypeByArea).sort((a, b) => b[1].avgPrice - a[1].avgPrice)[0]?.[1].type} at €${Math.round(Object.entries(bestTypeByArea).sort((a, b) => b[1].avgPrice - a[1].avgPrice)[0]?.[1].avgPrice).toLocaleString()}`);
