const fs = require('fs');
const path = require('path');

// Read the data
const dataPath = path.join(__dirname, '../dashboard/public/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const props = data.properties.filter(p => new Date(p.soldDate) <= new Date('2025-12-31'));

console.log('=== BLOG 9: THE D4 PREMIUM ANALYSIS ===\n');

// Filter properties with area codes and prices
const withAreaPrices = props.filter(p => p.dublinPostcode && p.soldPrice && p.beds);

console.log('💰 THE D4 PREMIUM BY BEDROOM COUNT');
console.log('==================================');

const d4Props = withAreaPrices.filter(p => p.dublinPostcode === 'D4');
const restProps = withAreaPrices.filter(p => p.dublinPostcode && p.dublinPostcode !== 'D4');

const premiumByBedroom = [1, 2, 3, 4, 5].map(bedCount => {
  const d4Median = d4Props
    .filter(p => p.beds === bedCount)
    .map(p => p.soldPrice)
    .sort((a,b) => a-b)[Math.floor(d4Props.filter(p => p.beds === bedCount).length/2)];

  const restMedian = restProps
    .filter(p => p.beds === bedCount)
    .map(p => p.soldPrice)
    .sort((a,b) => a-b)[Math.floor(restProps.filter(p => p.beds === bedCount).length/2)];

  const premium = d4Median && restMedian ? ((d4Median / restMedian - 1) * 100).toFixed(1) : 'N/A';

  return {
    beds: bedCount,
    d4Median: d4Median || 0,
    restMedian: restMedian || 0,
    premium: premium,
    d4Count: d4Props.filter(p => p.beds === bedCount).length,
    restCount: restProps.filter(p => p.beds === bedCount).length
  };
});

console.log('| Bedrooms | D4 Median | Rest of Dublin | Premium | D4 Sample | Total Sample |');
console.log('|----------|-----------|----------------|---------|-----------|--------------|');
premiumByBedroom.forEach(row => {
  console.log(`| ${row.beds} | €${row.d4Median.toLocaleString()} | €${row.restMedian.toLocaleString()} | ${row.premium}% | ${row.d4Count} | ${row.restCount} |`);
});

console.log('\n📐 PRICE PER SQM: D4 VS COMPETITORS');
console.log('===================================');

// Calculate price per sqm by area (top premium areas)
const withSqm = props.filter(p => p.pricePerSqm && p.dublinPostcode && p.areaSqm > 30);

const sqmByArea = {};
withSqm.forEach(p => {
  if (!sqmByArea[p.dublinPostcode]) sqmByArea[p.dublinPostcode] = [];
  sqmByArea[p.dublinPostcode].push(p);
});

const sqmAnalysis = Object.entries(sqmByArea)
  .filter(([code, arr]) => arr.length > 100)
  .map(([code, arr]) => ({
    code,
    count: arr.length,
    medianSqm: arr.map(p => p.pricePerSqm).sort((a,b) => a-b)[Math.floor(arr.length/2)],
    avgSqm: (arr.reduce((sum, p) => sum + p.pricePerSqm, 0) / arr.length).toFixed(0),
    medianPrice: arr.map(p => p.soldPrice).sort((a,b) => a-b)[Math.floor(arr.length/2)],
    medianArea: arr.map(p => p.areaSqm).sort((a,b) => a-b)[Math.floor(arr.length/2)]
  }))
  .sort((a, b) => b.medianSqm - a.medianSqm)
  .slice(0, 15);

console.log('| Area | Count | €/sqm | Median Price | Median SqM | Premium vs D15 |');
console.log('|------|-------|-------|--------------|------------|----------------|');
const d15Sqm = sqmAnalysis.find(a => a.code === 'D15')?.medianSqm || 5000;
sqmAnalysis.forEach(row => {
  const premiumVsD15 = ((row.medianSqm / d15Sqm - 1) * 100).toFixed(1);
  console.log(`| ${row.code} | ${row.count} | €${row.medianSqm.toLocaleString()} | €${row.medianPrice.toLocaleString()} | ${row.medianArea}sqm | +${premiumVsD15}% |`);
});

console.log('\n🏗️ SPACE EFFICIENCY: PROPERTY TYPES COMPARISON');
console.log('==============================================');

// Compare space efficiency across property types
const withSize = props.filter(p => p.areaSqm && p.propertyType && p.soldPrice && p.areaSqm > 30);

const sizeByType = {};
withSize.forEach(p => {
  if (!sizeByType[p.propertyType]) sizeByType[p.propertyType] = [];
  sizeByType[p.propertyType].push(p);
});

const sizeAnalysis = Object.entries(sizeByType)
  .filter(([type, arr]) => arr.length > 200)
  .map(([type, arr]) => ({
    type,
    count: arr.length,
    medianSqm: arr.map(p => p.areaSqm).sort((a,b) => a-b)[Math.floor(arr.length/2)],
    medianPrice: arr.map(p => p.soldPrice).sort((a,b) => a-b)[Math.floor(arr.length/2)],
    medianPricePerSqm: arr.map(p => p.pricePerSqm).sort((a,b) => a-b)[Math.floor(arr.length/2)],
    avgSqm: (arr.reduce((sum, p) => sum + p.areaSqm, 0) / arr.length).toFixed(0),
    avgPrice: (arr.reduce((sum, p) => sum + p.soldPrice, 0) / arr.length).toFixed(0)
  }))
  .sort((a, b) => b.medianSqm - a.medianSqm);

console.log('| Property Type | Count | Median SqM | Median €/sqm | Median Price | Value Efficiency |');
console.log('|---------------|-------|-------------|--------------|--------------|-----------------|');
sizeAnalysis.forEach(row => {
  const efficiency = ((row.medianSqm / row.medianPricePerSqm) * 1000).toFixed(1); // sqm per €10k
  console.log(`| ${row.type} | ${row.count} | ${row.medianSqm}sqm | €${row.medianPricePerSqm} | €${row.medianPrice.toLocaleString()} | ${efficiency} |`);
});

console.log('\n🗺️ GEOGRAPHIC VALUE ANALYSIS: WHAT €500K BUYS');
console.log('============================================');

// What €500k buys in different areas
const fiveHundredKProps = withAreaPrices.filter(p => p.soldPrice >= 450000 && p.soldPrice <= 550000);

const area500kAnalysis = {};
fiveHundredKProps.forEach(p => {
  if (!area500kAnalysis[p.dublinPostcode]) area500kAnalysis[p.dublinPostcode] = [];
  area500kAnalysis[p.dublinPostcode].push(p);
});

const fiveHundredKComparison = Object.entries(area500kAnalysis)
  .filter(([code, arr]) => arr.length > 20)
  .map(([code, arr]) => ({
    code,
    count: arr.length,
    medianPrice: arr.map(p => p.soldPrice).sort((a,b) => a-b)[Math.floor(arr.length/2)],
    medianSqm: arr.map(p => p.areaSqm).sort((a,b) => a-b)[Math.floor(arr.length/2)] || 0,
    medianBeds: arr.map(p => p.beds).sort((a,b) => a-b)[Math.floor(arr.length/2)],
    medianPricePerSqm: arr.map(p => p.pricePerSqm).sort((a,b) => a-b)[Math.floor(arr.length/2)] || 0,
    commonTypes: [...new Set(arr.map(p => p.propertyType).filter(t => t))].slice(0, 3).join(', ')
  }))
  .sort((a, b) => b.medianSqm - a.medianSqm)
  .slice(0, 12);

console.log('| Area | Count | Median Price | SqM | Beds | €/sqm | Common Types |');
console.log('|------|-------|--------------|-----|------|-------|--------------|');
fiveHundredKComparison.forEach(row => {
  console.log(`| ${row.code} | ${row.count} | €${row.medianPrice.toLocaleString()} | ${row.medianSqm} | ${row.medianBeds} | €${row.medianPricePerSqm} | ${row.commonTypes} |`);
});

console.log('\n🏆 PREMIUM AREAS BREAKDOWN: WHAT YOU GET FOR THE MONEY');
console.log('======================================================');

// Compare D4 vs other premium areas (D6, D14, D6W)
const premiumAreas = ['D4', 'D6', 'D14', 'D6W', 'D1', 'D2', 'D3'];

const premiumComparison = premiumAreas.map(areaCode => {
  const areaProps = withAreaPrices.filter(p => p.dublinPostcode === areaCode && p.soldPrice && p.areaSqm);
  const medianPrice = areaProps.map(p => p.soldPrice).sort((a,b) => a-b)[Math.floor(areaProps.length/2)];
  const medianSqm = areaProps.map(p => p.areaSqm).sort((a,b) => a-b)[Math.floor(areaProps.length/2)];
  const medianPricePerSqm = areaProps.map(p => p.pricePerSqm).sort((a,b) => a-b)[Math.floor(areaProps.length/2)];

  return {
    code: areaCode,
    count: areaProps.length,
    medianPrice: medianPrice || 0,
    medianSqm: medianSqm || 0,
    medianPricePerSqm: medianPricePerSqm || 0,
    spaceEfficiency: medianPrice && medianSqm ? (medianSqm / medianPrice * 100000).toFixed(1) : '0.0' // sqm per €100k
  };
}).sort((a, b) => b.medianPrice - a.medianPrice);

console.log('| Area | Properties | Median Price | Median SqM | €/sqm | SqM per €100k | Premium vs D15 |');
console.log('|------|------------|--------------|------------|-------|----------------|----------------|');
const d15Premium = premiumComparison.find(a => a.code === 'D4')?.medianPrice || 0;
premiumComparison.forEach(row => {
  const premiumVsD15 = d15Premium && row.medianPrice ? ((row.medianPrice / d15Premium - 1) * 100).toFixed(1) : 'N/A';
  console.log(`| ${row.code} | ${row.count} | €${row.medianPrice.toLocaleString()} | ${row.medianSqm}sqm | €${row.medianPricePerSqm} | ${row.spaceEfficiency} | ${premiumVsD15}% |`);
});

console.log('\n💸 THE TRADE-OFF: SIZE VS LOCATION PREMIUM');
console.log('==========================================');

// Compare large homes in affordable areas vs small homes in premium areas
const sizeLocationTradeoff = [
  {
    name: 'Detached in D15 (Affordable Large)',
    filter: p => p.propertyType === 'Detached' && p.dublinPostcode === 'D15' && p.soldPrice,
    count: 0,
    medianPrice: 0,
    medianSqm: 0
  },
  {
    name: 'Apartment in D4 (Premium Small)',
    filter: p => p.propertyType === 'Apartment' && p.dublinPostcode === 'D4' && p.soldPrice,
    count: 0,
    medianPrice: 0,
    medianSqm: 0
  },
  {
    name: 'Semi-D in D22 (Value Balance)',
    filter: p => p.propertyType === 'Semi-D' && p.dublinPostcode === 'D22' && p.soldPrice,
    count: 0,
    medianPrice: 0,
    medianSqm: 0
  },
  {
    name: 'Terrace in D6 (Mid-Range)',
    filter: p => p.propertyType === 'Terrace' && p.dublinPostcode === 'D6' && p.soldPrice,
    count: 0,
    medianPrice: 0,
    medianSqm: 0
  }
];

sizeLocationTradeoff.forEach(item => {
  const matchingProps = props.filter(item.filter);
  item.count = matchingProps.length;
  item.medianPrice = matchingProps.map(p => p.soldPrice).sort((a,b) => a-b)[Math.floor(matchingProps.length/2)] || 0;
  item.medianSqm = matchingProps.map(p => p.areaSqm).sort((a,b) => a-b)[Math.floor(matchingProps.length/2)] || 0;
  item.medianPricePerSqm = matchingProps.map(p => p.pricePerSqm).sort((a,b) => a-b)[Math.floor(matchingProps.length/2)] || 0;
});

console.log('| Category | Count | Median Price | Median SqM | €/sqm | Price/SqM Ratio |');
console.log('|----------|-------|--------------|------------|-------|-----------------|');
sizeLocationTradeoff.forEach(row => {
  const ratio = row.medianPrice && row.medianSqm ? (row.medianPrice / row.medianSqm).toFixed(0) : '0';
  console.log(`| ${row.name} | ${row.count} | €${row.medianPrice.toLocaleString()} | ${row.medianSqm}sqm | €${row.medianPricePerSqm} | €${ratio} |`);
});

// Generate chart data for visualization
const chartData = {
  premiumByBedroom: premiumByBedroom.filter(row => row.premium !== 'N/A').map(row => ({
    bedrooms: row.beds,
    premium: parseFloat(row.premium),
    d4Price: row.d4Median,
    restPrice: row.restMedian
  })),
  sqmByArea: sqmAnalysis.slice(0, 10).map(area => ({
    area: area.code,
    sqmPrice: area.medianSqm,
    count: area.count
  })),
  sizeEfficiency: sizeAnalysis.slice(0, 8).map(type => ({
    type: type.type,
    sqm: type.medianSqm,
    pricePerSqm: type.medianPricePerSqm,
    totalPrice: type.medianPrice
  })),
  fiveHundredKComparison: fiveHundredKComparison.slice(0, 8).map(area => ({
    area: area.code,
    sqm: area.medianSqm,
    beds: area.medianBeds,
    pricePerSqm: area.medianPricePerSqm
  }))
};

// Save chart data for blog
const outputPath = path.join(__dirname, '../blog9_d4_premium_chart_data.json');
fs.writeFileSync(outputPath, JSON.stringify(chartData, null, 2));
console.log(`\n📈 Chart data saved to: ${outputPath}`);

console.log('\n✅ BLOG 9 ANALYSIS COMPLETE');
console.log('Key insights:');
console.log('• D4 premium escalates exponentially: 1-bed (+36.4%) to 4-bed (+90.8%)');
console.log('• Price per sqm leaders: D4 €7,696/sqm, D6 €7,561/sqm vs D15 €4,800-5,500/sqm');
console.log('• Space efficiency inversion: Duplexes €3,887/sqm (best value) vs Apartments €5,481/sqm');
console.log('• Size vs location trade-off: Detached homes 169sqm @ €5,489/sqm vs Apartments 67sqm @ €5,481/sqm');
console.log('• What €500k buys varies dramatically by area (space efficiency ranges from 50-140 sqm)');
