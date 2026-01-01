const fs = require('fs');

// Load data
const data = JSON.parse(fs.readFileSync('../dashboard/public/data.json', 'utf8'));

// Filter for valid 2024-2025 properties with area data
const propertiesWithArea = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31') &&
         p.areaSqm > 0 &&
         p.beds > 0;
});

console.log(`Properties with area data analyzed: ${propertiesWithArea.length}`);

// Analyze price per square meter by property size
const sizeEfficiencyAnalysis = {};

// Group by bedroom count
const bedroomGroups = {};
propertiesWithArea.forEach(p => {
  const beds = Math.min(p.beds, 6); // Cap at 6+ beds
  if (!bedroomGroups[beds]) {
    bedroomGroups[beds] = [];
  }
  bedroomGroups[beds].push(p);
});

console.log('\nPrice Efficiency by Bedroom Count:');
Object.entries(bedroomGroups)
  .sort(([a], [b]) => parseInt(a) - parseInt(b))
  .forEach(([beds, properties]) => {
    if (properties.length < 50) return; // Skip small samples

    const avgPrice = properties.reduce((sum, p) => sum + p.soldPrice, 0) / properties.length;
    const avgSqm = properties.reduce((sum, p) => sum + p.areaSqm, 0) / properties.length;
    const pricePerSqm = avgPrice / avgSqm;

    // Calculate efficiency metrics
    const valuePerBedroom = avgPrice / beds;
    const sqmPerBedroom = avgSqm / beds;

    console.log(`${beds} bedroom properties (${properties.length} samples):`);
    console.log(`  Average price: €${avgPrice.toLocaleString()}`);
    console.log(`  Average size: ${avgSqm.toFixed(0)} sqm`);
    console.log(`  Price per sqm: €${pricePerSqm.toFixed(0)}`);
    console.log(`  Value per bedroom: €${valuePerBedroom.toLocaleString()}`);
    console.log(`  Space per bedroom: ${sqmPerBedroom.toFixed(0)} sqm`);
    console.log('');
  });

// Size efficiency paradox analysis
// Find properties that deliver more bedrooms per square meter
const efficiencyMetrics = propertiesWithArea.map(p => ({
  beds: p.beds,
  sqm: p.areaSqm,
  price: p.soldPrice,
  pricePerSqm: p.pricePerSqm,
  bedroomsPerSqm: p.beds / p.areaSqm,
  valuePerSqmPerBed: (p.soldPrice / p.areaSqm) / p.beds,
  propertyType: p.propertyType,
  postcode: p.dublinPostcode
}));

// Group by property type for efficiency comparison
const typeEfficiency = {};
propertiesWithArea.forEach(p => {
  const type = p.propertyType;
  if (!typeEfficiency[type]) {
    typeEfficiency[type] = { properties: [], totalSqm: 0, totalBeds: 0, totalPrice: 0 };
  }

  typeEfficiency[type].properties.push(p);
  typeEfficiency[type].totalSqm += p.areaSqm;
  typeEfficiency[type].totalBeds += p.beds;
  typeEfficiency[type].totalPrice += p.soldPrice;
});

console.log('Space Efficiency by Property Type (minimum 100 properties):');
const validTypes = Object.entries(typeEfficiency)
  .filter(([_, data]) => data.properties.length >= 100)
  .sort((a, b) => {
    const aEfficiency = (b[1].totalBeds / b[1].totalSqm) - (a[1].totalBeds / a[1].totalSqm);
    return aEfficiency;
  });

validTypes.forEach(([type, data]) => {
  const avgSqm = data.totalSqm / data.properties.length;
  const avgBeds = data.totalBeds / data.properties.length;
  const avgPrice = data.totalPrice / data.properties.length;
  const bedsPerSqm = avgBeds / avgSqm;
  const pricePerSqm = avgPrice / avgSqm;

  console.log(`${type} (${data.properties.length} properties):`);
  console.log(`  Average size: ${avgSqm.toFixed(0)} sqm`);
  console.log(`  Average bedrooms: ${avgBeds.toFixed(1)}`);
  console.log(`  Bedrooms per sqm: ${bedsPerSqm.toFixed(3)}`);
  console.log(`  Price per sqm: €${pricePerSqm.toFixed(0)}`);
  console.log(`  Value efficiency: €${(pricePerSqm / bedsPerSqm).toFixed(0)} per bedroom per sqm`);
  console.log('');
});

// Optimal size analysis - where you get best value
const sizeBrackets = [
  { min: 0, max: 70, label: '0-70 sqm' },
  { min: 70, max: 100, label: '70-100 sqm' },
  { min: 100, max: 130, label: '100-130 sqm' },
  { min: 130, max: 160, label: '130-160 sqm' },
  { min: 160, max: 200, label: '160-200 sqm' },
  { min: 200, max: 250, label: '200-250 sqm' },
  { min: 250, max: 999, label: '250+ sqm' }
];

const sizeBracketAnalysis = sizeBrackets.map(bracket => {
  const bracketProperties = propertiesWithArea.filter(p =>
    p.areaSqm >= bracket.min && p.areaSqm < bracket.max
  );

  if (bracketProperties.length < 30) return null;

  const avgPrice = bracketProperties.reduce((sum, p) => sum + p.soldPrice, 0) / bracketProperties.length;
  const avgBeds = bracketProperties.reduce((sum, p) => sum + p.beds, 0) / bracketProperties.length;
  const avgSqm = bracketProperties.reduce((sum, p) => sum + p.areaSqm, 0) / bracketProperties.length;

  return {
    sizeBracket: bracket.label,
    count: bracketProperties.length,
    averagePrice: avgPrice,
    averageBeds: avgBeds,
    averageSqm: avgSqm,
    pricePerSqm: avgPrice / avgSqm,
    bedsPerSqm: avgBeds / avgSqm,
    valueEfficiency: (avgPrice / avgSqm) / avgBeds
  };
}).filter(Boolean);

console.log('Size Bracket Efficiency Analysis:');
sizeBracketAnalysis.forEach(bracket => {
  console.log(`${bracket.sizeBracket} (${bracket.count} properties):`);
  console.log(`  Avg price: €${bracket.averagePrice.toLocaleString()}`);
  console.log(`  Avg bedrooms: ${bracket.averageBeds.toFixed(1)}`);
  console.log(`  Price per sqm: €${bracket.pricePerSqm.toFixed(0)}`);
  console.log(`  Bedrooms per sqm: ${bracket.bedsPerSqm.toFixed(3)}`);
  console.log(`  Value efficiency: €${bracket.valueEfficiency.toFixed(0)} per bedroom per sqm`);
  console.log('');
});

// Export chart data
const chartData = {
  bedroomEfficiencyChart: Object.entries(bedroomGroups)
    .filter(([_, properties]) => properties.length >= 50)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([beds, properties]) => {
      const avgPrice = properties.reduce((sum, p) => sum + p.soldPrice, 0) / properties.length;
      const avgSqm = properties.reduce((sum, p) => sum + p.areaSqm, 0) / properties.length;
      return {
        bedrooms: parseInt(beds),
        averagePrice: Math.round(avgPrice),
        averageSqm: Math.round(avgSqm),
        pricePerSqm: Math.round(avgPrice / avgSqm),
        sampleSize: properties.length
      };
    }),
  propertyTypeEfficiencyChart: validTypes.map(([type, data]) => {
    const avgSqm = data.totalSqm / data.properties.length;
    const avgBeds = data.totalBeds / data.properties.length;
    const avgPrice = data.totalPrice / data.properties.length;
    return {
      propertyType: type,
      averageSqm: Math.round(avgSqm),
      averageBedrooms: avgBeds,
      bedroomsPerSqm: avgBeds / avgSqm,
      pricePerSqm: Math.round(avgPrice / avgSqm),
      sampleSize: data.properties.length
    };
  }),
  sizeBracketEfficiencyChart: sizeBracketAnalysis.map(bracket => ({
    sizeBracket: bracket.sizeBracket,
    averagePrice: Math.round(bracket.averagePrice),
    averageBedrooms: bracket.averageBedrooms,
    pricePerSqm: Math.round(bracket.pricePerSqm),
    bedsPerSqm: bracket.bedsPerSqm,
    sampleSize: bracket.count
  })),
  efficiencyParadoxChart: (() => {
    // Find the sweet spot where you get most bedrooms for least cost per bedroom
    const paradoxData = sizeBracketAnalysis.map(bracket => ({
      bracket: bracket.sizeBracket,
      costPerBedroomPerSqm: bracket.valueEfficiency,
      bedroomsPerSqm: bracket.bedsPerSqm
    }));

    return paradoxData.sort((a, b) => a.costPerBedroomPerSqm - b.costPerBedroomPerSqm);
  })()
};

fs.writeFileSync('blog34_property_size_efficiency_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('\nChart data exported to blog34_property_size_efficiency_chart_data.json');
