const fs = require('fs');
const path = require('path');

// Read the data
const dataPath = path.join(__dirname, '../dashboard/public/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const props = data.properties.filter(p => new Date(p.soldDate) <= new Date('2025-12-31'));

console.log('=== BLOG 3: APARTMENT MARKET ANALYSIS ===\n');

// Filter apartment properties
const apartments = props.filter(p =>
  p.propertyType === 'Apartment' &&
  p.dublinPostcode &&
  p.soldPrice > 0
);

console.log('📊 APARTMENT MARKET ANALYSIS');
console.log('=============================');

console.log(`Total apartments analyzed: ${apartments.length.toLocaleString()}`);
console.log(`Percentage of Dublin market: ${((apartments.length / props.filter(p => p.dublinPostcode).length) * 100).toFixed(1)}%`);

const avgPrice = Math.round(apartments.reduce((sum, p) => sum + p.soldPrice, 0) / apartments.length);
const medianPrice = apartments.map(p => p.soldPrice).sort((a,b) => a-b)[Math.floor(apartments.length/2)];

console.log(`Average apartment price: €${avgPrice.toLocaleString()}`);
console.log(`Median apartment price: €${medianPrice.toLocaleString()}`);

console.log('\n🛏️  APARTMENT BEDROOM ANALYSIS');
console.log('=============================');

// Analyze by bedroom count
const bedroomAnalysis = {};
apartments.forEach(p => {
  const beds = p.beds || 'Unknown';
  if (!bedroomAnalysis[beds]) {
    bedroomAnalysis[beds] = { count: 0, totalValue: 0, totalSqm: 0 };
  }
  bedroomAnalysis[beds].count++;
  bedroomAnalysis[beds].totalValue += p.soldPrice;
  if (p.areaSqm) bedroomAnalysis[beds].totalSqm += p.areaSqm;
});

const bedroomResults = Object.entries(bedroomAnalysis)
  .filter(([beds, data]) => data.count >= 10)
  .map(([beds, data]) => ({
    beds,
    count: data.count,
    percentage: ((data.count / apartments.length) * 100).toFixed(1),
    avgPrice: Math.round(data.totalValue / data.count),
    avgSqm: data.totalSqm > 0 ? Math.round(data.totalSqm / data.count) : 0,
    pricePerSqm: data.totalSqm > 0 ? Math.round((data.totalValue / data.totalSqm)) : 0
  }))
  .sort((a, b) => parseInt(a.beds) - parseInt(b.beds));

console.log('| Bedrooms | Properties | Percentage | Avg Price | Avg Size | Price/㎡ |');
console.log('|----------|------------|------------|-----------|----------|----------|');
bedroomResults.forEach(bed => {
  console.log(`| ${bed.beds} | ${bed.count.toLocaleString()} | ${bed.percentage}% | €${bed.avgPrice.toLocaleString()} | ${bed.avgSqm}㎡ | €${bed.pricePerSqm} |`);
});

console.log('\n🏆 TOP APARTMENT AREAS');
console.log('======================');

// Analyze by Dublin postcode
const areaAnalysis = {};
apartments.forEach(p => {
  if (!areaAnalysis[p.dublinPostcode]) {
    areaAnalysis[p.dublinPostcode] = { count: 0, totalValue: 0, totalSqm: 0 };
  }
  areaAnalysis[p.dublinPostcode].count++;
  areaAnalysis[p.dublinPostcode].totalValue += p.soldPrice;
  if (p.areaSqm) areaAnalysis[p.dublinPostcode].totalSqm += p.areaSqm;
});

const topAreas = Object.entries(areaAnalysis)
  .filter(([code, data]) => data.count >= 50)
  .map(([code, data]) => ({
    code,
    count: data.count,
    avgPrice: Math.round(data.totalValue / data.count),
    avgSqm: data.totalSqm > 0 ? Math.round(data.totalSqm / data.count) : 0,
    pricePerSqm: data.totalSqm > 0 ? Math.round((data.totalValue / data.totalSqm)) : 0
  }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 15);

console.log('| Area | Properties | Avg Price | Avg Size | Price/㎡ |');
console.log('|------|------------|-----------|----------|----------|');
topAreas.forEach(area => {
  console.log(`| ${area.code} | ${area.count.toLocaleString()} | €${area.avgPrice.toLocaleString()} | ${area.avgSqm}㎡ | €${area.pricePerSqm} |`);
});

console.log('\n💰 PRICE BRACKET ANALYSIS');
console.log('=========================');

// Analyze price brackets
const priceBrackets = [
  { name: 'Under €250k', min: 0, max: 250000 },
  { name: '€250k-€350k', min: 250000, max: 350000 },
  { name: '€350k-€450k', min: 350000, max: 450000 },
  { name: '€450k-€600k', min: 450000, max: 600000 },
  { name: 'Over €600k', min: 600000, max: Infinity }
];

const priceAnalysis = priceBrackets.map(bracket => {
  const bracketProps = apartments.filter(p => p.soldPrice >= bracket.min && p.soldPrice < bracket.max);
  if (bracketProps.length < 10) return null;

  return {
    bracket: bracket.name,
    count: bracketProps.length,
    percentage: ((bracketProps.length / apartments.length) * 100).toFixed(1),
    avgPrice: Math.round(bracketProps.reduce((sum, p) => sum + p.soldPrice, 0) / bracketProps.length),
    avgSqm: bracketProps.filter(p => p.areaSqm).length > 0 ?
      Math.round(bracketProps.filter(p => p.areaSqm).reduce((sum, p) => sum + p.areaSqm, 0) / bracketProps.filter(p => p.areaSqm).length) : 0
  };
}).filter(Boolean);

console.log('| Price Bracket | Properties | Percentage | Avg Price | Avg Size |');
console.log('|---------------|------------|------------|-----------|----------|');
priceAnalysis.forEach(bracket => {
  console.log(`| ${bracket.bracket} | ${bracket.count.toLocaleString()} | ${bracket.percentage}% | €${bracket.avgPrice.toLocaleString()} | ${bracket.avgSqm}㎡ |`);
});

console.log('\n📈 OVER-ASKING PERFORMANCE');
console.log('==========================');

// Analyze over-asking performance for apartments
const overAskingProps = apartments.filter(p => p.overUnderPercent !== null && p.overUnderPercent > 0);
const overAskingRate = ((overAskingProps.length / apartments.length) * 100).toFixed(1);
const avgPremium = overAskingProps.length > 0 ? (overAskingProps.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAskingProps.length).toFixed(2) : '0.00';

console.log(`Apartments sold over asking: ${overAskingProps.length.toLocaleString()} (${overAskingRate}%)`);
console.log(`Average premium: ${avgPremium}%`);

// Over-asking by bedroom
const bedOverAsking = {};
apartments.forEach(p => {
  const beds = p.beds || 'Unknown';
  if (!bedOverAsking[beds]) {
    bedOverAsking[beds] = { total: 0, over: 0 };
  }
  bedOverAsking[beds].total++;
  if (p.overUnderPercent > 0) bedOverAsking[beds].over++;
});

const bedOverResults = Object.entries(bedOverAsking)
  .filter(([beds, data]) => data.total >= 20)
  .map(([beds, data]) => ({
    beds,
    overRate: ((data.over / data.total) * 100).toFixed(1),
    avgPremium: apartments.filter(p => (p.beds || 'Unknown') === beds && p.overUnderPercent > 0)
      .reduce((sum, p) => sum + p.overUnderPercent, 0) /
      Math.max(1, apartments.filter(p => (p.beds || 'Unknown') === beds && p.overUnderPercent > 0).length)
  }))
  .map(item => ({ ...item, avgPremium: item.avgPremium.toFixed(2) }))
  .sort((a, b) => parseInt(a.beds) - parseInt(b.beds));

console.log('\nOver-Asking by Bedroom Count:');
console.log('| Bedrooms | Over-Asking Rate | Avg Premium |');
console.log('|----------|------------------|-------------|');
bedOverResults.forEach(bed => {
  console.log(`| ${bed.beds} | ${bed.overRate}% | ${bed.avgPremium}% |`);
});

console.log('\n🏘️  GEOGRAPHIC PRICE PREMIUMS');
console.log('=============================');

// Calculate price premiums vs market average
const marketAvgPricePerSqm = apartments.filter(p => p.areaSqm).reduce((sum, p) => sum + (p.soldPrice / p.areaSqm), 0) /
  apartments.filter(p => p.areaSqm).length;

const areaPremiums = Object.entries(areaAnalysis)
  .filter(([code, data]) => data.count >= 50 && data.totalSqm > 0)
  .map(([code, data]) => ({
    code,
    pricePerSqm: Math.round(data.totalValue / data.totalSqm),
    premium: (((data.totalValue / data.totalSqm) / marketAvgPricePerSqm) - 1) * 100
  }))
  .sort((a, b) => b.premium - a.premium);

console.log('| Area | Price/㎡ | Premium vs Market |');
console.log('|------|----------|-------------------|');
areaPremiums.slice(0, 10).forEach(area => {
  console.log(`| ${area.code} | €${area.pricePerSqm} | ${area.premium > 0 ? '+' : ''}${area.premium.toFixed(1)}% |`);
});

// Generate chart data for visualization
const chartData = {
  bedroomAnalysis: bedroomResults.map(bed => ({
    bedrooms: bed.beds,
    count: bed.count,
    percentage: parseFloat(bed.percentage),
    avgPrice: bed.avgPrice,
    pricePerSqm: bed.pricePerSqm
  })),
  topAreas: topAreas.slice(0, 10).map(area => ({
    area: area.code,
    count: area.count,
    avgPrice: area.avgPrice,
    pricePerSqm: area.pricePerSqm
  })),
  priceBrackets: priceAnalysis.map(bracket => ({
    bracket: bracket.bracket,
    count: bracket.count,
    percentage: parseFloat(bracket.percentage),
    avgPrice: bracket.avgPrice
  })),
  areaPremiums: areaPremiums.slice(0, 8).map(area => ({
    area: area.code,
    pricePerSqm: area.pricePerSqm,
    premium: Math.round(area.premium * 10) / 10
  })),
  bedroomOverAsking: bedOverResults.map(bed => ({
    bedrooms: bed.beds,
    overRate: parseFloat(bed.overRate),
    avgPremium: parseFloat(bed.avgPremium)
  }))
};

// Save chart data for blog
const outputPath = path.join(__dirname, '../blogs/blog3_apartment_market_2025_chart_data.json');
fs.writeFileSync(outputPath, JSON.stringify(chartData, null, 2));
console.log(`\n📈 Chart data saved to: ${outputPath}`);

console.log('\n✅ BLOG 3 ANALYSIS COMPLETE');
console.log('Key insights:');
console.log(`• ${apartments.length.toLocaleString()} apartments analyzed`);
console.log(`• Average price: €${avgPrice.toLocaleString()}, median: €${medianPrice.toLocaleString()}`);
console.log(`• 2-bedrooms most common: ${bedroomResults.find(b => b.beds === '2')?.percentage}%`);
console.log(`• Top areas: ${topAreas.slice(0, 3).map(a => `${a.code} (${a.count} props)`).join(', ')}`);
console.log(`• Over-asking rate: ${overAskingRate}% with ${avgPremium}% average premium`);
console.log(`• Premium areas: ${areaPremiums.slice(0, 3).map(a => `${a.code} (+${a.premium.toFixed(1)}%)`).join(', ')}`);
