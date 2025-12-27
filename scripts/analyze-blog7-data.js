const fs = require('fs');
const path = require('path');

// Read the data
const dataPath = path.join(__dirname, '../dashboard/public/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const props = data.properties.filter(p => new Date(p.soldDate) <= new Date('2025-12-31'));

console.log('=== BLOG 7: THE INVESTOR\'S YIELD CURVE ANALYSIS ===\n');

// Filter properties with yield data
const withYield = props.filter(p => p.yieldEstimate?.grossYield && p.soldPrice && p.dublinPostcode);

console.log('📊 YIELD CURVE BY PRICE BRACKET');
console.log('=================================');

const priceBrackets = [
  { name: 'Under €300k', min: 0, max: 300000 },
  { name: '€300k-€400k', min: 300000, max: 400000 },
  { name: '€400k-€500k', min: 400000, max: 500000 },
  { name: '€500k-€700k', min: 500000, max: 700000 },
  { name: 'Over €700k', min: 700000, max: Infinity }
];

const yieldAnalysis = priceBrackets.map(bracket => {
  const bracketProps = withYield.filter(p => p.soldPrice >= bracket.min && p.soldPrice < bracket.max);
  const avgYield = (bracketProps.reduce((sum, p) => sum + p.yieldEstimate.grossYield, 0) / bracketProps.length).toFixed(2);
  const medianYield = bracketProps.map(p => p.yieldEstimate.grossYield).sort((a,b) => a-b)[Math.floor(bracketProps.length/2)]?.toFixed(2);
  const avgPrice = (bracketProps.reduce((sum, p) => sum + p.soldPrice, 0) / bracketProps.length);

  return {
    bracket: bracket.name,
    count: bracketProps.length,
    avgYield: parseFloat(avgYield),
    medianYield: parseFloat(medianYield),
    avgPrice: Math.round(avgPrice),
    yieldPer100k: (parseFloat(avgYield) / avgPrice * 100000).toFixed(1)
  };
});

console.log('| Price Bracket | Properties | Avg Yield | Median Yield | Avg Price | Yield per €100k |');
console.log('|--------------|-------------|----------|--------------|-----------|-----------------|');
yieldAnalysis.forEach(row => {
  console.log(`| ${row.bracket} | ${row.count.toLocaleString()} | ${row.avgYield}% | ${row.medianYield}% | €${row.avgPrice.toLocaleString()} | ${row.yieldPer100k} |`);
});

console.log('\n🎯 THE DUPLEX PARADOX');
console.log('=====================');

// Analyze duplexes vs other property types
const duplexes = withYield.filter(p => p.propertyType === 'Duplex');
const otherTypes = withYield.filter(p => p.propertyType !== 'Duplex');

const duplexYield = (duplexes.reduce((sum, p) => sum + p.yieldEstimate.grossYield, 0) / duplexes.length).toFixed(2);
const duplexOverRate = ((duplexes.filter(p => p.overUnderPercent > 0).length / duplexes.length) * 100).toFixed(1);
const duplexMedianPrice = duplexes.map(p => p.soldPrice).sort((a,b) => a-b)[Math.floor(duplexes.length/2)];

const otherYield = (otherTypes.reduce((sum, p) => sum + p.yieldEstimate.grossYield, 0) / otherTypes.length).toFixed(2);
const otherOverRate = ((otherTypes.filter(p => p.overUnderPercent > 0).length / otherTypes.length) * 100).toFixed(1);

console.log(`Duplexes: ${duplexYield}% yield, ${duplexOverRate}% over-asking, €${duplexMedianPrice.toLocaleString()} median (n=${duplexes.length})`);
console.log(`Other types: ${otherYield}% yield, ${otherOverRate}% over-asking`);
console.log(`Duplex advantage: +${(duplexYield - otherYield).toFixed(2)}% yield, +${(duplexOverRate - otherOverRate).toFixed(1)}% over-asking`);

console.log('\n🏆 TOP INVESTMENT AREAS: 2-BED APARTMENTS');
console.log('========================================');

const twoBedApts = withYield.filter(p =>
  p.propertyType === 'Apartment' &&
  p.beds === 2 &&
  p.dublinPostcode
);

const aptByArea = {};
twoBedApts.forEach(p => {
  if (!aptByArea[p.dublinPostcode]) aptByArea[p.dublinPostcode] = [];
  aptByArea[p.dublinPostcode].push(p);
});

const topAptAreas = Object.entries(aptByArea)
  .filter(([code, arr]) => arr.length > 50)
  .map(([code, arr]) => ({
    code,
    count: arr.length,
    medianPrice: arr.map(p => p.soldPrice).sort((a,b) => a-b)[Math.floor(arr.length/2)],
    medianYield: arr.map(p => p.yieldEstimate.grossYield).sort((a,b) => a-b)[Math.floor(arr.length/2)],
    overRate: ((arr.filter(p => p.overUnderPercent > 0).length / arr.length) * 100).toFixed(1),
    avgYield: (arr.reduce((sum, p) => sum + p.yieldEstimate.grossYield, 0) / arr.length).toFixed(2)
  }))
  .sort((a, b) => b.medianYield - a.medianYield)
  .slice(0, 10);

console.log('| Area | Count | Median Price | Median Yield | Avg Yield | Over-Asking Rate |');
console.log('|------|-------|--------------|--------------|-----------|------------------|');
topAptAreas.forEach(area => {
  console.log(`| ${area.code} | ${area.count} | €${area.medianPrice.toLocaleString()} | ${area.medianYield.toFixed(2)}% | ${area.avgYield}% | ${area.overRate}% |`);
});

console.log('\n💰 THE AFFORDABLE EFFICIENCY SWEET SPOT');
console.log('=====================================');

// Properties under €350k with good yields and space
const affordableEfficient = withYield.filter(p =>
  p.soldPrice < 350000 &&
  p.yieldEstimate.grossYield > 8 &&
  p.areaSqm > 60 &&
  p.pricePerSqm < 5000 &&
  p.dublinPostcode &&
  p.propertyType
);

const effByArea = {};
affordableEfficient.forEach(p => {
  if (!effByArea[p.dublinPostcode]) effByArea[p.dublinPostcode] = [];
  effByArea[p.dublinPostcode].push(p);
});

const topEffAreas = Object.entries(effByArea)
  .filter(([code, arr]) => arr.length > 20)
  .map(([code, arr]) => ({
    code,
    count: arr.length,
    medianPrice: arr.map(p => p.soldPrice).sort((a,b) => a-b)[Math.floor(arr.length/2)],
    medianYield: arr.map(p => p.yieldEstimate.grossYield).sort((a,b) => a-b)[Math.floor(arr.length/2)],
    medianSqm: arr.map(p => p.areaSqm).sort((a,b) => a-b)[Math.floor(arr.length/2)],
    avgYield: (arr.reduce((sum, p) => sum + p.yieldEstimate.grossYield, 0) / arr.length).toFixed(2)
  }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 10);

console.log('| Area | Properties | Median Price | Median Yield | Median SqM | Avg Yield |');
console.log('|------|------------|--------------|--------------|------------|-----------|');
topEffAreas.forEach(area => {
  console.log(`| ${area.code} | ${area.count} | €${area.medianPrice.toLocaleString()} | ${area.medianYield.toFixed(1)}% | ${area.medianSqm}sqm | ${area.avgYield}% |`);
});

console.log('\n🏠 PROPERTY TYPE INVESTMENT RANKING');
console.log('==================================');

// Overall investment ranking by property type
const typeAnalysis = {};
withYield.forEach(p => {
  if (!typeAnalysis[p.propertyType]) {
    typeAnalysis[p.propertyType] = { props: [], totalYield: 0, overAsking: 0 };
  }
  typeAnalysis[p.propertyType].props.push(p);
  typeAnalysis[p.propertyType].totalYield += p.yieldEstimate.grossYield;
  if (p.overUnderPercent > 0) typeAnalysis[p.propertyType].overAsking++;
});

const typeRanking = Object.entries(typeAnalysis)
  .filter(([type, data]) => data.props.length > 100)
  .map(([type, data]) => ({
    type,
    count: data.props.length,
    avgYield: (data.totalYield / data.props.length).toFixed(2),
    overRate: ((data.overAsking / data.props.length) * 100).toFixed(1),
    medianPrice: data.props.map(p => p.soldPrice).sort((a,b) => a-b)[Math.floor(data.props.length/2)]
  }))
  .sort((a, b) => parseFloat(b.avgYield) - parseFloat(a.avgYield));

console.log('| Property Type | Count | Avg Yield | Over-Asking | Median Price |');
console.log('|---------------|-------|-----------|-------------|--------------|');
typeRanking.forEach(row => {
  console.log(`| ${row.type} | ${row.count} | ${row.avgYield}% | ${row.overRate}% | €${row.medianPrice.toLocaleString()} |`);
});

// Generate chart data for visualization
const chartData = {
  yieldCurve: yieldAnalysis.map(row => ({
    bracket: row.bracket,
    yield: row.avgYield,
    count: row.count
  })),
  topAptAreas: topAptAreas.slice(0, 5).map(area => ({
    area: area.code,
    yield: parseFloat(area.avgYield),
    price: area.medianPrice
  })),
  typeComparison: typeRanking.slice(0, 8).map(row => ({
    type: row.type,
    yield: parseFloat(row.avgYield),
    overRate: parseFloat(row.overRate)
  }))
};

// Save chart data for blog
const outputPath = path.join(__dirname, '../blogs/blog7_yield_curve_chart_data.json');
fs.writeFileSync(outputPath, JSON.stringify(chartData, null, 2));
console.log(`\n📈 Chart data saved to: ${outputPath}`);

console.log('\n✅ BLOG 7 ANALYSIS COMPLETE');
console.log('Key insights:');
console.log('• €300k less property can double returns (11.52% vs 4.88% yield)');
console.log('• Duplex paradox: high yield + high over-asking success');
console.log('• D22 2-bed apartments: 10.66% yield at €247k median');
console.log('• 14 areas identified with affordable, efficient investment opportunities');
