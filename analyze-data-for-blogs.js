const fs = require('fs');

// Load the data
const data = JSON.parse(fs.readFileSync('./dashboard/public/data.json', 'utf8'));

console.log(`Total properties analyzed: ${data.properties.length}`);

// Analyze key trends
const analysis = {
  totalProperties: data.properties.length,
  priceRanges: {},
  propertyTypes: {},
  areas: {},
  bedrooms: {},
  priceTrends: {},
  overUnderAnalysis: {},
  sizeAnalysis: {}
};

// Price range analysis
data.properties.forEach(prop => {
  // Price brackets
  const price = prop.soldPrice;
  let bracket;
  if (price < 250000) bracket = 'Under 250k';
  else if (price < 350000) bracket = '250k-350k';
  else if (price < 500000) bracket = '350k-500k';
  else if (price < 750000) bracket = '500k-750k';
  else if (price < 1000000) bracket = '750k-1M';
  else bracket = 'Over 1M';

  analysis.priceRanges[bracket] = (analysis.priceRanges[bracket] || 0) + 1;

  // Property types
  const type = prop.propertyType;
  analysis.propertyTypes[type] = (analysis.propertyTypes[type] || 0) + 1;

  // Areas
  const area = prop.dublinPostcode;
  if (area) {
    analysis.areas[area] = (analysis.areas[area] || 0) + 1;
  }

  // Bedrooms
  const beds = prop.beds;
  if (beds && beds <= 5) {
    analysis.bedrooms[beds] = (analysis.bedrooms[beds] || 0) + 1;
  }

  // Over/under asking analysis
  if (prop.overUnderPercent !== null && prop.overUnderPercent !== undefined) {
    const overUnder = prop.overUnderPercent > 0 ? 'Over' : prop.overUnderPercent < 0 ? 'Under' : 'Exact';
    analysis.overUnderAnalysis[overUnder] = (analysis.overUnderAnalysis[overUnder] || 0) + 1;
  }

  // Size analysis
  if (prop.areaSqm && prop.pricePerSqm) {
    const size = prop.areaSqm;
    let sizeBracket;
    if (size < 50) sizeBracket = 'Under 50sqm';
    else if (size < 80) sizeBracket = '50-80sqm';
    else if (size < 120) sizeBracket = '80-120sqm';
    else if (size < 160) sizeBracket = '120-160sqm';
    else sizeBracket = 'Over 160sqm';

    if (!analysis.sizeAnalysis[sizeBracket]) {
      analysis.sizeAnalysis[sizeBracket] = { count: 0, avgPricePerSqm: 0, totalPricePerSqm: 0 };
    }
    analysis.sizeAnalysis[sizeBracket].count++;
    analysis.sizeAnalysis[sizeBracket].totalPricePerSqm += prop.pricePerSqm;
  }
});

// Calculate averages for size analysis
Object.keys(analysis.sizeAnalysis).forEach(bracket => {
  const data = analysis.sizeAnalysis[bracket];
  data.avgPricePerSqm = Math.round(data.totalPricePerSqm / data.count);
  delete data.totalPricePerSqm;
});

// Sort areas by transaction volume
const sortedAreas = Object.entries(analysis.areas)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10);

// Sort property types
const sortedTypes = Object.entries(analysis.propertyTypes)
  .sort(([,a], [,b]) => b - a);

// Calculate over-asking percentage
const overAskingPercent = analysis.overUnderAnalysis.Over ?
  ((analysis.overUnderAnalysis.Over / (analysis.overUnderAnalysis.Over + analysis.overUnderAnalysis.Under + (analysis.overUnderAnalysis.Exact || 0))) * 100).toFixed(1) : 0;

// Find property type performance
const typePerformance = {};
data.properties.forEach(prop => {
  if (!prop.overUnderPercent || !prop.propertyType) return;
  const type = prop.propertyType;
  if (!typePerformance[type]) {
    typePerformance[type] = { over: 0, under: 0, exact: 0, total: 0 };
  }
  typePerformance[type].total++;
  if (prop.overUnderPercent > 0) typePerformance[type].over++;
  else if (prop.overUnderPercent < 0) typePerformance[type].under++;
  else typePerformance[type].exact++;
});

// Calculate over-asking rates by type
Object.keys(typePerformance).forEach(type => {
  const perf = typePerformance[type];
  perf.overRate = ((perf.over / perf.total) * 100).toFixed(1);
});

// Print key insights
console.log('\n=== KEY INSIGHTS FOR BLOGS ===\n');

console.log('PRICE BRACKETS:');
Object.entries(analysis.priceRanges).sort(([,a], [,b]) => b - a).forEach(([bracket, count]) => {
  const percent = ((count / analysis.totalProperties) * 100).toFixed(1);
  console.log(`${bracket}: ${count.toLocaleString()} properties (${percent}%)`);
});

console.log('\nTOP AREAS:');
sortedAreas.forEach(([area, count]) => {
  const percent = ((count / analysis.totalProperties) * 100).toFixed(1);
  console.log(`${area}: ${count.toLocaleString()} properties (${percent}%)`);
});

console.log('\nPROPERTY TYPES:');
sortedTypes.forEach(([type, count]) => {
  const percent = ((count / analysis.totalProperties) * 100).toFixed(1);
  console.log(`${type}: ${count.toLocaleString()} properties (${percent}%)`);
});

console.log('\nOVER-ASKING ANALYSIS:');
console.log(`Properties sold over asking: ${analysis.overUnderAnalysis.Over?.toLocaleString() || 0}`);
console.log(`Properties sold under asking: ${analysis.overUnderAnalysis.Under?.toLocaleString() || 0}`);
console.log(`Properties sold at asking: ${analysis.overUnderAnalysis.Exact?.toLocaleString() || 0}`);
console.log(`Overall over-asking rate: ${overAskingPercent}%`);

console.log('\nBEDROOM DISTRIBUTION:');
Object.entries(analysis.bedrooms).sort(([a], [b]) => parseInt(a) - parseInt(b)).forEach(([beds, count]) => {
  const percent = ((count / analysis.totalProperties) * 100).toFixed(1);
  console.log(`${beds} bed: ${count.toLocaleString()} properties (${percent}%)`);
});

console.log('\nSIZE ANALYSIS (€/sqm):');
Object.entries(analysis.sizeAnalysis).forEach(([bracket, data]) => {
  console.log(`${bracket}: €${data.avgPricePerSqm}/sqm (${data.count} properties)`);
});

console.log('\nOVER-ASKING BY PROPERTY TYPE:');
Object.entries(typePerformance).sort(([,a], [,b]) => parseFloat(b.overRate) - parseFloat(a.overRate)).forEach(([type, perf]) => {
  console.log(`${type}: ${perf.overRate}% over-asking rate (${perf.total} properties)`);
});

// Save detailed analysis for blog writing
fs.writeFileSync('./blog-analysis.json', JSON.stringify({
  analysis,
  typePerformance,
  sortedAreas,
  sortedTypes,
  overAskingPercent: parseFloat(overAskingPercent)
}, null, 2));

console.log('\nDetailed analysis saved to blog-analysis.json');



