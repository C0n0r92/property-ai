const fs = require('fs');
const path = require('path');

// Read the data
const dataPath = path.join(__dirname, '../dashboard/public/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Filter valid properties for space efficiency analysis
const validProps = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31') &&
         p.soldPrice &&
         p.areaSqm &&
         p.areaSqm > 0 &&
         p.dublinPostcode;
});

console.log(`=== DUBLIN SPACE EFFICIENCY ANALYSIS ===\n`);
console.log(`Total properties analyzed: ${validProps.length.toLocaleString()}`);

// Calculate space efficiency metrics by postcode
const postcodeEfficiency = {};
validProps.forEach(prop => {
  const postcode = prop.dublinPostcode;
  if (!postcodeEfficiency[postcode]) {
    postcodeEfficiency[postcode] = {
      properties: [],
      totalPrice: 0,
      totalSqm: 0,
      count: 0
    };
  }

  postcodeEfficiency[postcode].properties.push(prop);
  postcodeEfficiency[postcode].totalPrice += prop.soldPrice;
  postcodeEfficiency[postcode].totalSqm += prop.areaSqm;
  postcodeEfficiency[postcode].count++;
});

// Calculate efficiency metrics
Object.keys(postcodeEfficiency).forEach(postcode => {
  const stats = postcodeEfficiency[postcode];
  stats.avgPrice = stats.totalPrice / stats.count;
  stats.avgSqm = stats.totalSqm / stats.count;
  stats.pricePerSqm = stats.avgPrice / stats.avgSqm;
  stats.efficiencyScore = stats.avgSqm / stats.avgPrice * 100000; // SqM per €100K
});

// Filter areas with sufficient data
const validAreas = Object.entries(postcodeEfficiency)
  .filter(([postcode, stats]) => stats.count >= 30)
  .sort((a, b) => b[1].efficiencyScore - a[1].efficiencyScore);

console.log('\n🏠 MOST SPACE-EFFICIENT AREAS (€ per SqM)');
console.log('===========================================');
validAreas.slice(0, 10).forEach(([postcode, stats], index) => {
  console.log(`${index + 1}. ${postcode}: €${Math.round(stats.pricePerSqm)}/m², ${Math.round(stats.avgSqm)}m² avg, ${stats.efficiencyScore.toFixed(1)} efficiency`);
});

// Analyze efficiency by property type
const typeEfficiency = {};
validProps.forEach(prop => {
  const type = prop.propertyType;
  if (!typeEfficiency[type]) {
    typeEfficiency[type] = {
      properties: [],
      totalPrice: 0,
      totalSqm: 0,
      count: 0
    };
  }

  typeEfficiency[type].properties.push(prop);
  typeEfficiency[type].totalPrice += prop.soldPrice;
  typeEfficiency[type].totalSqm += prop.areaSqm;
  typeEfficiency[type].count++;
});

Object.keys(typeEfficiency).forEach(type => {
  const stats = typeEfficiency[type];
  stats.avgPrice = stats.totalPrice / stats.count;
  stats.avgSqm = stats.totalSqm / stats.count;
  stats.pricePerSqm = stats.avgPrice / stats.avgSqm;
  stats.efficiencyScore = stats.avgSqm / stats.avgPrice * 100000;
});

const validTypes = Object.entries(typeEfficiency)
  .filter(([type, stats]) => stats.count >= 100)
  .sort((a, b) => b[1].efficiencyScore - a[1].efficiencyScore);

console.log('\n🏢 PROPERTY TYPE EFFICIENCY');
console.log('============================');
validTypes.forEach(([type, stats], index) => {
  console.log(`${index + 1}. ${type}: €${Math.round(stats.pricePerSqm)}/m², ${Math.round(stats.avgSqm)}m² avg, ${stats.efficiencyScore.toFixed(1)} efficiency`);
});

// Analyze bedroom efficiency - space per bedroom
const bedroomEfficiency = {};
validProps.forEach(prop => {
  const beds = prop.beds;
  if (beds && beds > 0) {
    if (!bedroomEfficiency[beds]) {
      bedroomEfficiency[beds] = {
        properties: [],
        totalPrice: 0,
        totalSqm: 0,
        count: 0
      };
    }

    bedroomEfficiency[beds].properties.push(prop);
    bedroomEfficiency[beds].totalPrice += prop.soldPrice;
    bedroomEfficiency[beds].totalSqm += prop.areaSqm;
    bedroomEfficiency[beds].count++;
  }
});

Object.keys(bedroomEfficiency).forEach(beds => {
  const stats = bedroomEfficiency[beds];
  stats.avgPrice = stats.totalPrice / stats.count;
  stats.avgSqm = stats.totalSqm / stats.count;
  stats.pricePerSqm = stats.avgPrice / stats.avgSqm;
  stats.sqmPerBedroom = stats.avgSqm / beds;
  stats.pricePerBedroomSqm = stats.avgPrice / stats.sqmPerBedroom;
  stats.efficiencyScore = stats.sqmPerBedroom / stats.avgPrice * 100000;
});

const validBedrooms = Object.entries(bedroomEfficiency)
  .filter(([beds, stats]) => stats.count >= 50)
  .sort((a, b) => b[1].efficiencyScore - a[1].efficiencyScore);

console.log('\n🛏️ BEDROOM EFFICIENCY ANALYSIS');
console.log('==============================');
validBedrooms.forEach(([beds, stats]) => {
  console.log(`${beds} beds: ${Math.round(stats.sqmPerBedroom)}m²/bed, €${Math.round(stats.pricePerSqm)}/m², ${stats.efficiencyScore.toFixed(1)} efficiency`);
});

// Find value opportunities - areas that are efficient but not overpriced
const efficiencyVsPrice = validAreas.map(([postcode, stats]) => ({
  postcode,
  pricePerSqm: stats.pricePerSqm,
  efficiencyScore: stats.efficiencyScore,
  avgPrice: stats.avgPrice,
  valueRatio: stats.efficiencyScore / stats.avgPrice * 1000000 // Normalized value score
})).sort((a, b) => b.valueRatio - a.valueRatio);

console.log('\n💎 BEST VALUE AREAS (Efficiency vs Price)');
console.log('===========================================');
efficiencyVsPrice.slice(0, 8).forEach((area, index) => {
  console.log(`${index + 1}. ${area.postcode}: ${area.efficiencyScore.toFixed(1)} efficiency, €${Math.round(area.avgPrice).toLocaleString()} avg price`);
});

// Size distribution analysis - finding optimal property sizes
const sizeBrackets = [
  { min: 0, max: 50, label: 'Micro (0-50m²)' },
  { min: 50, max: 80, label: 'Small (50-80m²)' },
  { min: 80, max: 120, label: 'Medium (80-120m²)' },
  { min: 120, max: 160, label: 'Large (120-160m²)' },
  { min: 160, max: 200, label: 'XL (160-200m²)' },
  { min: 200, max: 1000, label: 'XXL (200m²+)' }
];

const sizeAnalysis = sizeBrackets.map(bracket => {
  const properties = validProps.filter(p => p.areaSqm >= bracket.min && p.areaSqm < bracket.max);
  if (properties.length < 10) return null;

  const avgPrice = properties.reduce((sum, p) => sum + p.soldPrice, 0) / properties.length;
  const avgSqm = properties.reduce((sum, p) => sum + p.areaSqm, 0) / properties.length;
  const pricePerSqm = avgPrice / avgSqm;

  return {
    ...bracket,
    count: properties.length,
    avgPrice: Math.round(avgPrice),
    avgSqm: Math.round(avgSqm),
    pricePerSqm: Math.round(pricePerSqm),
    efficiencyScore: avgSqm / avgPrice * 100000
  };
}).filter(Boolean);

console.log('\n📏 PROPERTY SIZE EFFICIENCY BRACKETS');
console.log('=====================================');
sizeAnalysis.forEach((bracket, index) => {
  console.log(`${bracket.label}: €${bracket.pricePerSqm}/m², ${bracket.avgSqm}m² avg, ${bracket.count} properties`);
});

// Premium inefficiency - areas where size comes at huge premium
const inefficiencyAnalysis = validAreas
  .slice(-10) // Bottom 10 least efficient
  .reverse() // Show most inefficient first
  .map(([postcode, stats]) => ({
    postcode,
    pricePerSqm: stats.pricePerSqm,
    efficiencyScore: stats.efficiencyScore,
    inefficiencyPremium: (stats.pricePerSqm / validAreas[0][1].pricePerSqm - 1) * 100
  }));

console.log('\n💸 LEAST EFFICIENT AREAS (Space Premium)');
console.log('==========================================');
inefficiencyAnalysis.forEach((area, index) => {
  console.log(`${index + 1}. ${area.postcode}: €${Math.round(area.pricePerSqm)}/m² (${area.inefficiencyPremium.toFixed(1)}% premium)`);
});

// Create chart data
const chartData = {
  SpaceEfficiencyRankingChart: validAreas.slice(0, 12).map(([postcode, stats]) => ({
    postcode: postcode,
    pricePerSqm: Math.round(stats.pricePerSqm),
    avgSqm: Math.round(stats.avgSqm),
    efficiencyScore: stats.efficiencyScore
  })),

  PropertyTypeEfficiencyChart: validTypes.map(([type, stats]) => ({
    type: type,
    pricePerSqm: Math.round(stats.pricePerSqm),
    avgSqm: Math.round(stats.avgSqm),
    efficiencyScore: stats.efficiencyScore
  })),

  BedroomEfficiencyChart: validBedrooms.slice(0, 6).map(([beds, stats]) => ({
    bedrooms: `${beds} Bed`,
    sqmPerBedroom: Math.round(stats.sqmPerBedroom),
    pricePerSqm: Math.round(stats.pricePerSqm),
    efficiencyScore: stats.efficiencyScore
  })),

  SizeBracketEfficiencyChart: sizeAnalysis.map(bracket => ({
    sizeBracket: bracket.label,
    pricePerSqm: bracket.pricePerSqm,
    avgSqm: bracket.avgSqm,
    propertyCount: bracket.count
  })),

  ValueOpportunityChart: efficiencyVsPrice.slice(0, 10).map(area => ({
    postcode: area.postcode,
    efficiencyScore: area.efficiencyScore,
    avgPrice: Math.round(area.avgPrice),
    valueRatio: area.valueRatio
  }))
};

// Write chart data to file
const chartDataPath = path.join(__dirname, '../blogs/blog28_space_efficiency_analysis_chart_data.json');
fs.writeFileSync(chartDataPath, JSON.stringify(chartData, null, 2));

console.log(`\n📊 Chart data exported to: ${chartDataPath}`);
console.log('\n✅ Space Efficiency Analysis Complete!');

// Key insights summary
console.log('\n📋 KEY SPACE EFFICIENCY INSIGHTS');
console.log('=================================');
console.log(`• Most efficient area: ${validAreas[0][0]} (€${Math.round(validAreas[0][1].pricePerSqm)}/m², ${Math.round(validAreas[0][1].avgSqm)}m² avg)`);
console.log(`• Most efficient property type: ${validTypes[0][0]} (${validTypes[0][1].efficiencyScore.toFixed(1)} efficiency score)`);
console.log(`• Best bedroom efficiency: ${validBedrooms[0][0]} beds (${Math.round(validBedrooms[0][1].sqmPerBedroom)}m² per bedroom)`);
console.log(`• Optimal size bracket: ${sizeAnalysis.sort((a,b) => b.efficiencyScore - a.efficiencyScore)[0].label} (€${sizeAnalysis.sort((a,b) => b.efficiencyScore - a.efficiencyScore)[0].pricePerSqm}/m²)`);
console.log(`• Biggest space premium: ${inefficiencyAnalysis[0].postcode} (${inefficiencyAnalysis[0].inefficiencyPremium.toFixed(1)}% over most efficient)`);

