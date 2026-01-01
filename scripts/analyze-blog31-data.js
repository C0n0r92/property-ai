const fs = require('fs');

// Load data
const data = JSON.parse(fs.readFileSync('../dashboard/public/data.json', 'utf8'));

// Filter for valid 2024-2025 D15 properties
const d15Properties = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31') &&
         p.dublinPostcode === 'D15';
});

console.log(`D15 properties analyzed: ${d15Properties.length}`);

// Calculate year-over-year performance
const y2024 = d15Properties.filter(p => new Date(p.soldDate).getFullYear() === 2024);
const y2025 = d15Properties.filter(p => new Date(p.soldDate).getFullYear() === 2025);

const avg2024 = y2024.length > 0 ? y2024.reduce((sum, p) => sum + p.soldPrice, 0) / y2024.length : 0;
const avg2025 = y2025.length > 0 ? y2025.reduce((sum, p) => sum + p.soldPrice, 0) / y2025.length : 0;

const growth = avg2024 > 0 ? ((avg2025 - avg2024) / avg2024) * 100 : 0;
const valueIncrease = avg2025 - avg2024;

console.log(`D15 Performance:`);
console.log(`2024 Average: €${avg2024.toLocaleString()}`);
console.log(`2025 Average: €${avg2025.toLocaleString()}`);
console.log(`Growth: ${growth.toFixed(1)}%`);
console.log(`Value Increase: €${valueIncrease.toLocaleString()}`);

// Property type analysis
const propertyTypes = {};
d15Properties.forEach(p => {
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
    const percentage = (data.count / d15Properties.length * 100).toFixed(1);
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

d15Properties.forEach(p => {
  if (p.soldPrice < 400000) priceBrackets['€0-400k']++;
  else if (p.soldPrice < 600000) priceBrackets['€400k-600k']++;
  else if (p.soldPrice < 800000) priceBrackets['€600k-800k']++;
  else if (p.soldPrice < 1000000) priceBrackets['€800k-1M']++;
  else priceBrackets['€1M+']++;
});

console.log(`\nPrice Distribution:`);
Object.entries(priceBrackets).forEach(([bracket, count]) => {
  const percentage = (count / d15Properties.length * 100).toFixed(1);
  console.log(`${bracket}: ${count} (${percentage}%)`);
});

// Competition analysis
const overAsking = d15Properties.filter(p => p.overUnderPercent > 0);
const avgPremium = overAsking.length > 0 ?
  overAsking.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAsking.length : 0;

console.log(`\nCompetition Analysis:`);
console.log(`Over-asking rate: ${(overAsking.length / d15Properties.length * 100).toFixed(1)}%`);
console.log(`Average premium: ${avgPremium.toFixed(1)}%`);

// Monthly trends
const monthlyData = {};
d15Properties.forEach(p => {
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

// Export chart data
const chartData = {
  yearOverYearChart: [
    { year: '2024', averagePrice: Math.round(avg2024) },
    { year: '2025', averagePrice: Math.round(avg2025) }
  ],
  propertyTypeChart: Object.entries(propertyTypes).map(([type, data]) => ({
    type,
    count: data.count,
    averagePrice: Math.round(data.totalPrice / data.count),
    percentage: (data.count / d15Properties.length * 100).toFixed(1)
  })),
  priceDistributionChart: Object.entries(priceBrackets).map(([bracket, count]) => ({
    bracket,
    count,
    percentage: (count / d15Properties.length * 100).toFixed(1)
  })),
  monthlyTrendChart: Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      averagePrice: Math.round(data.totalPrice / data.count),
      transactionCount: data.count
    }))
};

fs.writeFileSync('blog31_d15_area_analysis_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('\nChart data exported to blog31_d15_area_analysis_chart_data.json');
