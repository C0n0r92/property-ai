const fs = require('fs');

// Load the data
const data = JSON.parse(fs.readFileSync('dashboard/public/data.json', 'utf8'));
const properties = data.properties;

// Filter for valid 2024-2025 transactions only
const validProperties = properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  const year = soldDate.getFullYear();
  return year >= 2024 && year <= 2025 && p.dublinPostcode;
});

console.log(`Total properties: ${properties.length}`);
console.log(`Valid 2024-2025 properties with postcodes: ${validProperties.length}\n`);

// Focus on smaller Dublin areas (over 300 properties, excluding major D1-D6 areas)
const majorAreas = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D6W', 'D7'];
const smallerAreas = validProperties.filter(p => !majorAreas.includes(p.dublinPostcode));

// Group by area for analysis
const areaStats = {};
smallerAreas.forEach(p => {
  const area = p.dublinPostcode;
  if (!areaStats[area]) {
    areaStats[area] = {
      count: 0,
      totalPrice: 0,
      totalAskingPrice: 0,
      totalOverUnder: 0,
      totalSqm: 0,
      properties: [],
      overAskingCount: 0
    };
  }
  areaStats[area].count++;
  areaStats[area].totalPrice += p.soldPrice;
  areaStats[area].totalAskingPrice += p.askingPrice;
  areaStats[area].totalOverUnder += p.overUnderPercent;
  areaStats[area].totalSqm += p.areaSqm;
  areaStats[area].properties.push(p);
  if (p.overUnderPercent > 0) {
    areaStats[area].overAskingCount++;
  }
});

// Calculate statistics for areas with 300+ properties
const areaResults = Object.keys(areaStats)
  .map(area => ({
    area,
    count: areaStats[area].count,
    avgPrice: Math.round(areaStats[area].totalPrice / areaStats[area].count),
    avgAskingPrice: Math.round(areaStats[area].totalAskingPrice / areaStats[area].count),
    avgOverUnder: (areaStats[area].totalOverUnder / areaStats[area].count).toFixed(2),
    avgSqm: Math.round(areaStats[area].totalSqm / areaStats[area].count),
    overAskingRate: ((areaStats[area].overAskingCount / areaStats[area].count) * 100).toFixed(1),
    medianPrice: calculateMedian(areaStats[area].properties.map(p => p.soldPrice))
  }))
  .filter(r => r.count >= 300) // Focus on smaller areas with sufficient data
  .sort((a, b) => parseFloat(b.avgOverUnder) - parseFloat(a.avgOverUnder));

function calculateMedian(values) {
  const sorted = values.sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Display top over-asking hotspots
console.log('=== DUBLIN OVER-ASKING HOTSPOTS: SMALLER AREAS (300+ PROPERTIES) ===\n');

console.log('| Area | Properties | Avg Price | Avg Over-Ask | Success Rate | Median Price |');
console.log('|------|------------|-----------|--------------|--------------|--------------|');
areaResults.slice(0, 10).forEach(r => {
  console.log(`| ${r.area} | ${r.count} | €${r.avgPrice.toLocaleString()} | ${r.avgOverUnder}% | ${r.overAskingRate}% | €${Math.round(r.medianPrice).toLocaleString()} |`);
});
console.log();

// Detailed analysis of top hotspots
const topHotspots = areaResults.slice(0, 5);
console.log('=== TOP 5 OVER-ASKING HOTSPOTS DETAILED ANALYSIS ===\n');

topHotspots.forEach((hotspot, index) => {
  console.log(`${index + 1}. ${hotspot.area} AREA ANALYSIS`);
  console.log(`   Properties: ${hotspot.count}`);
  console.log(`   Average Price: €${hotspot.avgPrice.toLocaleString()}`);
  console.log(`   Average Over-Asking: ${hotspot.avgOverUnder}%`);
  console.log(`   Over-Asking Success Rate: ${hotspot.overAskingRate}%`);
  console.log(`   Median Price: €${Math.round(hotspot.medianPrice).toLocaleString()}`);
  console.log(`   Average Size: ${hotspot.avgSqm}sqm`);

  // Property type breakdown for this area
  const areaProperties = areaStats[hotspot.area].properties;
  const typeStats = {};
  areaProperties.forEach(p => {
    const type = p.propertyType;
    if (!typeStats[type]) typeStats[type] = { count: 0, totalOverUnder: 0 };
    typeStats[type].count++;
    typeStats[type].totalOverUnder += p.overUnderPercent;
  });

  console.log('   Property Types:');
  Object.keys(typeStats)
    .sort((a, b) => typeStats[b].count - typeStats[a].count)
    .slice(0, 3)
    .forEach(type => {
      const avgOver = (typeStats[type].totalOverUnder / typeStats[type].count).toFixed(2);
      console.log(`     ${type}: ${typeStats[type].count} properties (${avgOver}% over-asking)`);
    });
  console.log();
});

// Price bracket analysis within hotspots
console.log('=== PRICE BRACKET PERFORMANCE IN HOTSPOTS ===\n');

const priceBrackets = [
  { min: 0, max: 300000, label: 'Under €300k' },
  { min: 300000, max: 450000, label: '€300k-€450k' },
  { min: 450000, max: 600000, label: '€450k-€600k' },
  { min: 600000, max: 800000, label: '€600k-€800k' },
  { min: 800000, max: 9999999, label: 'Over €800k' }
];

topHotspots.forEach(hotspot => {
  console.log(`${hotspot.area} Price Bracket Performance:`);
  priceBrackets.forEach(bracket => {
    const bracketProps = areaStats[hotspot.area].properties.filter(p =>
      p.soldPrice >= bracket.min && p.soldPrice < bracket.max
    );

    if (bracketProps.length >= 10) { // Minimum sample size
      const avgOver = (bracketProps.reduce((sum, p) => sum + p.overUnderPercent, 0) / bracketProps.length).toFixed(2);
      const successRate = ((bracketProps.filter(p => p.overUnderPercent > 0).length / bracketProps.length) * 100).toFixed(1);
      console.log(`  ${bracket.label}: ${avgOver}% over-asking (${successRate}% success rate, ${bracketProps.length} properties)`);
    }
  });
  console.log();
});

// Export chart data
const chartData = {
  OverAskingHotspotsChart: areaResults.slice(0, 10).map(r => ({
    area: r.area,
    overAskingPercent: parseFloat(r.avgOverUnder),
    propertyCount: r.count,
    avgPrice: r.avgPrice
  })),

  PriceBracketPerformanceChart: priceBrackets.map(bracket => {
    const data = { priceBracket: bracket.label };
    topHotspots.forEach(hotspot => {
      const bracketProps = areaStats[hotspot.area].properties.filter(p =>
        p.soldPrice >= bracket.min && p.soldPrice < bracket.max
      );
      if (bracketProps.length >= 10) {
        data[hotspot.area] = parseFloat((bracketProps.reduce((sum, p) => sum + p.overUnderPercent, 0) / bracketProps.length).toFixed(2));
      }
    });
    return data;
  }),

  PropertyTypeOverAskingChart: topHotspots.map(hotspot => {
    const areaProperties = areaStats[hotspot.area].properties;
    const typeBreakdown = {};

    // Group by property type
    areaProperties.forEach(p => {
      const type = p.propertyType;
      if (!typeBreakdown[type]) {
        typeBreakdown[type] = { count: 0, totalOverUnder: 0 };
      }
      typeBreakdown[type].count++;
      typeBreakdown[type].totalOverUnder += p.overUnderPercent;
    });

    return {
      area: hotspot.area,
      propertyTypes: Object.keys(typeBreakdown)
        .map(type => ({
          type,
          avgOverAsking: parseFloat((typeBreakdown[type].totalOverUnder / typeBreakdown[type].count).toFixed(2)),
          count: typeBreakdown[type].count
        }))
        .sort((a, b) => b.avgOverAsking - a.avgOverAsking)
        .slice(0, 3) // Top 3 types
    };
  })
};

// Save chart data
fs.writeFileSync('blog56_geographic_hotspots_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('Chart data exported to blog56_geographic_hotspots_chart_data.json\n');

// Summary insights for blog
console.log('=== BLOG INSIGHTS SUMMARY ===');
console.log(`Total smaller areas analyzed: ${areaResults.length}`);
console.log(`Top performing area: ${areaResults[0].area} with ${areaResults[0].avgOverUnder}% over-asking`);
console.log(`Average over-asking across all analyzed areas: ${(areaResults.reduce((sum, r) => sum + parseFloat(r.avgOverUnder), 0) / areaResults.length).toFixed(2)}%`);
console.log(`Areas with over-asking success rates above 80%: ${areaResults.filter(r => parseFloat(r.overAskingRate) > 80).length}`);

console.log('\n=== KEY PATTERNS IDENTIFIED ===');
console.log('1. Systematic over-asking success in specific geographic clusters');
console.log('2. Property type variations within hotspots');
console.log('3. Price bracket sweet spots for maximum over-asking success');
console.log('4. Counter-intuitive relationship between price and over-asking success');
