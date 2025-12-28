const fs = require('fs');
const path = require('path');

// Read the data
const dataPath = path.join(__dirname, '../dashboard/public/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const props = data.properties.filter(p => new Date(p.soldDate) <= new Date('2025-12-31'));

// Dublin city center coordinates (GPO/Dublin Castle area)
const DUBLIN_CENTER_LAT = 53.3498;
const DUBLIN_CENTER_LNG = -6.2603;

// Haversine distance calculation function
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

console.log('=== BLOG 5: COMMUTER DISTANCE ANALYSIS ===\n');

// Filter properties with valid coordinates
const propsWithCoords = props.filter(p =>
  p.latitude && p.longitude &&
  !isNaN(p.latitude) && !isNaN(p.longitude)
);

console.log(`Total properties with coordinates: ${propsWithCoords.length.toLocaleString()}`);

// Add distance to each property
const propsWithDistance = propsWithCoords.map(p => ({
  ...p,
  distanceKm: calculateDistance(p.latitude, p.longitude, DUBLIN_CENTER_LAT, DUBLIN_CENTER_LNG)
}));

// Define distance rings
const distanceRings = [
  { name: '0-5km', min: 0, max: 5 },
  { name: '5-10km', min: 5, max: 10 },
  { name: '10-15km', min: 10, max: 15 },
  { name: '15-25km', min: 15, max: 25 }
];

console.log('\n📊 COMMUTER DISTANCE ANALYSIS');
console.log('=============================');

const ringAnalysis = distanceRings.map(ring => {
  const ringProps = propsWithDistance.filter(p => p.distanceKm >= ring.min && p.distanceKm < ring.max);
  if (ringProps.length < 100) return null; // Minimum sample size

  const avgPrice = Math.round(ringProps.reduce((sum, p) => sum + p.soldPrice, 0) / ringProps.length);
  const medianPrice = ringProps.map(p => p.soldPrice).sort((a,b) => a-b)[Math.floor(ringProps.length/2)];
  const avgSqm = ringProps.filter(p => p.areaSqm).length > 0 ?
    Math.round(ringProps.filter(p => p.areaSqm).reduce((sum, p) => sum + p.areaSqm, 0) / ringProps.filter(p => p.areaSqm).length) : 0;

  return {
    ring: ring.name,
    count: ringProps.length,
    percentage: ((ringProps.length / propsWithDistance.length) * 100).toFixed(1),
    avgPrice,
    medianPrice,
    avgSqm
  };
}).filter(Boolean);

console.log('| Distance Ring | Properties | Percentage | Avg Price | Median Price | Avg Size |');
console.log('|---------------|------------|------------|-----------|--------------|----------|');
ringAnalysis.forEach(ring => {
  console.log(`| ${ring.ring} | ${ring.count.toLocaleString()} | ${ring.percentage}% | €${ring.avgPrice.toLocaleString()} | €${ring.medianPrice.toLocaleString()} | ${ring.avgSqm}㎡ |`);
});

console.log('\n🏠 PROPERTY TYPE DISTRIBUTION BY DISTANCE');
console.log('=========================================');

// Analyze property types by distance ring
const typeByRing = {};
distanceRings.forEach(ring => {
  const ringProps = propsWithDistance.filter(p => p.distanceKm >= ring.min && p.distanceKm < ring.max);
  if (ringProps.length < 100) return;

  typeByRing[ring.name] = {};
  ringProps.forEach(p => {
    if (!typeByRing[ring.name][p.propertyType]) {
      typeByRing[ring.name][p.propertyType] = 0;
    }
    typeByRing[ring.name][p.propertyType]++;
  });
});

console.log('Property type distribution by distance ring:');
distanceRings.forEach(ring => {
  if (!typeByRing[ring.name]) return;
  const total = Object.values(typeByRing[ring.name]).reduce((sum, count) => sum + count, 0);
  const topTypes = Object.entries(typeByRing[ring.name])
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([type, count]) => `${type}: ${((count/total)*100).toFixed(1)}%`)
    .join(', ');
  console.log(`${ring.name}: ${topTypes}`);
});

console.log('\n💰 PRICE PER SQUARE METER BY DISTANCE');
console.log('=====================================');

// Analyze price per sqm by distance ring
const pricePerSqmByRing = distanceRings.map(ring => {
  const ringProps = propsWithDistance.filter(p =>
    p.distanceKm >= ring.min &&
    p.distanceKm < ring.max &&
    p.areaSqm &&
    p.areaSqm > 0
  );
  if (ringProps.length < 50) return null;

  const avgPricePerSqm = Math.round(ringProps.reduce((sum, p) => sum + (p.soldPrice / p.areaSqm), 0) / ringProps.length);

  return {
    ring: ring.name,
    count: ringProps.length,
    avgPricePerSqm,
    avgPrice: Math.round(ringProps.reduce((sum, p) => sum + p.soldPrice, 0) / ringProps.length)
  };
}).filter(Boolean);

console.log('| Distance Ring | Properties | Avg Price/㎡ | Avg Property Price |');
console.log('|---------------|------------|--------------|-------------------|');
pricePerSqmByRing.forEach(ring => {
  console.log(`| ${ring.ring} | ${ring.count.toLocaleString()} | €${ring.avgPricePerSqm} | €${ring.avgPrice.toLocaleString()} |`);
});

console.log('\n📈 OVER-ASKING PERFORMANCE BY DISTANCE');
console.log('=====================================');

// Analyze over-asking by distance ring
const overAskingByRing = distanceRings.map(ring => {
  const ringProps = propsWithDistance.filter(p =>
    p.distanceKm >= ring.min &&
    p.distanceKm < ring.max &&
    p.overUnderPercent !== null
  );
  if (ringProps.length < 100) return null;

  const overAskingProps = ringProps.filter(p => p.overUnderPercent > 0);
  const overRate = ((overAskingProps.length / ringProps.length) * 100).toFixed(1);
  const avgPremium = overAskingProps.length > 0 ?
    (overAskingProps.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAskingProps.length).toFixed(2) : '0.00';

  return {
    ring: ring.name,
    total: ringProps.length,
    overRate,
    avgPremium
  };
}).filter(Boolean);

console.log('| Distance Ring | Properties | Over-Asking Rate | Avg Premium |');
console.log('|---------------|------------|------------------|-------------|');
overAskingByRing.forEach(ring => {
  console.log(`| ${ring.ring} | ${ring.total.toLocaleString()} | ${ring.overRate}% | ${ring.avgPremium}% |`);
});

console.log('\n🚇 BEDROOM DISTRIBUTION BY DISTANCE');
console.log('==================================');

// Analyze bedroom distribution by distance
const bedroomByRing = {};
distanceRings.forEach(ring => {
  const ringProps = propsWithDistance.filter(p => p.distanceKm >= ring.min && p.distanceKm < ring.max);
  if (ringProps.length < 100) return;

  bedroomByRing[ring.name] = {};
  ringProps.forEach(p => {
    const beds = p.beds || 'Unknown';
    if (!bedroomByRing[ring.name][beds]) {
      bedroomByRing[ring.name][beds] = 0;
    }
    bedroomByRing[ring.name][beds]++;
  });
});

console.log('Bedroom distribution by distance ring:');
distanceRings.forEach(ring => {
  if (!bedroomByRing[ring.name]) return;
  const total = Object.values(bedroomByRing[ring.name]).reduce((sum, count) => sum + count, 0);
  const bedStats = Object.entries(bedroomByRing[ring.name])
    .filter(([beds]) => beds !== 'Unknown' && !isNaN(beds))
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([beds, count]) => `${beds} beds: ${((count/total)*100).toFixed(1)}%`)
    .join(', ');
  console.log(`${ring.name}: ${bedStats}`);
});

console.log('\n🏘️  YIELD ANALYSIS BY DISTANCE');
console.log('=============================');

// Analyze yield by distance ring
const yieldByRing = distanceRings.map(ring => {
  const ringProps = propsWithDistance.filter(p =>
    p.distanceKm >= ring.min &&
    p.distanceKm < ring.max &&
    p.yieldEstimate?.grossYield &&
    p.yieldEstimate.grossYield > 0
  );
  if (ringProps.length < 50) return null;

  const avgYield = (ringProps.reduce((sum, p) => sum + p.yieldEstimate.grossYield, 0) / ringProps.length).toFixed(2);

  return {
    ring: ring.name,
    count: ringProps.length,
    avgYield
  };
}).filter(Boolean);

console.log('| Distance Ring | Properties | Avg Yield |');
console.log('|---------------|------------|-----------|');
yieldByRing.forEach(ring => {
  console.log(`| ${ring.ring} | ${ring.count.toLocaleString()} | ${ring.avgYield}% |`);
});

// Generate chart data for visualization
const chartData = {
  priceByDistance: ringAnalysis.map(ring => ({
    ring: ring.ring,
    avgPrice: ring.avgPrice,
    medianPrice: ring.medianPrice,
    count: ring.count
  })),
  pricePerSqmByDistance: pricePerSqmByRing.map(ring => ({
    ring: ring.ring,
    pricePerSqm: ring.avgPricePerSqm,
    avgPrice: ring.avgPrice
  })),
  overAskingByDistance: overAskingByRing.map(ring => ({
    ring: ring.ring,
    overRate: parseFloat(ring.overRate),
    avgPremium: parseFloat(ring.avgPremium)
  })),
  yieldByDistance: yieldByRing.map(ring => ({
    ring: ring.ring,
    avgYield: parseFloat(ring.avgYield),
    count: ring.count
  })),
  propertySizeByDistance: ringAnalysis.map(ring => ({
    ring: ring.ring,
    avgSqm: ring.avgSqm,
    avgPrice: ring.avgPrice
  }))
};

// Save chart data for blog
const outputPath = path.join(__dirname, '../blogs/blog5_commuter_calculation_chart_data.json');
fs.writeFileSync(outputPath, JSON.stringify(chartData, null, 2));
console.log(`\n📈 Chart data saved to: ${outputPath}`);

console.log('\n✅ BLOG 5 ANALYSIS COMPLETE');
console.log('Key insights:');
console.log(`• ${propsWithDistance.length.toLocaleString()} properties analyzed with distance calculations`);
console.log(`• Price range: ${ringAnalysis[0]?.medianPrice.toLocaleString()}-${ringAnalysis[ringAnalysis.length-1]?.medianPrice.toLocaleString()} € from city center to suburbs`);
console.log(`• Property sizes: ${ringAnalysis.map(r => `${r.ring}: ${r.avgSqm}㎡`).join(', ')}`);
console.log(`• Over-asking rates: ${overAskingByRing.map(r => `${r.ring}: ${r.overRate}%`).join(', ')}`);
console.log(`• Yields decrease with distance: ${yieldByRing.map(r => `${r.ring}: ${r.avgYield}%`).join(', ')}`);
