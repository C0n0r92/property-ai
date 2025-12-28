const fs = require('fs');
const path = require('path');

// Read the data
const dataPath = path.join(__dirname, '../dashboard/public/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const props = data.properties.filter(p => new Date(p.soldDate) <= new Date('2025-12-31'));

console.log('=== BLOG 2: €250K-€350K BRACKET ANALYSIS ===\n');

// Filter properties in the €250k-€350k bracket
const bracketProps = props.filter(p =>
  p.soldPrice >= 250000 &&
  p.soldPrice < 350000 &&
  p.dublinPostcode
);

console.log('📊 €250K-€350K BRACKET MARKET ANALYSIS');
console.log('======================================');

console.log(`Total properties in bracket: ${bracketProps.length.toLocaleString()}`);
console.log(`Percentage of Dublin market: ${((bracketProps.length / props.filter(p => p.dublinPostcode).length) * 100).toFixed(1)}%`);

console.log('\n🏠 PROPERTY TYPE DISTRIBUTION');
console.log('==============================');

// Analyze property types
const typeAnalysis = {};
bracketProps.forEach(p => {
  if (!typeAnalysis[p.propertyType]) {
    typeAnalysis[p.propertyType] = { count: 0, totalValue: 0 };
  }
  typeAnalysis[p.propertyType].count++;
  typeAnalysis[p.propertyType].totalValue += p.soldPrice;
});

const typeResults = Object.entries(typeAnalysis)
  .map(([type, data]) => ({
    type,
    count: data.count,
    percentage: ((data.count / bracketProps.length) * 100).toFixed(1),
    avgPrice: Math.round(data.totalValue / data.count)
  }))
  .sort((a, b) => b.count - a.count);

console.log('| Property Type | Properties | Percentage | Avg Price |');
console.log('|---------------|------------|------------|-----------|');
typeResults.forEach(type => {
  console.log(`| ${type.type} | ${type.count.toLocaleString()} | ${type.percentage}% | €${type.avgPrice.toLocaleString()} |`);
});

console.log('\n🏆 TOP AREAS BY TRANSACTION VOLUME');
console.log('==================================');

// Analyze by Dublin postcode
const areaAnalysis = {};
bracketProps.forEach(p => {
  if (!areaAnalysis[p.dublinPostcode]) {
    areaAnalysis[p.dublinPostcode] = { count: 0, totalValue: 0 };
  }
  areaAnalysis[p.dublinPostcode].count++;
  areaAnalysis[p.dublinPostcode].totalValue += p.soldPrice;
});

const topAreas = Object.entries(areaAnalysis)
  .filter(([code, data]) => data.count >= 50) // Minimum sample size
  .map(([code, data]) => ({
    code,
    count: data.count,
    avgPrice: Math.round(data.totalValue / data.count)
  }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 15);

console.log('| Area | Properties | Avg Price |');
console.log('|------|------------|-----------|');
topAreas.forEach(area => {
  console.log(`| ${area.code} | ${area.count.toLocaleString()} | €${area.avgPrice.toLocaleString()} |`);
});

console.log('\n🛏️  BEDROOM DISTRIBUTION');
console.log('=======================');

// Analyze bedroom distribution
const bedroomAnalysis = {};
bracketProps.forEach(p => {
  const beds = p.beds || 'Unknown';
  if (!bedroomAnalysis[beds]) {
    bedroomAnalysis[beds] = { count: 0, totalValue: 0 };
  }
  bedroomAnalysis[beds].count++;
  bedroomAnalysis[beds].totalValue += p.soldPrice;
});

const bedroomResults = Object.entries(bedroomAnalysis)
  .map(([beds, data]) => ({
    beds,
    count: data.count,
    percentage: ((data.count / bracketProps.length) * 100).toFixed(1),
    avgPrice: Math.round(data.totalValue / data.count)
  }))
  .sort((a, b) => parseInt(a.beds) - parseInt(b.beds));

console.log('| Bedrooms | Properties | Percentage | Avg Price |');
console.log('|----------|------------|------------|-----------|');
bedroomResults.forEach(bed => {
  console.log(`| ${bed.beds} | ${bed.count.toLocaleString()} | ${bed.percentage}% | €${bed.avgPrice.toLocaleString()} |`);
});

console.log('\n💰 PRICE DISTRIBUTION WITHIN BRACKET');
console.log('====================================');

// Analyze price distribution within bracket
const priceRanges = [
  { name: '€250k-€275k', min: 250000, max: 275000 },
  { name: '€275k-€300k', min: 275000, max: 300000 },
  { name: '€300k-€325k', min: 300000, max: 325000 },
  { name: '€325k-€350k', min: 325000, max: 350000 }
];

const priceAnalysis = priceRanges.map(range => {
  const rangeProps = bracketProps.filter(p => p.soldPrice >= range.min && p.soldPrice < range.max);
  return {
    range: range.name,
    count: rangeProps.length,
    percentage: ((rangeProps.length / bracketProps.length) * 100).toFixed(1),
    avgPrice: rangeProps.length > 0 ? Math.round(rangeProps.reduce((sum, p) => sum + p.soldPrice, 0) / rangeProps.length) : 0
  };
});

console.log('| Price Range | Properties | Percentage | Avg Price |');
console.log('|-------------|------------|------------|-----------|');
priceAnalysis.forEach(range => {
  console.log(`| ${range.range} | ${range.count.toLocaleString()} | ${range.percentage}% | €${range.avgPrice.toLocaleString()} |`);
});

console.log('\n📈 OVER-ASKING PERFORMANCE IN BRACKET');
console.log('=====================================');

// Analyze over-asking performance
const overAskingProps = bracketProps.filter(p => p.overUnderPercent !== null && p.overUnderPercent > 0);
const overAskingRate = ((overAskingProps.length / bracketProps.length) * 100).toFixed(1);
const avgPremium = overAskingProps.length > 0 ? (overAskingProps.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAskingProps.length).toFixed(2) : '0.00';

console.log(`Properties sold over asking: ${overAskingProps.length.toLocaleString()} (${overAskingRate}%)`);
console.log(`Average premium: ${avgPremium}%`);

// Analyze by property type over-asking
const typeOverAsking = {};
bracketProps.forEach(p => {
  if (!typeOverAsking[p.propertyType]) {
    typeOverAsking[p.propertyType] = { total: 0, over: 0 };
  }
  typeOverAsking[p.propertyType].total++;
  if (p.overUnderPercent > 0) typeOverAsking[p.propertyType].over++;
});

const typeOverResults = Object.entries(typeOverAsking)
  .filter(([type, data]) => data.total >= 20)
  .map(([type, data]) => ({
    type,
    overRate: ((data.over / data.total) * 100).toFixed(1),
    avgPremium: bracketProps.filter(p => p.propertyType === type && p.overUnderPercent > 0).reduce((sum, p) => sum + p.overUnderPercent, 0) /
               Math.max(1, bracketProps.filter(p => p.propertyType === type && p.overUnderPercent > 0).length)
  }))
  .map(item => ({ ...item, avgPremium: item.avgPremium.toFixed(2) }))
  .sort((a, b) => parseFloat(b.overRate) - parseFloat(a.overRate));

console.log('\nProperty Type Over-Asking Performance:');
console.log('| Property Type | Over-Asking Rate | Avg Premium |');
console.log('|---------------|------------------|-------------|');
typeOverResults.forEach(type => {
  console.log(`| ${type.type} | ${type.overRate}% | ${type.avgPremium}% |`);
});

// Generate chart data for visualization
const chartData = {
  propertyTypeDistribution: typeResults.map(type => ({
    type: type.type,
    count: type.count,
    percentage: parseFloat(type.percentage),
    avgPrice: type.avgPrice
  })),
  topAreas: topAreas.slice(0, 10).map(area => ({
    area: area.code,
    count: area.count,
    avgPrice: area.avgPrice
  })),
  bedroomDistribution: bedroomResults.map(bed => ({
    bedrooms: bed.beds,
    count: bed.count,
    percentage: parseFloat(bed.percentage),
    avgPrice: bed.avgPrice
  })),
  priceDistribution: priceAnalysis.map(range => ({
    range: range.range,
    count: range.count,
    percentage: parseFloat(range.percentage),
    avgPrice: range.avgPrice
  })),
  overAskingByType: typeOverResults.map(type => ({
    type: type.type,
    overRate: parseFloat(type.overRate),
    avgPremium: parseFloat(type.avgPremium)
  }))
};

// Save chart data for blog
const outputPath = path.join(__dirname, '../blogs/blog2_250k_350k_bracket_chart_data.json');
fs.writeFileSync(outputPath, JSON.stringify(chartData, null, 2));
console.log(`\n📈 Chart data saved to: ${outputPath}`);

console.log('\n✅ BLOG 2 ANALYSIS COMPLETE');
console.log('Key insights:');
console.log(`• ${bracketProps.length.toLocaleString()} properties in €250k-€350k bracket`);
console.log(`• Apartments dominate: ${typeResults[0]?.percentage}% of market`);
console.log(`• Top areas: ${topAreas.slice(0, 3).map(a => `${a.code} (${a.count} props)`).join(', ')}`);
console.log(`• 2-bedrooms most popular: ${bedroomResults.find(b => b.beds === '2')?.percentage}%`);
console.log(`• Over-asking rate: ${overAskingRate}% with ${avgPremium}% average premium`);
