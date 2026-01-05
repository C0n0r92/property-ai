const fs = require('fs');

// Load data
const data = JSON.parse(fs.readFileSync('./dashboard/public/data.json', 'utf8'));

// Filter for valid 2024-2025 Dublin properties with area data
const validProperties = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31') &&
         p.dublinPostcode &&
         p.areaSqm > 0 &&
         p.soldPrice > 0;
});

console.log(`Valid properties for square meter analysis: ${validProperties.length}`);

// Calculate price per square meter for each property
const propertiesWithSqmPrice = validProperties.map(p => ({
  ...p,
  pricePerSqm: p.soldPrice / p.areaSqm
}));

// Group by postcode for area analysis
const areaAnalysis = {};
propertiesWithSqmPrice.forEach(p => {
  const area = p.dublinPostcode;
  if (!areaAnalysis[area]) {
    areaAnalysis[area] = {
      count: 0,
      totalSqmPrice: 0,
      totalPrice: 0,
      totalArea: 0,
      properties: []
    };
  }
  areaAnalysis[area].count++;
  areaAnalysis[area].totalSqmPrice += p.pricePerSqm;
  areaAnalysis[area].totalPrice += p.soldPrice;
  areaAnalysis[area].totalArea += p.areaSqm;
  areaAnalysis[area].properties.push(p);
});

// Calculate area averages
Object.keys(areaAnalysis).forEach(area => {
  const data = areaAnalysis[area];
  data.avgSqmPrice = data.totalSqmPrice / data.count;
  data.avgPrice = data.totalPrice / data.count;
  data.avgArea = data.totalArea / data.count;
});

// Sort areas by efficiency (lowest sqm price = most efficient)
const sortedAreasByEfficiency = Object.entries(areaAnalysis)
  .sort((a, b) => a[1].avgSqmPrice - b[1].avgSqmPrice)
  .slice(0, 10); // Top 10 most efficient

console.log('\nTop 10 Most Square Meter Efficient Areas:');
sortedAreasByEfficiency.forEach(([area, data]) => {
  console.log(`${area}: €${data.avgSqmPrice.toFixed(0)}/sqm (${data.count} properties, avg €${data.avgPrice.toLocaleString()})`);
});

// Group by property type for type analysis
const typeAnalysis = {};
propertiesWithSqmPrice.forEach(p => {
  const type = p.propertyType;
  if (!typeAnalysis[type]) {
    typeAnalysis[type] = {
      count: 0,
      totalSqmPrice: 0,
      totalPrice: 0,
      totalArea: 0,
      properties: []
    };
  }
  typeAnalysis[type].count++;
  typeAnalysis[type].totalSqmPrice += p.pricePerSqm;
  typeAnalysis[type].totalPrice += p.soldPrice;
  typeAnalysis[type].totalArea += p.areaSqm;
  typeAnalysis[type].properties.push(p);
});

// Calculate type averages
Object.keys(typeAnalysis).forEach(type => {
  const data = typeAnalysis[type];
  data.avgSqmPrice = data.totalSqmPrice / data.count;
  data.avgPrice = data.totalPrice / data.count;
  data.avgArea = data.totalArea / data.count;
});

// Sort property types by efficiency
const sortedTypesByEfficiency = Object.entries(typeAnalysis)
  .sort((a, b) => a[1].avgSqmPrice - b[1].avgSqmPrice);

console.log('\nProperty Types by Square Meter Efficiency:');
sortedTypesByEfficiency.forEach(([type, data]) => {
  console.log(`${type}: €${data.avgSqmPrice.toFixed(0)}/sqm (${data.count} properties, avg €${data.avgPrice.toLocaleString()})`);
});

// Analyze size efficiency correlation
const sizeEfficiencyAnalysis = {};
propertiesWithSqmPrice.forEach(p => {
  const sizeBracket = Math.floor(p.areaSqm / 50) * 50; // Group by 50 sqm brackets
  const sizeRange = `${sizeBracket}-${sizeBracket + 49} sqm`;

  if (!sizeEfficiencyAnalysis[sizeRange]) {
    sizeEfficiencyAnalysis[sizeRange] = {
      count: 0,
      totalSqmPrice: 0,
      totalPrice: 0,
      avgArea: 0
    };
  }

  sizeEfficiencyAnalysis[sizeRange].count++;
  sizeEfficiencyAnalysis[sizeRange].totalSqmPrice += p.pricePerSqm;
  sizeEfficiencyAnalysis[sizeRange].totalPrice += p.soldPrice;
  sizeEfficiencyAnalysis[sizeRange].avgArea = (sizeEfficiencyAnalysis[sizeRange].avgArea * (sizeEfficiencyAnalysis[sizeRange].count - 1) + p.areaSqm) / sizeEfficiencyAnalysis[sizeRange].count;
});

// Calculate size bracket averages
Object.keys(sizeEfficiencyAnalysis).forEach(range => {
  const data = sizeEfficiencyAnalysis[range];
  if (data.count >= 10) { // Minimum 10 properties for reliability
    data.avgSqmPrice = data.totalSqmPrice / data.count;
    data.avgPrice = data.totalPrice / data.count;
  }
});

console.log('\nSize Efficiency Analysis (properties with 10+ samples):');
Object.entries(sizeEfficiencyAnalysis)
  .filter(([range, data]) => data.count >= 10)
  .sort((a, b) => {
    const aStart = parseInt(a[0].split('-')[0]);
    const bStart = parseInt(b[0].split('-')[0]);
    return aStart - bStart;
  })
  .forEach(([range, data]) => {
    console.log(`${range}: €${data.avgSqmPrice.toFixed(0)}/sqm (avg price €${data.avgPrice.toLocaleString()}, ${data.count} properties)`);
  });

// Efficiency vs market performance correlation
const efficiencyVsPerformance = Object.entries(areaAnalysis).map(([area, data]) => {
  // Calculate over-asking success rate
  const overAskingCount = data.properties.filter(p => p.overUnderPercent > 0).length;
  const overAskingRate = overAskingCount / data.count;

  // Calculate average premium
  const premiums = data.properties.filter(p => p.overUnderPercent > 0).map(p => p.overUnderPercent);
  const avgPremium = premiums.length > 0 ? premiums.reduce((a, b) => a + b, 0) / premiums.length : 0;

  return {
    area,
    sqmEfficiency: data.avgSqmPrice,
    overAskingRate,
    avgPremium,
    avgPrice: data.avgPrice,
    count: data.count
  };
});

const sortedEfficiencyVsPerformance = efficiencyVsPerformance
  .filter(item => item.count >= 20) // Minimum sample size
  .sort((a, b) => a.sqmEfficiency - b.sqmEfficiency);

console.log('\nEfficiency vs Market Performance Correlation:');
sortedEfficiencyVsPerformance.slice(0, 8).forEach(item => {
  console.log(`${item.area}: €${item.sqmEfficiency.toFixed(0)}/sqm, ${item.overAskingRate.toFixed(1)}% success, ${(item.avgPremium * 100).toFixed(1)}% premium`);
});

// Create chart data
const chartData = {
  sqmEfficiencyByArea: sortedEfficiencyVsPerformance.slice(0, 10).map(item => ({
    area: item.area,
    sqmPrice: Math.round(item.sqmEfficiency),
    avgPrice: Math.round(item.avgPrice),
    overAskingRate: item.overAskingRate,
    count: item.count
  })),

  propertyTypeEfficiency: sortedTypesByEfficiency.map(([type, data]) => ({
    type,
    sqmPrice: Math.round(data.avgSqmPrice),
    avgPrice: Math.round(data.avgPrice),
    avgArea: Math.round(data.avgArea),
    count: data.count
  })),

  sizeEfficiencyCurve: Object.entries(sizeEfficiencyAnalysis)
    .filter(([range, data]) => data.count >= 10)
    .sort((a, b) => {
      const aStart = parseInt(a[0].split('-')[0]);
      const bStart = parseInt(b[0].split('-')[0]);
      return aStart - bStart;
    })
    .map(([range, data]) => ({
      sizeRange: range,
      sqmPrice: Math.round(data.avgSqmPrice),
      avgPrice: Math.round(data.avgPrice),
      count: data.count
    })),

  efficiencyPerformanceCorrelation: sortedEfficiencyVsPerformance.map(item => ({
    area: item.area,
    sqmEfficiency: Math.round(item.sqmEfficiency),
    marketStrength: item.overAskingRate * 100,
    premium: item.avgPremium * 100
  }))
};

// Export chart data
fs.writeFileSync('blog53_square_meter_efficiency_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('\nChart data exported to blog53_square_meter_efficiency_chart_data.json');

// Summary statistics
const totalProperties = propertiesWithSqmPrice.length;
const avgSqmPrice = propertiesWithSqmPrice.reduce((sum, p) => sum + p.pricePerSqm, 0) / totalProperties;
const mostEfficientArea = sortedAreasByEfficiency[0];
const leastEfficientArea = sortedAreasByEfficiency[sortedAreasByEfficiency.length - 1];

console.log('\nSummary Statistics:');
console.log(`Total properties analyzed: ${totalProperties}`);
console.log(`Average Dublin sqm price: €${avgSqmPrice.toFixed(0)}`);
console.log(`Most efficient area: ${mostEfficientArea[0]} (€${mostEfficientArea[1].avgSqmPrice.toFixed(0)}/sqm)`);
console.log(`Least efficient area: ${leastEfficientArea[0]} (€${leastEfficientArea[1].avgSqmPrice.toFixed(0)}/sqm)`);
console.log(`Efficiency range: €${(leastEfficientArea[1].avgSqmPrice - mostEfficientArea[1].avgSqmPrice).toFixed(0)}/sqm difference`);
