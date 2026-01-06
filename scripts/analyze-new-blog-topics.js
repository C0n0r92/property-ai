const fs = require('fs');

// Load the data
const data = JSON.parse(fs.readFileSync('dashboard/public/data.json', 'utf8'));
const properties = data.properties;

// Filter for valid 2024-2025 transactions only (exclude future dates)
const validProperties = properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  const year = soldDate.getFullYear();
  return year >= 2024 && year <= 2025;
});

console.log(`Total properties: ${properties.length}`);
console.log(`Valid 2024-2025 properties: ${validProperties.length}`);
console.log(`Filtered out ${properties.length - validProperties.length} future/older transactions\n`);

// Analysis functions
function analyzeBathroomTrends() {
  console.log('=== BATHROOM ANALYSIS ===');

  // Group by bathroom count
  const bathroomStats = {};
  validProperties.forEach(p => {
    const baths = p.baths;
    if (!bathroomStats[baths]) {
      bathroomStats[baths] = {
        count: 0,
        totalPrice: 0,
        totalAskingPrice: 0,
        totalOverUnder: 0,
        totalSqm: 0,
        properties: []
      };
    }
    bathroomStats[baths].count++;
    bathroomStats[baths].totalPrice += p.soldPrice;
    bathroomStats[baths].totalAskingPrice += p.askingPrice;
    bathroomStats[baths].totalOverUnder += p.overUnderPercent;
    bathroomStats[baths].totalSqm += p.areaSqm;
    bathroomStats[baths].properties.push(p);
  });

  // Calculate averages and sort by bathroom count
  const results = Object.keys(bathroomStats)
    .map(baths => ({
      baths: parseInt(baths),
      count: bathroomStats[baths].count,
      avgPrice: Math.round(bathroomStats[baths].totalPrice / bathroomStats[baths].count),
      avgAskingPrice: Math.round(bathroomStats[baths].totalAskingPrice / bathroomStats[baths].count),
      avgOverUnder: (bathroomStats[baths].totalOverUnder / bathroomStats[baths].count).toFixed(2),
      avgSqm: Math.round(bathroomStats[baths].totalSqm / bathroomStats[baths].count)
    }))
    .filter(r => r.count >= 100) // Minimum sample size
    .sort((a, b) => a.baths - b.baths);

  console.log('| Baths | Count | Avg Price | Avg Asking | Over-Ask % | Avg Sqm |');
  console.log('|-------|--------|-----------|------------|------------|---------|');
  results.forEach(r => {
    console.log(`| ${r.baths} | ${r.count} | €${r.avgPrice.toLocaleString()} | €${r.avgAskingPrice.toLocaleString()} | ${r.avgOverUnder}% | ${r.avgSqm}sqm |`);
  });
  console.log();

  // Bathroom efficiency analysis
  console.log('Bathroom Efficiency (Price per Bathroom):');
  results.forEach(r => {
    const pricePerBath = Math.round(r.avgPrice / r.baths);
    const sqmPerBath = (r.avgSqm / r.baths).toFixed(1);
    console.log(`${r.baths} baths: €${pricePerBath.toLocaleString()} per bath, ${sqmPerBath}sqm per bath`);
  });
  console.log();
}

function analyzeSqmEfficiency() {
  console.log('=== SQUARE METER EFFICIENCY ANALYSIS ===');

  // Group by square meter brackets
  const sqmBrackets = [
    { min: 0, max: 50, label: 'Under 50sqm' },
    { min: 50, max: 80, label: '50-80sqm' },
    { min: 80, max: 110, label: '80-110sqm' },
    { min: 110, max: 140, label: '110-140sqm' },
    { min: 140, max: 180, label: '140-180sqm' },
    { min: 180, max: 250, label: '180-250sqm' },
    { min: 250, max: 999, label: 'Over 250sqm' }
  ];

  sqmBrackets.forEach(bracket => {
    const bracketProps = validProperties.filter(p =>
      p.areaSqm >= bracket.min && p.areaSqm < bracket.max
    );

    if (bracketProps.length >= 100) {
      const avgPrice = Math.round(bracketProps.reduce((sum, p) => sum + p.soldPrice, 0) / bracketProps.length);
      const avgPricePerSqm = Math.round(bracketProps.reduce((sum, p) => sum + p.pricePerSqm, 0) / bracketProps.length);
      const avgOverUnder = (bracketProps.reduce((sum, p) => sum + p.overUnderPercent, 0) / bracketProps.length).toFixed(2);

      console.log(`${bracket.label}: ${bracketProps.length} properties`);
      console.log(`  Avg Price: €${avgPrice.toLocaleString()}, Avg €/sqm: €${avgPricePerSqm}, Over-ask: ${avgOverUnder}%`);
    }
  });
  console.log();
}

function analyzeGeographicPatterns() {
  console.log('=== GEOGRAPHIC AREA ANALYSIS ===');

  // Group by Dublin postcode
  const areaStats = {};
  validProperties.forEach(p => {
    const area = p.dublinPostcode;
    if (area) {
      if (!areaStats[area]) {
        areaStats[area] = {
          count: 0,
          totalPrice: 0,
          totalOverUnder: 0,
          totalSqm: 0
        };
      }
      areaStats[area].count++;
      areaStats[area].totalPrice += p.soldPrice;
      areaStats[area].totalOverUnder += p.overUnderPercent;
      areaStats[area].totalSqm += p.areaSqm;
    }
  });

  // Calculate averages and find patterns
  const areaResults = Object.keys(areaStats)
    .map(area => ({
      area,
      count: areaStats[area].count,
      avgPrice: Math.round(areaStats[area].totalPrice / areaStats[area].count),
      avgOverUnder: (areaStats[area].totalOverUnder / areaStats[area].count).toFixed(2),
      avgSqm: Math.round(areaStats[area].totalSqm / areaStats[area].count)
    }))
    .filter(r => r.count >= 200) // Minimum sample size for reliability
    .sort((a, b) => b.avgPrice - a.avgPrice); // Sort by price descending

  console.log('Top 10 Dublin Areas by Average Price:');
  console.log('| Area | Count | Avg Price | Over-Ask % | Avg Sqm |');
  console.log('|------|--------|-----------|------------|---------|');
  areaResults.slice(0, 10).forEach(r => {
    console.log(`| ${r.area} | ${r.count} | €${r.avgPrice.toLocaleString()} | ${r.avgOverUnder}% | ${r.avgSqm}sqm |`);
  });
  console.log();

  // Find areas with highest over-asking success
  const highOverAskAreas = areaResults
    .filter(r => parseFloat(r.avgOverUnder) > 10)
    .sort((a, b) => parseFloat(b.avgOverUnder) - parseFloat(a.avgOverUnder))
    .slice(0, 5);

  console.log('Areas with Highest Over-Asking Success (>10%):');
  highOverAskAreas.forEach(r => {
    console.log(`${r.area}: ${r.avgOverUnder}% over-asking (${r.count} properties, avg €${r.avgPrice.toLocaleString()})`);
  });
  console.log();
}

function analyzePropertyTypePatterns() {
  console.log('=== PROPERTY TYPE CYCLES ===');

  // Group by property type and analyze performance patterns
  const typeStats = {};
  validProperties.forEach(p => {
    const type = p.propertyType;
    if (!typeStats[type]) {
      typeStats[type] = {
        count: 0,
        totalPrice: 0,
        totalOverUnder: 0,
        totalSqm: 0,
        pricePoints: []
      };
    }
    typeStats[type].count++;
    typeStats[type].totalPrice += p.soldPrice;
    typeStats[type].totalOverUnder += p.overUnderPercent;
    typeStats[type].totalSqm += p.areaSqm;
    typeStats[type].pricePoints.push(p.soldPrice);
  });

  // Calculate stats and find patterns
  const typeResults = Object.keys(typeStats)
    .map(type => {
      const stats = typeStats[type];
      const prices = stats.pricePoints.sort((a, b) => a - b);
      const medianPrice = prices[Math.floor(prices.length / 2)];
      const avgPrice = Math.round(stats.totalPrice / stats.count);
      const avgOverUnder = (stats.totalOverUnder / stats.count).toFixed(2);

      return {
        type,
        count: stats.count,
        avgPrice,
        medianPrice,
        avgOverUnder: parseFloat(avgOverUnder),
        avgSqm: Math.round(stats.totalSqm / stats.count)
      };
    })
    .filter(r => r.count >= 500) // Minimum sample size
    .sort((a, b) => b.avgOverUnder - a.avgOverUnder);

  console.log('Property Types by Over-Asking Success:');
  console.log('| Type | Count | Avg Price | Median Price | Over-Ask % | Avg Sqm |');
  console.log('|------|--------|-----------|--------------|------------|---------|');
  typeResults.forEach(r => {
    console.log(`| ${r.type} | ${r.count} | €${r.avgPrice.toLocaleString()} | €${r.medianPrice.toLocaleString()} | ${r.avgOverUnder.toFixed(2)}% | ${r.avgSqm}sqm |`);
  });
  console.log();
}

// Run all analyses
console.log('=== NEW BLOG TOPIC ANALYSIS ===\n');
analyzeBathroomTrends();
analyzeSqmEfficiency();
analyzeGeographicPatterns();
analyzePropertyTypePatterns();

console.log('=== POTENTIAL BLOG TOPICS IDENTIFIED ===');
console.log('1. Bathroom Premium Paradox - How properties with more bathrooms sell at discounts');
console.log('2. Square Meter Inefficiency Zones - Areas where space costs dramatically more');
console.log('3. Geographic Over-Asking Hotspots - Areas with systematic over-asking success patterns');
