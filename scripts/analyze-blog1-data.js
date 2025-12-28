const fs = require('fs');
const path = require('path');

// Read the data
const dataPath = path.join(__dirname, '../dashboard/public/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const props = data.properties.filter(p => new Date(p.soldDate) <= new Date('2025-12-31'));

console.log('=== BLOG 1: ASKING PRICE STRATEGY ANALYSIS ===\n');

// Filter properties with over/under asking data
const withOverUnder = props.filter(p => p.overUnderPercent !== null && p.overUnderPercent !== undefined && p.dublinPostcode);

console.log('📊 OVER-ASKING MARKET ANALYSIS');
console.log('===============================');

const totalProps = withOverUnder.length;
const overAskingProps = withOverUnder.filter(p => p.overUnderPercent > 0);
const overAskingRate = ((overAskingProps.length / totalProps) * 100).toFixed(2);
const avgPremium = (overAskingProps.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAskingProps.length).toFixed(2);

console.log(`Total properties analyzed: ${totalProps.toLocaleString()}`);
console.log(`Properties sold over asking: ${overAskingProps.length.toLocaleString()} (${overAskingRate}%)`);
console.log(`Average premium: ${avgPremium}%`);

console.log('\n🏆 OVER-ASKING SUCCESS BY AREA');
console.log('===============================');

// Analyze by Dublin postcode
const areaAnalysis = {};
withOverUnder.forEach(p => {
  if (!areaAnalysis[p.dublinPostcode]) {
    areaAnalysis[p.dublinPostcode] = { total: 0, overAsking: 0, totalPremium: 0 };
  }
  areaAnalysis[p.dublinPostcode].total++;
  if (p.overUnderPercent > 0) {
    areaAnalysis[p.dublinPostcode].overAsking++;
    areaAnalysis[p.dublinPostcode].totalPremium += p.overUnderPercent;
  }
});

const topAreas = Object.entries(areaAnalysis)
  .filter(([code, data]) => data.total >= 100) // Minimum sample size
  .map(([code, data]) => ({
    code,
    total: data.total,
    overRate: ((data.overAsking / data.total) * 100).toFixed(1),
    avgPremium: data.overAsking > 0 ? (data.totalPremium / data.overAsking).toFixed(2) : '0.00'
  }))
  .sort((a, b) => parseFloat(b.overRate) - parseFloat(a.overRate))
  .slice(0, 15);

console.log('| Area | Properties | Over-Asking Rate | Avg Premium |');
console.log('|------|------------|------------------|-------------|');
topAreas.forEach(area => {
  console.log(`| ${area.code} | ${area.total.toLocaleString()} | ${area.overRate}% | ${area.avgPremium}% |`);
});

console.log('\n🏠 PROPERTY TYPE PERFORMANCE');
console.log('===========================');

// Analyze by property type
const typeAnalysis = {};
withOverUnder.forEach(p => {
  if (!typeAnalysis[p.propertyType]) {
    typeAnalysis[p.propertyType] = { total: 0, overAsking: 0, totalPremium: 0 };
  }
  typeAnalysis[p.propertyType].total++;
  if (p.overUnderPercent > 0) {
    typeAnalysis[p.propertyType].overAsking++;
    typeAnalysis[p.propertyType].totalPremium += p.overUnderPercent;
  }
});

const typeResults = Object.entries(typeAnalysis)
  .filter(([type, data]) => data.total >= 50)
  .map(([type, data]) => ({
    type,
    total: data.total,
    overRate: ((data.overAsking / data.total) * 100).toFixed(1),
    avgPremium: data.overAsking > 0 ? (data.totalPremium / data.overAsking).toFixed(2) : '0.00'
  }))
  .sort((a, b) => parseFloat(b.overRate) - parseFloat(a.overRate));

console.log('| Property Type | Properties | Over-Asking Rate | Avg Premium |');
console.log('|---------------|------------|------------------|-------------|');
typeResults.forEach(type => {
  console.log(`| ${type.type} | ${type.total.toLocaleString()} | ${type.overRate}% | ${type.avgPremium}% |`);
});

console.log('\n💰 PRICE BRACKET ANALYSIS');
console.log('========================');

// Analyze by price brackets
const priceBrackets = [
  { name: 'Under €300k', min: 0, max: 300000 },
  { name: '€300k-€400k', min: 300000, max: 400000 },
  { name: '€400k-€500k', min: 400000, max: 500000 },
  { name: '€500k-€600k', min: 500000, max: 600000 },
  { name: '€600k-€700k', min: 600000, max: 700000 },
  { name: 'Over €700k', min: 700000, max: Infinity }
];

const bracketAnalysis = priceBrackets.map(bracket => {
  const bracketProps = withOverUnder.filter(p => p.soldPrice >= bracket.min && p.soldPrice < bracket.max);
  if (bracketProps.length < 50) return null;

  const overAsking = bracketProps.filter(p => p.overUnderPercent > 0);
  const overRate = ((overAsking.length / bracketProps.length) * 100).toFixed(1);
  const avgPremium = overAsking.length > 0 ? (overAsking.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAsking.length).toFixed(2) : '0.00';

  return {
    bracket: bracket.name,
    total: bracketProps.length,
    overRate,
    avgPremium
  };
}).filter(Boolean);

console.log('| Price Bracket | Properties | Over-Asking Rate | Avg Premium |');
console.log('|---------------|------------|------------------|-------------|');
bracketAnalysis.forEach(bracket => {
  console.log(`| ${bracket.bracket} | ${bracket.total.toLocaleString()} | ${bracket.overRate}% | ${bracket.avgPremium}% |`);
});

console.log('\n🎯 STRATEGIC PRICING INSIGHTS');
console.log('=============================');

// Calculate optimal pricing ranges
const premiumRanges = overAskingProps.map(p => p.overUnderPercent).sort((a,b) => a-b);
const medianPremium = premiumRanges[Math.floor(premiumRanges.length / 2)].toFixed(2);
const p75Premium = premiumRanges[Math.floor(premiumRanges.length * 0.75)].toFixed(2);
const p90Premium = premiumRanges[Math.floor(premiumRanges.length * 0.9)].toFixed(2);

console.log(`Median premium when over-asking: ${medianPremium}%`);
console.log(`75th percentile premium: ${p75Premium}%`);
console.log(`90th percentile premium: ${p90Premium}%`);

// Optimal pricing strategy analysis
const optimalRange = overAskingProps.filter(p => p.overUnderPercent >= 3 && p.overUnderPercent <= 8);
const optimalRate = ((optimalRange.length / totalProps) * 100).toFixed(1);

console.log(`Properties achieving 3-8% premium: ${optimalRange.length.toLocaleString()} (${optimalRate}% of market)`);

// Generate chart data for visualization
const chartData = {
  areaPerformance: topAreas.slice(0, 10).map(area => ({
    area: area.code,
    overRate: parseFloat(area.overRate),
    avgPremium: parseFloat(area.avgPremium),
    total: area.total
  })),
  typePerformance: typeResults.map(type => ({
    type: type.type,
    overRate: parseFloat(type.overRate),
    avgPremium: parseFloat(type.avgPremium)
  })),
  priceBracketPerformance: bracketAnalysis.map(bracket => ({
    bracket: bracket.bracket,
    overRate: parseFloat(bracket.overRate),
    avgPremium: parseFloat(bracket.avgPremium)
  })),
  premiumDistribution: [
    { range: '0-2%', count: overAskingProps.filter(p => p.overUnderPercent < 2).length },
    { range: '2-5%', count: overAskingProps.filter(p => p.overUnderPercent >= 2 && p.overUnderPercent < 5).length },
    { range: '5-10%', count: overAskingProps.filter(p => p.overUnderPercent >= 5 && p.overUnderPercent < 10).length },
    { range: '10%+', count: overAskingProps.filter(p => p.overUnderPercent >= 10).length }
  ]
};

// Save chart data for blog
const outputPath = path.join(__dirname, '../blogs/blog1_asking_price_strategy_chart_data.json');
fs.writeFileSync(outputPath, JSON.stringify(chartData, null, 2));
console.log(`\n📈 Chart data saved to: ${outputPath}`);

console.log('\n✅ BLOG 1 ANALYSIS COMPLETE');
console.log('Key insights:');
console.log(`• ${overAskingRate}% of properties sell over asking price`);
console.log(`• Average premium: ${avgPremium}%`);
console.log(`• Top performing areas: ${topAreas.slice(0, 3).map(a => `${a.code} (${a.overRate}%)`).join(', ')}`);
console.log(`• Optimal pricing strategy: 3-8% below market value (${optimalRate}% success rate)`);
