const fs = require('fs');

// Load the property data
const data = JSON.parse(fs.readFileSync('dashboard/public/data.json', 'utf8'));

// Filter for valid 2024-2025 transactions only (exclude future dates)
const validProperties = data.properties.filter(property => {
  const soldDate = new Date(property.soldDate);
  const year = soldDate.getFullYear();
  return year >= 2024 && year <= 2025 && property.dublinPostcode;
});

// Remove outliers (properties with unrealistic price per sqm)
const validPriceProperties = validProperties.filter(property => {
  const pricePerSqm = property.pricePerSqm;
  return pricePerSqm > 1000 && pricePerSqm < 15000; // Remove obvious data errors
});

// Analysis: Size Efficiency - How efficiently space is used
// Calculate space utilization metrics
const sizeEfficiencyData = validPriceProperties.map(property => {
  const efficiencyRatio = property.beds / property.areaSqm; // bedrooms per sqm
  const bathroomRatio = property.baths / property.areaSqm; // bathrooms per sqm
  const priceEfficiency = property.pricePerSqm; // price per sqm

  return {
    ...property,
    efficiencyRatio,
    bathroomRatio,
    priceEfficiency,
    sizeCategory: property.areaSqm < 80 ? 'Small' :
                  property.areaSqm < 120 ? 'Medium' :
                  property.areaSqm < 160 ? 'Large' : 'Extra Large'
  };
});

// Group by size category and calculate averages
const sizeCategoryStats = {};
sizeEfficiencyData.forEach(property => {
  const category = property.sizeCategory;
  if (!sizeCategoryStats[category]) {
    sizeCategoryStats[category] = {
      count: 0,
      totalPricePerSqm: 0,
      totalEfficiencyRatio: 0,
      totalBathroomRatio: 0,
      totalOverUnder: 0,
      prices: []
    };
  }

  sizeCategoryStats[category].count++;
  sizeCategoryStats[category].totalPricePerSqm += property.pricePerSqm;
  sizeCategoryStats[category].totalEfficiencyRatio += property.efficiencyRatio;
  sizeCategoryStats[category].totalBathroomRatio += property.bathroomRatio;
  sizeCategoryStats[category].totalOverUnder += property.overUnderPercent;
  sizeCategoryStats[category].prices.push(property.soldPrice);
});

// Calculate averages and insights
const sizeInsights = Object.keys(sizeCategoryStats).map(category => {
  const stats = sizeCategoryStats[category];
  const avgPricePerSqm = Math.round(stats.totalPricePerSqm / stats.count);
  const avgEfficiencyRatio = (stats.totalEfficiencyRatio / stats.count).toFixed(4);
  const avgBathroomRatio = (stats.totalBathroomRatio / stats.count).toFixed(4);
  const avgOverUnder = (stats.totalOverUnder / stats.count).toFixed(2);
  const medianPrice = stats.prices.sort((a,b) => a-b)[Math.floor(stats.prices.length/2)];

  return {
    category,
    count: stats.count,
    avgPricePerSqm,
    avgEfficiencyRatio,
    avgBathroomRatio,
    avgOverUnder: parseFloat(avgOverUnder),
    medianPrice
  };
});

// Sort by efficiency ratio to show most efficient properties
sizeInsights.sort((a,b) => b.avgEfficiencyRatio - a.avgEfficiencyRatio);

// Analysis: Correlation between space efficiency and pricing
const correlationData = sizeEfficiencyData.map(p => ({
  efficiency: p.efficiencyRatio,
  pricePerSqm: p.pricePerSqm,
  overUnderPercent: p.overUnderPercent
}));

// Calculate correlation coefficient between efficiency and price per sqm
const n = correlationData.length;
const sumX = correlationData.reduce((sum, p) => sum + p.efficiency, 0);
const sumY = correlationData.reduce((sum, p) => sum + p.pricePerSqm, 0);
const sumXY = correlationData.reduce((sum, p) => sum + p.efficiency * p.pricePerSqm, 0);
const sumX2 = correlationData.reduce((sum, p) => sum + p.efficiency * p.efficiency, 0);
const sumY2 = correlationData.reduce((sum, p) => sum + p.pricePerSqm * p.pricePerSqm, 0);

const correlation = (n * sumXY - sumX * sumY) /
                   Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

// Top 10 most space-efficient properties (highest bedrooms per sqm)
const mostEfficient = sizeEfficiencyData
  .filter(p => p.beds >= 2) // Only consider properties with at least 2 bedrooms
  .sort((a,b) => b.efficiencyRatio - a.efficiencyRatio)
  .slice(0, 10);

// Top 10 least space-efficient properties (lowest bedrooms per sqm)
const leastEfficient = sizeEfficiencyData
  .filter(p => p.beds >= 2)
  .sort((a,b) => a.efficiencyRatio - b.efficiencyRatio)
  .slice(0, 10);

// Group by postcode to see geographic efficiency patterns
const postcodeEfficiency = {};
sizeEfficiencyData.forEach(property => {
  const postcode = property.dublinPostcode;
  if (!postcodeEfficiency[postcode]) {
    postcodeEfficiency[postcode] = {
      count: 0,
      totalEfficiency: 0,
      totalPricePerSqm: 0,
      properties: []
    };
  }
  postcodeEfficiency[postcode].count++;
  postcodeEfficiency[postcode].totalEfficiency += property.efficiencyRatio;
  postcodeEfficiency[postcode].totalPricePerSqm += property.pricePerSqm;
  postcodeEfficiency[postcode].properties.push(property);
});

// Calculate average efficiency by postcode (minimum 20 properties for statistical significance)
const postcodeStats = Object.keys(postcodeEfficiency)
  .filter(postcode => postcodeEfficiency[postcode].count >= 20)
  .map(postcode => ({
    postcode,
    count: postcodeEfficiency[postcode].count,
    avgEfficiency: (postcodeEfficiency[postcode].totalEfficiency / postcodeEfficiency[postcode].count).toFixed(4),
    avgPricePerSqm: Math.round(postcodeEfficiency[postcode].totalPricePerSqm / postcodeEfficiency[postcode].count)
  }))
  .sort((a,b) => parseFloat(b.avgEfficiency) - parseFloat(a.avgEfficiency));

// Chart data for size efficiency analysis
const chartData = {
  SizeEfficiencyChart: sizeInsights.map(item => ({
    category: item.category,
    avgPricePerSqm: item.avgPricePerSqm,
    avgEfficiencyRatio: parseFloat(item.avgEfficiencyRatio),
    count: item.count
  })),

  EfficiencyVsPriceChart: correlationData
    .filter((_, index) => index % 10 === 0) // Sample every 10th point for chart readability
    .map(p => ({
      efficiency: p.efficiency,
      pricePerSqm: p.pricePerSqm
    })),

  PostcodeEfficiencyChart: postcodeStats.slice(0, 10).map(item => ({
    postcode: item.postcode,
    avgEfficiency: parseFloat(item.avgEfficiency),
    avgPricePerSqm: item.avgPricePerSqm
  }))
};

// Export chart data
fs.writeFileSync('blog6_size_efficiency_chart_data.json', JSON.stringify(chartData, null, 2));

// Generate markdown tables for blog content
function generateSizeEfficiencyTable() {
  const table = [
    '| Size Category | Properties | Avg Price/㎡ | Bedrooms/㎡ | Over-asking % |',
    '|--------------|------------|-------------|-------------|---------------|'
  ];

  sizeInsights.forEach(item => {
    table.push(`| ${item.category} | ${item.count.toLocaleString()} | €${item.avgPricePerSqm.toLocaleString()} | ${item.avgEfficiencyRatio} | ${item.avgOverUnder}% |`);
  });

  return table.join('\n');
}

function generatePostcodeEfficiencyTable() {
  const table = [
    '| Postcode | Properties | Avg Bedrooms/㎡ | Avg Price/㎡ |',
    '|----------|------------|-----------------|-------------|'
  ];

  postcodeStats.slice(0, 8).forEach(item => {
    table.push(`| ${item.postcode} | ${item.count} | ${item.avgEfficiency} | €${item.avgPricePerSqm.toLocaleString()} |`);
  });

  return table.join('\n');
}

// Console output for key insights
console.log('=== SIZE EFFICIENCY ANALYSIS RESULTS ===');
console.log(`Total valid properties analyzed: ${validPriceProperties.length.toLocaleString()}`);
console.log(`Correlation between space efficiency and price/㎡: ${correlation.toFixed(3)}`);
console.log('\nSize Category Analysis:');
sizeInsights.forEach(item => {
  console.log(`${item.category}: ${item.count} properties, €${item.avgPricePerSqm}/㎡, ${item.avgEfficiencyRatio} beds/㎡`);
});

console.log('\nTop 5 Most Space-Efficient Postcodes:');
postcodeStats.slice(0, 5).forEach(item => {
  console.log(`${item.postcode}: ${item.avgEfficiency} beds/㎡, €${item.avgPricePerSqm}/㎡`);
});

console.log('\n=== BLOG CONTENT TABLES ===');
console.log('\nSize Efficiency Table:');
console.log(generateSizeEfficiencyTable());

console.log('\nPostcode Efficiency Table:');
console.log(generatePostcodeEfficiencyTable());

// Key insights summary
const keyInsights = {
  totalProperties: validPriceProperties.length,
  correlation: correlation.toFixed(3),
  mostEfficientPostcode: postcodeStats[0],
  leastEfficientPostcode: postcodeStats[postcodeStats.length - 1],
  sizeEfficiencyTable: generateSizeEfficiencyTable(),
  postcodeEfficiencyTable: generatePostcodeEfficiencyTable(),
  chartData
};

console.log('\n=== KEY INSIGHTS FOR BLOG ===');
console.log(JSON.stringify(keyInsights, null, 2));
