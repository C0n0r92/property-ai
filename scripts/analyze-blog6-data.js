const fs = require('fs');
const path = require('path');

// Read the data
const dataPath = path.join(__dirname, '../dashboard/public/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const props = data.properties.filter(p => new Date(p.soldDate) <= new Date('2025-12-31'));

console.log('=== BLOG 6: SPACE EFFICIENCY PARADOX ANALYSIS ===\n');

// Filter properties with area data and valid bedrooms (filter out obviously corrupted data)
const propsWithArea = props.filter(p =>
  p.areaSqm &&
  p.areaSqm > 0 &&
  p.areaSqm < 1000 && // Filter out obviously wrong area data
  p.beds &&
  p.beds > 0 &&
  p.beds < 20 && // Filter out obviously corrupted bedroom data
  p.dublinPostcode
);

console.log(`Total properties with area and bedroom data: ${propsWithArea.length.toLocaleString()}`);

console.log('\n📐 SPACE EFFICIENCY ANALYSIS');
console.log('============================');

// Define size categories
const sizeCategories = [
  { name: 'Small', min: 0, max: 80 },
  { name: 'Medium', min: 80, max: 120 },
  { name: 'Large', min: 120, max: 160 },
  { name: 'Extra Large', min: 160, max: Infinity }
];

// Calculate efficiency metrics for each category
const categoryAnalysis = sizeCategories.map(category => {
  const categoryProps = propsWithArea.filter(p => p.areaSqm >= category.min && p.areaSqm < category.max);

  if (categoryProps.length < 10) return null;

  const avgSqm = categoryProps.reduce((sum, p) => sum + p.areaSqm, 0) / categoryProps.length;
  const avgBeds = categoryProps.reduce((sum, p) => sum + p.beds, 0) / categoryProps.length;
  const avgPrice = categoryProps.reduce((sum, p) => sum + p.soldPrice, 0) / categoryProps.length;
  const avgPricePerSqm = avgPrice / avgSqm;

  // Efficiency metrics - lower sqm per bedroom = more efficient
  const sqmPerBedroom = avgSqm / avgBeds;
  const bedroomsPerSqm = avgBeds / avgSqm; // This should be a small decimal, not > 1

  // Over-asking rate
  const overAskingProps = categoryProps.filter(p => p.overUnderPercent > 0);
  const overRate = ((overAskingProps.length / categoryProps.length) * 100).toFixed(1);

  return {
    category: category.name,
    count: categoryProps.length,
    avgSqm: Math.round(avgSqm),
    avgBeds: avgBeds.toFixed(1),
    sqmPerBedroom: sqmPerBedroom.toFixed(1),
    bedroomsPerSqm: bedroomsPerSqm.toFixed(4),
    avgPricePerSqm: Math.round(avgPricePerSqm),
    overRate: parseFloat(overRate)
  };
}).filter(Boolean);

console.log('| Size Category | Properties | Avg Size | Avg Beds | SqM/Bed | Price/㎡ | Over-asking % |');
console.log('|---------------|------------|----------|----------|---------|----------|---------------|');
categoryAnalysis.forEach(cat => {
  console.log(`| ${cat.category} | ${cat.count.toLocaleString()} | ${cat.avgSqm}㎡ | ${cat.avgBeds} | ${cat.sqmPerBedroom} | €${cat.avgPricePerSqm} | ${cat.overRate}% |`);
});

console.log('\n🏘️ GEOGRAPHIC EFFICIENCY ANALYSIS');
console.log('================================');

// Analyze efficiency by Dublin postcode
const postcodeAnalysis = {};
propsWithArea.forEach(p => {
  if (!postcodeAnalysis[p.dublinPostcode]) {
    postcodeAnalysis[p.dublinPostcode] = { count: 0, totalSqm: 0, totalBeds: 0, totalPrice: 0 };
  }
  postcodeAnalysis[p.dublinPostcode].count++;
  postcodeAnalysis[p.dublinPostcode].totalSqm += p.areaSqm;
  postcodeAnalysis[p.dublinPostcode].totalBeds += p.beds;
  postcodeAnalysis[p.dublinPostcode].totalPrice += p.soldPrice;
});

const postcodeResults = Object.entries(postcodeAnalysis)
  .filter(([code, data]) => data.count >= 50)
  .map(([code, data]) => ({
    code,
    count: data.count,
    avgSqm: Math.round(data.totalSqm / data.count),
    avgBeds: (data.totalBeds / data.count).toFixed(1),
    sqmPerBedroom: ((data.totalSqm / data.count) / (data.totalBeds / data.count)).toFixed(1),
    bedroomsPerSqm: ((data.totalBeds / data.count) / (data.totalSqm / data.count)).toFixed(4),
    avgPricePerSqm: Math.round((data.totalPrice / data.count) / (data.totalSqm / data.count))
  }))
  .sort((a, b) => parseFloat(b.bedroomsPerSqm) - parseFloat(a.bedroomsPerSqm))
  .slice(0, 10);

console.log('| Postcode | Properties | Avg Beds/㎡ | Avg SqM/Bed | Avg Price/㎡ |');
console.log('|----------|------------|-------------|-------------|-------------|');
postcodeResults.forEach(area => {
  console.log(`| ${area.code} | ${area.count.toLocaleString()} | ${area.bedroomsPerSqm} | ${area.sqmPerBedroom} | €${area.avgPricePerSqm} |`);
});

console.log('\n🎯 EFFICIENCY PARADOX INSIGHTS');
console.log('==============================');

// Calculate the paradox metrics
const smallProps = categoryAnalysis.find(c => c.category === 'Small');
const mediumProps = categoryAnalysis.find(c => c.category === 'Medium');
const largeProps = categoryAnalysis.find(c => c.category === 'Large');
const extraLargeProps = categoryAnalysis.find(c => c.category === 'Extra Large');

if (smallProps && extraLargeProps) {
  const priceVsLarge = ((smallProps.avgPricePerSqm / extraLargeProps.avgPricePerSqm - 1) * 100).toFixed(1);
  const efficiencyRatio = (parseFloat(smallProps.bedroomsPerSqm) / parseFloat(extraLargeProps.bedroomsPerSqm)).toFixed(1);
  const overAskingDiff = (smallProps.overRate - extraLargeProps.overRate).toFixed(1);

  console.log(`Space Efficiency Paradox: Smaller properties deliver ${efficiencyRatio}x more bedrooms per ㎡`);
  console.log(`Price Paradox: Despite higher efficiency, small properties are ${priceVsLarge}% ${priceVsLarge > 0 ? 'more' : 'less'} expensive per ㎡`);
  console.log(`Market Response: Small properties have ${overAskingDiff}% higher over-asking rates`);
  console.log(`Key Paradox: Higher efficiency doesn't guarantee higher prices, but does drive better market performance`);
}

// Generate chart data for visualization
const chartData = {
  sizeEfficiency: categoryAnalysis.map(cat => ({
    category: cat.category,
    avgPricePerSqm: cat.avgPricePerSqm,
    bedroomsPerSqm: parseFloat(cat.bedroomsPerSqm),
    count: cat.count,
    overRate: cat.overRate
  })),
  postcodeEfficiency: postcodeResults.slice(0, 8).map(area => ({
    postcode: area.code,
    avgEfficiency: parseFloat(area.bedroomsPerSqm),
    avgPricePerSqm: area.avgPricePerSqm,
    count: area.count
  }))
};

// Save chart data for blog
const outputPath = path.join(__dirname, '../blogs/blog6_size_efficiency_chart_data.json');
fs.writeFileSync(outputPath, JSON.stringify(chartData, null, 2));
console.log(`\n📈 Chart data saved to: ${outputPath}`);

console.log('\n✅ BLOG 6 SPACE EFFICIENCY ANALYSIS COMPLETE');
console.log('Key insights:');
console.log(`• Analyzed ${propsWithArea.length.toLocaleString()} properties with area and bedroom data`);
console.log(`• Small properties (<80㎡): ${categoryAnalysis.find(c => c.category === 'Small')?.bedroomsPerSqm || 'N/A'} bedrooms per ㎡ at €${categoryAnalysis.find(c => c.category === 'Small')?.avgPricePerSqm || 'N/A'}/㎡`);
console.log(`• Extra large properties (>160㎡): ${categoryAnalysis.find(c => c.category === 'Extra Large')?.bedroomsPerSqm || 'N/A'} bedrooms per ㎡ at €${categoryAnalysis.find(c => c.category === 'Extra Large')?.avgPricePerSqm || 'N/A'}/㎡`);
console.log(`• Paradox: Smaller properties are ${((categoryAnalysis.find(c => c.category === 'Small')?.avgPricePerSqm || 0) / (categoryAnalysis.find(c => c.category === 'Extra Large')?.avgPricePerSqm || 1) * 100 - 100).toFixed(1)}% more expensive per ㎡ but ${(parseFloat(categoryAnalysis.find(c => c.category === 'Small')?.bedroomsPerSqm || 0) / parseFloat(categoryAnalysis.find(c => c.category === 'Extra Large')?.bedroomsPerSqm || 1)).toFixed(1)}x more space-efficient`);
console.log(`• Top efficiency areas: ${postcodeResults.slice(0, 3).map(a => `${a.code} (${a.bedroomsPerSqm} beds/㎡)`).join(', ')}`);