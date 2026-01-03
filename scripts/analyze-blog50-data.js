const fs = require('fs');

// Load data
const data = JSON.parse(fs.readFileSync('../dashboard/public/data.json', 'utf8'));

// Filter for all available D5 properties (2021-2025)
const d5Properties = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2021-01-01') &&
         soldDate <= new Date('2025-12-31') &&
         p.dublinPostcode === 'D5';
});

console.log(`D5 properties analyzed: ${d5Properties.length}`);

// Calculate year-over-year performance for all available years
const yearlyData = {};
d5Properties.forEach(p => {
  const year = new Date(p.soldDate).getFullYear();
  if (!yearlyData[year]) {
    yearlyData[year] = { count: 0, totalPrice: 0 };
  }
  yearlyData[year].count++;
  yearlyData[year].totalPrice += p.soldPrice;
});

console.log('\nD5 Yearly Performance:');
const years = Object.keys(yearlyData).sort((a, b) => a - b);
years.forEach(year => {
  const avg = yearlyData[year].totalPrice / yearlyData[year].count;
  console.log(`${year}: €${avg.toLocaleString()} (${yearlyData[year].count} sales)`);
});

// Calculate overall growth
const firstYear = years[0];
const lastYear = years[years.length - 1];
const firstAvg = yearlyData[firstYear].totalPrice / yearlyData[firstYear].count;
const lastAvg = yearlyData[lastYear].totalPrice / yearlyData[lastYear].count;
const overallGrowth = ((lastAvg - firstAvg) / firstAvg) * 100;

console.log(`\nOverall D5 Growth (${firstYear}-${lastYear}):`);
console.log(`Starting Average: €${firstAvg.toLocaleString()}`);
console.log(`Current Average: €${lastAvg.toLocaleString()}`);
console.log(`Total Growth: ${overallGrowth.toFixed(1)}%`);
console.log(`Value Increase: €${(lastAvg - firstAvg).toLocaleString()}`);

// Property type analysis
const propertyTypes = {};
d5Properties.forEach(p => {
  const type = p.propertyType;
  if (!propertyTypes[type]) {
    propertyTypes[type] = { count: 0, totalPrice: 0 };
  }
  propertyTypes[type].count++;
  propertyTypes[type].totalPrice += p.soldPrice;
});

console.log(`\nProperty Type Breakdown:`);
Object.entries(propertyTypes)
  .sort((a, b) => b[1].count - a[1].count)
  .forEach(([type, data]) => {
    const avgPrice = data.totalPrice / data.count;
    const percentage = (data.count / d5Properties.length * 100).toFixed(1);
    console.log(`${type}: ${data.count} (${percentage}%) - €${avgPrice.toLocaleString()}`);
  });

// Price distribution
const priceBrackets = {
  '€0-400k': 0,
  '€400k-600k': 0,
  '€600k-800k': 0,
  '€800k-1M': 0,
  '€1M+': 0
};

d5Properties.forEach(p => {
  if (p.soldPrice < 400000) priceBrackets['€0-400k']++;
  else if (p.soldPrice < 600000) priceBrackets['€400k-600k']++;
  else if (p.soldPrice < 800000) priceBrackets['€600k-800k']++;
  else if (p.soldPrice < 1000000) priceBrackets['€800k-1M']++;
  else priceBrackets['€1M+']++;
});

console.log(`\nPrice Distribution:`);
Object.entries(priceBrackets).forEach(([bracket, count]) => {
  const percentage = (count / d5Properties.length * 100).toFixed(1);
  console.log(`${bracket}: ${count} (${percentage}%)`);
});

// Competition analysis
const overAsking = d5Properties.filter(p => p.overUnderPercent > 0);
const avgPremium = overAsking.length > 0 ?
  overAsking.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAsking.length : 0;

console.log(`\nCompetition Analysis:`);
console.log(`Over-asking rate: ${(overAsking.length / d5Properties.length * 100).toFixed(1)}%`);
console.log(`Average premium: ${avgPremium.toFixed(1)}%`);

// Monthly trends
const monthlyData = {};
d5Properties.forEach(p => {
  const month = new Date(p.soldDate).toISOString().slice(0, 7); // YYYY-MM
  if (!monthlyData[month]) {
    monthlyData[month] = { count: 0, totalPrice: 0 };
  }
  monthlyData[month].count++;
  monthlyData[month].totalPrice += p.soldPrice;
});

console.log(`\nMonthly Averages:`);
Object.entries(monthlyData)
  .sort(([a], [b]) => a.localeCompare(b))
  .forEach(([month, data]) => {
    const avg = data.totalPrice / data.count;
    console.log(`${month}: €${avg.toLocaleString()} (${data.count} sales)`);
  });

// Size efficiency analysis for D5
const sizeEfficiency = {};
d5Properties.forEach(p => {
  if (p.areaSqm && p.areaSqm > 0) {
    const pricePerSqm = p.soldPrice / p.areaSqm;
    const sizeBracket = Math.floor(p.areaSqm / 50) * 50;
    const bracket = `${sizeBracket}-${sizeBracket + 49}m²`;

    if (!sizeEfficiency[bracket]) {
      sizeEfficiency[bracket] = { count: 0, totalPricePerSqm: 0 };
    }
    sizeEfficiency[bracket].count++;
    sizeEfficiency[bracket].totalPricePerSqm += pricePerSqm;
  }
});

console.log(`\nSize Efficiency Analysis:`);
Object.entries(sizeEfficiency)
  .sort(([a], [b]) => parseInt(a) - parseInt(b))
  .forEach(([bracket, data]) => {
    const avgPricePerSqm = data.totalPricePerSqm / data.count;
    console.log(`${bracket}: €${avgPricePerSqm.toFixed(0)}/m² (${data.count} properties)`);
  });

// Export chart data
const chartData = {
  yearlyTrendChart: years.map(year => ({
    year,
    averagePrice: Math.round(yearlyData[year].totalPrice / yearlyData[year].count),
    transactionCount: yearlyData[year].count
  })),
  propertyTypeChart: Object.entries(propertyTypes).map(([type, data]) => ({
    type,
    count: data.count,
    averagePrice: Math.round(data.totalPrice / data.count),
    percentage: (data.count / d5Properties.length * 100).toFixed(1)
  })),
  priceDistributionChart: Object.entries(priceBrackets).map(([bracket, count]) => ({
    bracket,
    count,
    percentage: (count / d5Properties.length * 100).toFixed(1)
  })),
  monthlyTrendChart: Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      averagePrice: Math.round(data.totalPrice / data.count),
      transactionCount: data.count
    })),
  sizeEfficiencyChart: Object.entries(sizeEfficiency)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([bracket, data]) => ({
      sizeBracket: bracket,
      averagePricePerSqm: Math.round(data.totalPricePerSqm / data.count),
      propertyCount: data.count
    }))
};

fs.writeFileSync('../dashboard/public/blog50_d5_area_analysis_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('\nChart data exported to blog50_d5_area_analysis_chart_data.json');
