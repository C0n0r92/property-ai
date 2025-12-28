const fs = require('fs');
const path = require('path');

// Read the data
const dataPath = path.join(__dirname, '../dashboard/public/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const props = data.properties.filter(p => new Date(p.soldDate) <= new Date('2025-12-31'));

console.log('=== BLOG 4: 3-BED SWEET SPOT ANALYSIS ===\n');

// Filter 3-bedroom properties
const threeBedProps = props.filter(p =>
  p.beds === 3 &&
  p.dublinPostcode
);

console.log('📊 3-BEDROOM PROPERTY ANALYSIS');
console.log('==============================');

console.log(`Total 3-bedroom properties analyzed: ${threeBedProps.length.toLocaleString()}`);
console.log(`Percentage of Dublin market: ${((threeBedProps.length / props.filter(p => p.dublinPostcode).length) * 100).toFixed(1)}%`);

const avgPrice = Math.round(threeBedProps.reduce((sum, p) => sum + p.soldPrice, 0) / threeBedProps.length);
const medianPrice = threeBedProps.map(p => p.soldPrice).sort((a,b) => a-b)[Math.floor(threeBedProps.length/2)];

console.log(`Average 3-bed price: €${avgPrice.toLocaleString()}`);
console.log(`Median 3-bed price: €${medianPrice.toLocaleString()}`);

console.log('\n🏠 PROPERTY TYPE BREAKDOWN');
console.log('==========================');

// Analyze property types for 3-bed properties
const typeAnalysis = {};
threeBedProps.forEach(p => {
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
    percentage: ((data.count / threeBedProps.length) * 100).toFixed(1),
    avgPrice: Math.round(data.totalValue / data.count)
  }))
  .sort((a, b) => b.count - a.count);

console.log('| Property Type | Properties | Percentage | Avg Price |');
console.log('|---------------|------------|------------|-----------|');
typeResults.forEach(type => {
  console.log(`| ${type.type} | ${type.count.toLocaleString()} | ${type.percentage}% | €${type.avgPrice.toLocaleString()} |`);
});

console.log('\n🏆 TOP AREAS FOR 3-BED PROPERTIES');
console.log('=================================');

// Analyze by Dublin postcode
const areaAnalysis = {};
threeBedProps.forEach(p => {
  if (!areaAnalysis[p.dublinPostcode]) {
    areaAnalysis[p.dublinPostcode] = { count: 0, totalValue: 0 };
  }
  areaAnalysis[p.dublinPostcode].count++;
  areaAnalysis[p.dublinPostcode].totalValue += p.soldPrice;
});

const topAreas = Object.entries(areaAnalysis)
  .filter(([code, data]) => data.count >= 50)
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

console.log('\n💰 PRICE BRACKET DISTRIBUTION');
console.log('=============================');

// Analyze price brackets for 3-bed properties
const priceBrackets = [
  { name: 'Under €400k', min: 0, max: 400000 },
  { name: '€400k-€500k', min: 400000, max: 500000 },
  { name: '€500k-€600k', min: 500000, max: 600000 },
  { name: '€600k-€700k', min: 600000, max: 700000 },
  { name: '€700k-€900k', min: 700000, max: 900000 },
  { name: 'Over €900k', min: 900000, max: Infinity }
];

const priceAnalysis = priceBrackets.map(bracket => {
  const bracketProps = threeBedProps.filter(p => p.soldPrice >= bracket.min && p.soldPrice < bracket.max);
  if (bracketProps.length < 10) return null;

  return {
    bracket: bracket.name,
    count: bracketProps.length,
    percentage: ((bracketProps.length / threeBedProps.length) * 100).toFixed(1),
    avgPrice: Math.round(bracketProps.reduce((sum, p) => sum + p.soldPrice, 0) / bracketProps.length)
  };
}).filter(Boolean);

console.log('| Price Bracket | Properties | Percentage | Avg Price |');
console.log('|---------------|------------|------------|-----------|');
priceAnalysis.forEach(bracket => {
  console.log(`| ${bracket.bracket} | ${bracket.count.toLocaleString()} | ${bracket.percentage}% | €${bracket.avgPrice.toLocaleString()} |`);
});

console.log('\n📈 OVER-ASKING PERFORMANCE FOR 3-BEDS');
console.log('====================================');

// Analyze over-asking performance for 3-bed properties
const overAskingProps = threeBedProps.filter(p => p.overUnderPercent !== null && p.overUnderPercent > 0);
const overAskingRate = ((overAskingProps.length / threeBedProps.length) * 100).toFixed(1);
const avgPremium = overAskingProps.length > 0 ? (overAskingProps.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAskingProps.length).toFixed(2) : '0.00';

console.log(`3-bed properties sold over asking: ${overAskingProps.length.toLocaleString()} (${overAskingRate}%)`);
console.log(`Average premium: ${avgPremium}%`);

// Over-asking by property type
const typeOverAsking = {};
threeBedProps.forEach(p => {
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
    avgPremium: threeBedProps.filter(p => p.propertyType === type && p.overUnderPercent > 0)
      .reduce((sum, p) => sum + p.overUnderPercent, 0) /
      Math.max(1, threeBedProps.filter(p => p.propertyType === type && p.overUnderPercent > 0).length)
  }))
  .map(item => ({ ...item, avgPremium: item.avgPremium.toFixed(2) }))
  .sort((a, b) => parseFloat(b.overRate) - parseFloat(a.overRate));

console.log('\nOver-Asking by Property Type:');
console.log('| Property Type | Over-Asking Rate | Avg Premium |');
console.log('|---------------|------------------|-------------|');
typeOverResults.forEach(type => {
  console.log(`| ${type.type} | ${type.overRate}% | ${type.avgPremium}% |`);
});

console.log('\n🏘️  AREA PERFORMANCE FOR 3-BEDS');
console.log('==============================');

// Analyze over-asking by area for 3-bed properties
const areaOverAsking = {};
threeBedProps.forEach(p => {
  if (!areaOverAsking[p.dublinPostcode]) {
    areaOverAsking[p.dublinPostcode] = { total: 0, over: 0, totalPremium: 0 };
  }
  areaOverAsking[p.dublinPostcode].total++;
  if (p.overUnderPercent > 0) {
    areaOverAsking[p.dublinPostcode].over++;
    areaOverAsking[p.dublinPostcode].totalPremium += p.overUnderPercent;
  }
});

const areaOverResults = Object.entries(areaOverAsking)
  .filter(([code, data]) => data.total >= 50)
  .map(([code, data]) => ({
    code,
    overRate: ((data.over / data.total) * 100).toFixed(1),
    avgPremium: data.over > 0 ? (data.totalPremium / data.over).toFixed(2) : '0.00',
    count: data.total
  }))
  .sort((a, b) => parseFloat(b.overRate) - parseFloat(a.overRate))
  .slice(0, 10);

console.log('| Area | Properties | Over-Asking Rate | Avg Premium |');
console.log('|------|------------|------------------|-------------|');
areaOverResults.forEach(area => {
  console.log(`| ${area.code} | ${area.count.toLocaleString()} | ${area.overRate}% | ${area.avgPremium}% |`);
});

console.log('\n🏠 INVESTMENT ANALYSIS FOR 3-BEDS');
console.log('=================================');

// Analyze yield for 3-bed properties
const yieldProps = threeBedProps.filter(p => p.yieldEstimate?.grossYield && p.yieldEstimate.grossYield > 0);
const avgYield = (yieldProps.reduce((sum, p) => sum + p.yieldEstimate.grossYield, 0) / yieldProps.length).toFixed(2);

console.log(`3-bed properties with yield data: ${yieldProps.length.toLocaleString()}`);
console.log(`Average gross yield: ${avgYield}%`);

// Yield by property type
const typeYield = {};
yieldProps.forEach(p => {
  if (!typeYield[p.propertyType]) {
    typeYield[p.propertyType] = { count: 0, totalYield: 0 };
  }
  typeYield[p.propertyType].count++;
  typeYield[p.propertyType].totalYield += p.yieldEstimate.grossYield;
});

const typeYieldResults = Object.entries(typeYield)
  .filter(([type, data]) => data.count >= 20)
  .map(([type, data]) => ({
    type,
    count: data.count,
    avgYield: (data.totalYield / data.count).toFixed(2)
  }))
  .sort((a, b) => parseFloat(b.avgYield) - parseFloat(a.avgYield));

console.log('\nYield by Property Type:');
console.log('| Property Type | Properties | Avg Yield |');
console.log('|---------------|------------|-----------|');
typeYieldResults.forEach(type => {
  console.log(`| ${type.type} | ${type.count.toLocaleString()} | ${type.avgYield}% |`);
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
  priceBrackets: priceAnalysis.map(bracket => ({
    bracket: bracket.bracket,
    count: bracket.count,
    percentage: parseFloat(bracket.percentage),
    avgPrice: bracket.avgPrice
  })),
  areaPerformance: areaOverResults.map(area => ({
    area: area.code,
    overRate: parseFloat(area.overRate),
    avgPremium: parseFloat(area.avgPremium),
    count: area.count
  })),
  typeYieldPerformance: typeYieldResults.map(type => ({
    type: type.type,
    avgYield: parseFloat(type.avgYield),
    count: type.count
  }))
};

// Save chart data for blog
const outputPath = path.join(__dirname, '../blogs/blog4_3bed_sweet_spot_chart_data.json');
fs.writeFileSync(outputPath, JSON.stringify(chartData, null, 2));
console.log(`\n📈 Chart data saved to: ${outputPath}`);

console.log('\n✅ BLOG 4 ANALYSIS COMPLETE');
console.log('Key insights:');
console.log(`• ${threeBedProps.length.toLocaleString()} 3-bedroom properties analyzed`);
console.log(`• Average price: €${avgPrice.toLocaleString()}, median: €${medianPrice.toLocaleString()}`);
console.log(`• Top property types: ${typeResults.slice(0, 3).map(t => `${t.type} (${t.percentage}%)`).join(', ')}`);
console.log(`• Top areas: ${topAreas.slice(0, 3).map(a => `${a.code} (${a.count} props)`).join(', ')}`);
console.log(`• Over-asking rate: ${overAskingRate}% with ${avgPremium}% average premium`);
console.log(`• Average yield: ${avgYield}% for investment properties`);
