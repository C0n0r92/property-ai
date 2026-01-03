const fs = require('fs');

// Load data
const data = JSON.parse(fs.readFileSync('../dashboard/public/data.json', 'utf8'));

// Filter for properties from 2021 onwards (COVID recovery period)
const covidRecoveryProperties = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2021-01-01') &&
         soldDate <= new Date('2025-12-31') &&
         p.dublinPostcode; // Only Dublin properties
});

console.log(`COVID recovery properties analyzed: ${covidRecoveryProperties.length}`);

// Group by year
const yearlyData = {};
covidRecoveryProperties.forEach(p => {
  const year = new Date(p.soldDate).getFullYear();
  if (!yearlyData[year]) {
    yearlyData[year] = { count: 0, totalPrice: 0, properties: [] };
  }
  yearlyData[year].count++;
  yearlyData[year].totalPrice += p.soldPrice;
  yearlyData[year].properties.push(p);
});

console.log('\nYearly Performance:');
Object.entries(yearlyData)
  .sort(([a], [b]) => a - b)
  .forEach(([year, data]) => {
    const avgPrice = data.totalPrice / data.count;
    console.log(`${year}: €${avgPrice.toLocaleString()} (${data.count} sales)`);
  });

// Calculate growth rates
const years = Object.keys(yearlyData).sort((a, b) => a - b);
const growthRates = {};
for (let i = 1; i < years.length; i++) {
  const currentYear = years[i];
  const prevYear = years[i - 1];
  const currentAvg = yearlyData[currentYear].totalPrice / yearlyData[currentYear].count;
  const prevAvg = yearlyData[prevYear].totalPrice / yearlyData[prevYear].count;
  const growth = ((currentAvg - prevAvg) / prevAvg) * 100;
  growthRates[`${prevYear}-${currentYear}`] = growth;
}

console.log('\nYear-over-Year Growth Rates:');
Object.entries(growthRates).forEach(([period, growth]) => {
  console.log(`${period}: ${growth.toFixed(1)}%`);
});

// Property type evolution
const propertyTypeEvolution = {};
years.forEach(year => {
  propertyTypeEvolution[year] = {};
  yearlyData[year].properties.forEach(p => {
    const type = p.propertyType;
    if (!propertyTypeEvolution[year][type]) {
      propertyTypeEvolution[year][type] = { count: 0, totalPrice: 0 };
    }
    propertyTypeEvolution[year][type].count++;
    propertyTypeEvolution[year][type].totalPrice += p.soldPrice;
  });
});

console.log('\nProperty Type Evolution:');
years.forEach(year => {
  console.log(`\n${year}:`);
  Object.entries(propertyTypeEvolution[year])
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .forEach(([type, data]) => {
      const avgPrice = data.totalPrice / data.count;
      const percentage = (data.count / yearlyData[year].count * 100).toFixed(1);
      console.log(`  ${type}: €${avgPrice.toLocaleString()} (${percentage}%)`);
    });
});

// Price bracket evolution
const priceBracketEvolution = {};
years.forEach(year => {
  priceBracketEvolution[year] = {
    '€0-300k': 0,
    '€300k-500k': 0,
    '€500k-700k': 0,
    '€700k-1M': 0,
    '€1M+': 0
  };

  yearlyData[year].properties.forEach(p => {
    if (p.soldPrice < 300000) priceBracketEvolution[year]['€0-300k']++;
    else if (p.soldPrice < 500000) priceBracketEvolution[year]['€300k-500k']++;
    else if (p.soldPrice < 700000) priceBracketEvolution[year]['€500k-700k']++;
    else if (p.soldPrice < 1000000) priceBracketEvolution[year]['€700k-1M']++;
    else priceBracketEvolution[year]['€1M+']++;
  });
});

console.log('\nPrice Bracket Evolution:');
years.forEach(year => {
  console.log(`\n${year}:`);
  Object.entries(priceBracketEvolution[year]).forEach(([bracket, count]) => {
    const percentage = (count / yearlyData[year].count * 100).toFixed(1);
    console.log(`  ${bracket}: ${count} (${percentage}%)`);
  });
});

// Area performance during recovery
const areaPerformance = {};
covidRecoveryProperties.forEach(p => {
  const area = p.dublinPostcode;
  const year = new Date(p.soldDate).getFullYear();

  if (!areaPerformance[area]) {
    areaPerformance[area] = {};
  }
  if (!areaPerformance[area][year]) {
    areaPerformance[area][year] = { count: 0, totalPrice: 0 };
  }
  areaPerformance[area][year].count++;
  areaPerformance[area][year].totalPrice += p.soldPrice;
});

// Calculate area growth rates 2021-2025
const areaGrowthRates = {};
Object.entries(areaPerformance).forEach(([area, yearlyStats]) => {
  const yearsPresent = Object.keys(yearlyStats).sort((a, b) => a - b);
  if (yearsPresent.includes('2021') && yearsPresent.includes('2025')) {
    const avg2021 = yearlyStats['2021'].totalPrice / yearlyStats['2021'].count;
    const avg2025 = yearlyStats['2025'].totalPrice / yearlyStats['2025'].count;
    const growth = ((avg2025 - avg2021) / avg2021) * 100;
    areaGrowthRates[area] = growth;
  }
});

console.log('\nArea Growth Rates (2021-2025):');
Object.entries(areaGrowthRates)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([area, growth]) => {
    console.log(`${area}: ${growth.toFixed(1)}%`);
  });

// Export chart data
const chartData = {
  yearlyAveragePrices: years.map(year => ({
    year,
    averagePrice: Math.round(yearlyData[year].totalPrice / yearlyData[year].count),
    transactionCount: yearlyData[year].count
  })),
  yearlyGrowthRates: Object.entries(growthRates).map(([period, growth]) => ({
    period,
    growthRate: growth.toFixed(1)
  })),
  propertyTypeEvolution: years.map(year => ({
    year,
    types: Object.entries(propertyTypeEvolution[year])
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([type, data]) => ({
        type,
        averagePrice: Math.round(data.totalPrice / data.count),
        count: data.count,
        percentage: (data.count / yearlyData[year].count * 100).toFixed(1)
      }))
  })),
  priceBracketEvolution: years.map(year => ({
    year,
    brackets: Object.entries(priceBracketEvolution[year]).map(([bracket, count]) => ({
      bracket,
      count,
      percentage: (count / yearlyData[year].count * 100).toFixed(1)
    }))
  })),
  areaGrowthRates: Object.entries(areaGrowthRates)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([area, growth]) => ({
      area,
      growthRate: growth.toFixed(1)
    }))
};

fs.writeFileSync('../dashboard/public/blog51_covid_price_changes_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('\nChart data exported to blog51_covid_price_changes_chart_data.json');
