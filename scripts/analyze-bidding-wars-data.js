const fs = require('fs');
const path = require('path');

// Read the data
const dataPath = path.join(__dirname, '../dashboard/public/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const props = data.properties.filter(p => new Date(p.soldDate) <= new Date('2025-12-31'));

console.log('=== DUBLIN BIDDING WARS ANALYSIS ===\n');

// Filter properties with over/under asking data
const biddingProps = props.filter(p =>
  p.overUnderPercent !== null &&
  p.overUnderPercent !== undefined &&
  p.dublinPostcode
);

console.log(`Total properties with bidding data: ${biddingProps.length.toLocaleString()}`);

const overAsking = biddingProps.filter(p => p.overUnderPercent > 0);
const underAsking = biddingProps.filter(p => p.overUnderPercent < 0);
const atAsking = biddingProps.filter(p => p.overUnderPercent === 0);

console.log(`\n🎯 BIDDING WAR OVERVIEW`);
console.log('=======================');
console.log(`Properties sold over asking: ${overAsking.length.toLocaleString()} (${((overAsking.length/biddingProps.length)*100).toFixed(1)}%)`);
console.log(`Properties sold under asking: ${underAsking.length.toLocaleString()} (${((underAsking.length/biddingProps.length)*100).toFixed(1)}%)`);
console.log(`Properties sold at asking: ${atAsking.length.toLocaleString()} (${((atAsking.length/biddingProps.length)*100).toFixed(1)}%)`);

const avgPremium = overAsking.length > 0 ? (overAsking.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAsking.length).toFixed(2) : '0.00';
const avgDiscount = underAsking.length > 0 ? (underAsking.reduce((sum, p) => sum + Math.abs(p.overUnderPercent), 0) / underAsking.length).toFixed(2) : '0.00';

console.log(`Average premium in bidding wars: ${avgPremium}%`);
console.log(`Average discount when under asking: ${avgDiscount}%`);

console.log('\n🏆 BIDDING WAR HOTSPOTS BY AREA');
console.log('===============================');

// Analyze bidding wars by area
const areaBidding = {};
biddingProps.forEach(p => {
  if (!areaBidding[p.dublinPostcode]) {
    areaBidding[p.dublinPostcode] = { total: 0, over: 0, under: 0, totalPremium: 0, totalDiscount: 0 };
  }
  areaBidding[p.dublinPostcode].total++;
  if (p.overUnderPercent > 0) {
    areaBidding[p.dublinPostcode].over++;
    areaBidding[p.dublinPostcode].totalPremium += p.overUnderPercent;
  } else if (p.overUnderPercent < 0) {
    areaBidding[p.dublinPostcode].under++;
    areaBidding[p.dublinPostcode].totalDiscount += Math.abs(p.overUnderPercent);
  }
});

const areaResults = Object.entries(areaBidding)
  .filter(([code, data]) => data.total >= 100) // Minimum sample size
  .map(([code, data]) => ({
    code,
    total: data.total,
    overRate: ((data.over / data.total) * 100).toFixed(1),
    underRate: ((data.under / data.total) * 100).toFixed(1),
    avgPremium: data.over > 0 ? (data.totalPremium / data.over).toFixed(2) : '0.00',
    avgDiscount: data.under > 0 ? (data.totalDiscount / data.under).toFixed(2) : '0.00',
    netCompetition: ((data.over - data.under) / data.total * 100).toFixed(1) // Net bidding war intensity
  }))
  .sort((a, b) => parseFloat(b.overRate) - parseFloat(a.overRate));

console.log('| Area | Properties | Over Asking | Under Asking | Avg Premium | Net Competition |');
console.log('|------|------------|-------------|--------------|-------------|-----------------|');
areaResults.slice(0, 15).forEach(area => {
  console.log(`| ${area.code} | ${area.total.toLocaleString()} | ${area.overRate}% | ${area.underRate}% | ${area.avgPremium}% | ${area.netCompetition}% |`);
});

console.log('\n📊 PROPERTY TYPES IN BIDDING WARS');
console.log('=================================');

// Analyze bidding wars by property type
const typeBidding = {};
biddingProps.forEach(p => {
  if (!typeBidding[p.propertyType]) {
    typeBidding[p.propertyType] = { total: 0, over: 0, under: 0, totalPremium: 0 };
  }
  typeBidding[p.propertyType].total++;
  if (p.overUnderPercent > 0) {
    typeBidding[p.propertyType].over++;
    typeBidding[p.propertyType].totalPremium += p.overUnderPercent;
  } else if (p.overUnderPercent < 0) {
    typeBidding[p.propertyType].under++;
  }
});

const typeResults = Object.entries(typeBidding)
  .filter(([type, data]) => data.total >= 50)
  .map(([type, data]) => ({
    type,
    total: data.total,
    overRate: ((data.over / data.total) * 100).toFixed(1),
    underRate: ((data.under / data.total) * 100).toFixed(1),
    avgPremium: data.over > 0 ? (data.totalPremium / data.over).toFixed(2) : '0.00',
    competitionIndex: ((data.over - data.under) / data.total * 100).toFixed(1)
  }))
  .sort((a, b) => parseFloat(b.competitionIndex) - parseFloat(a.competitionIndex));

console.log('| Property Type | Properties | Over Rate | Under Rate | Avg Premium | Competition Index |');
console.log('|---------------|------------|-----------|------------|-------------|-------------------|');
typeResults.forEach(type => {
  console.log(`| ${type.type} | ${type.total.toLocaleString()} | ${type.overRate}% | ${type.underRate}% | ${type.avgPremium}% | ${type.competitionIndex} |`);
});

console.log('\n💰 PRICE BRACKETS & BIDDING INTENSITY');
console.log('====================================');

// Analyze bidding wars by price brackets
const priceBrackets = [
  { name: 'Under €300k', min: 0, max: 300000 },
  { name: '€300k-€400k', min: 300000, max: 400000 },
  { name: '€400k-€500k', min: 400000, max: 500000 },
  { name: '€500k-€600k', min: 500000, max: 600000 },
  { name: '€600k-€700k', min: 600000, max: 700000 },
  { name: '€700k-€900k', min: 700000, max: 900000 },
  { name: 'Over €900k', min: 900000, max: Infinity }
];

const bracketResults = priceBrackets.map(bracket => {
  const bracketProps = biddingProps.filter(p => p.soldPrice >= bracket.min && p.soldPrice < bracket.max);
  if (bracketProps.length < 50) return null;

  const overProps = bracketProps.filter(p => p.overUnderPercent > 0);
  const underProps = bracketProps.filter(p => p.overUnderPercent < 0);
  const overRate = ((overProps.length / bracketProps.length) * 100).toFixed(1);
  const underRate = ((underProps.length / bracketProps.length) * 100).toFixed(1);
  const avgPremium = overProps.length > 0 ? (overProps.reduce((sum, p) => sum + p.overUnderPercent, 0) / overProps.length).toFixed(2) : '0.00';

  return {
    bracket: bracket.name,
    total: bracketProps.length,
    overRate,
    underRate,
    avgPremium,
    competitionLevel: ((overProps.length - underProps.length) / bracketProps.length * 100).toFixed(1)
  };
}).filter(Boolean);

console.log('| Price Bracket | Properties | Over Rate | Under Rate | Avg Premium | Competition Level |');
console.log('|---------------|------------|-----------|------------|-------------|-------------------|');
bracketResults.forEach(bracket => {
  console.log(`| ${bracket.bracket} | ${bracket.total.toLocaleString()} | ${bracket.overRate}% | ${bracket.underRate}% | ${bracket.avgPremium}% | ${bracket.competitionLevel} |`);
});

console.log('\n📈 BIDDING WAR PREMIUM DISTRIBUTION');
console.log('===================================');

// Analyze premium distribution for bidding wars
const premiumRanges = [
  { range: '0-5%', min: 0, max: 5, label: 'Mild Competition' },
  { range: '5-10%', min: 5, max: 10, label: 'Moderate Competition' },
  { range: '10-15%', min: 10, max: 15, label: 'Strong Competition' },
  { range: '15-20%', min: 15, max: 20, label: 'Intense Competition' },
  { range: '20%+', min: 20, max: Infinity, label: 'Extreme Competition' }
];

const premiumAnalysis = premiumRanges.map(range => {
  const rangeProps = overAsking.filter(p => p.overUnderPercent >= range.min && p.overUnderPercent < range.max);
  return {
    range: range.range,
    label: range.label,
    count: rangeProps.length,
    percentage: ((rangeProps.length / overAsking.length) * 100).toFixed(1),
    avgPremium: rangeProps.length > 0 ? (rangeProps.reduce((sum, p) => sum + p.overUnderPercent, 0) / rangeProps.length).toFixed(2) : '0.00'
  };
});

console.log('| Competition Level | Properties | Percentage | Avg Premium |');
console.log('|-------------------|------------|------------|-------------|');
premiumAnalysis.forEach(range => {
  console.log(`| ${range.label} | ${range.count.toLocaleString()} | ${range.percentage}% | ${range.avgPremium}% |`);
});

console.log('\n🏘️ UNDER-ASKING ANALYSIS (Areas to Avoid Bidding Wars)');
console.log('====================================================');

// Areas with highest under-asking rates
const underAskingAreas = Object.entries(areaBidding)
  .filter(([code, data]) => data.total >= 100)
  .map(([code, data]) => ({
    code,
    total: data.total,
    underRate: ((data.under / data.total) * 100).toFixed(1),
    avgDiscount: data.under > 0 ? (data.totalDiscount / data.under).toFixed(2) : '0.00'
  }))
  .sort((a, b) => parseFloat(b.underRate) - parseFloat(a.underRate))
  .slice(0, 10);

console.log('| Area | Properties | Under Asking Rate | Avg Discount |');
console.log('|------|------------|-------------------|--------------|');
underAskingAreas.forEach(area => {
  console.log(`| ${area.code} | ${area.total.toLocaleString()} | ${area.underRate}% | ${area.avgDiscount}% |`);
});

console.log('\n🎯 BIDDING WAR INSIGHTS');
console.log('=======================');

// Calculate key bidding war statistics
const topBiddingArea = areaResults[0];
const worstBiddingArea = areaResults[areaResults.length - 1];
const topPropertyType = typeResults[0];
const mostCompetitiveBracket = bracketResults.reduce((max, curr) =>
  parseFloat(curr.competitionLevel) > parseFloat(max.competitionLevel) ? curr : max
);

console.log(`Top bidding war area: ${topBiddingArea.code} (${topBiddingArea.overRate}% over-asking, ${topBiddingArea.avgPremium}% premium)`);
console.log(`Lowest competition area: ${worstBiddingArea.code} (${worstBiddingArea.overRate}% over-asking)`);
console.log(`Most competitive property type: ${topPropertyType.type} (Competition Index: ${topPropertyType.competitionIndex})`);
console.log(`Most competitive price bracket: ${mostCompetitiveBracket.bracket} (Level: ${mostCompetitiveBracket.competitionLevel})`);

// Generate chart data for visualization
const chartData = {
  areaBiddingWars: areaResults.slice(0, 10).map(area => ({
    area: area.code,
    overRate: parseFloat(area.overRate),
    underRate: parseFloat(area.underRate),
    avgPremium: parseFloat(area.avgPremium),
    netCompetition: parseFloat(area.netCompetition)
  })),
  propertyTypeCompetition: typeResults.slice(0, 8).map(type => ({
    type: type.type,
    overRate: parseFloat(type.overRate),
    competitionIndex: parseFloat(type.competitionIndex),
    avgPremium: parseFloat(type.avgPremium)
  })),
  priceBracketCompetition: bracketResults.map(bracket => ({
    bracket: bracket.bracket,
    overRate: parseFloat(bracket.overRate),
    underRate: parseFloat(bracket.underRate),
    competitionLevel: parseFloat(bracket.competitionLevel)
  })),
  premiumDistribution: premiumAnalysis.map(range => ({
    range: range.range,
    label: range.label,
    count: range.count,
    percentage: parseFloat(range.percentage),
    avgPremium: parseFloat(range.avgPremium)
  })),
  underAskingAreas: underAskingAreas.slice(0, 8).map(area => ({
    area: area.code,
    underRate: parseFloat(area.underRate),
    avgDiscount: parseFloat(area.avgDiscount)
  }))
};

// Save chart data for blog
const outputPath = path.join(__dirname, '../blogs/blog15_bidding_wars_chart_data.json');
fs.writeFileSync(outputPath, JSON.stringify(chartData, null, 2));
console.log(`\n📈 Chart data saved to: ${outputPath}`);

console.log('\n✅ BIDDING WARS ANALYSIS COMPLETE');
console.log('Key insights:');
console.log(`• ${((overAsking.length/biddingProps.length)*100).toFixed(1)}% of Dublin properties experience bidding wars`);
console.log(`• Top bidding war areas: ${areaResults.slice(0, 3).map(a => `${a.code} (${a.overRate}%)`).join(', ')}`);
console.log(`• Areas with least competition: ${areaResults.slice(-3).map(a => `${a.code} (${a.overRate}%)`).join(', ')}`);
console.log(`• Most competitive property types: ${typeResults.slice(0, 3).map(t => `${t.type} (${t.competitionIndex})`).join(', ')}`);
console.log(`• Competition peaks in ${mostCompetitiveBracket.bracket} bracket`);
console.log(`• Average bidding war premium: ${avgPremium}%`);
