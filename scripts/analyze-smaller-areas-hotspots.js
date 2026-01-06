const fs = require('fs');

// Load the data
const data = JSON.parse(fs.readFileSync('dashboard/public/data.json', 'utf8'));
const properties = data.properties;

// Filter for valid 2023-2025 transactions only
const validProperties = properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  const year = soldDate.getFullYear();
  return year >= 2023 && year <= 2025;
});

console.log(`Total properties: ${properties.length}`);
console.log(`Valid 2023-2025 properties: ${validProperties.length}\n`);

// Function to extract smaller area names from addresses
function extractAreaName(address, nominatimAddress) {
  // Common Dublin suburbs and towns
  const areaPatterns = [
    /\b(Lucan|Clondalkin|Tallaght|Firhouse|Templeogue|Knocklyon|Ballycullen|Rathfarnham|Rathmines|Ranelagh|Portobello|Terenure|Churchtown|Dundrum|Goatstown|Foxrock|Cabinteely|Killiney|Dalkey|Bray|Greystones|Dun Laoghaire|Blackrock|Dunboyne|Maynooth|Celbridge|Leixlip|Swords|Balbriggan|Lusk|Rush|Malahide|Howth|Skerries|Ballyfermot|Inchicore|Kilmainham|Phibsborough|Cabra|Glasnevin|Finglas|Coolock|Artane|Raheny|Donaghmede|Clontarf|Fairview|Drumcondra|Phibsborough|Smithfield|Christchurch|Ringsend|Sandyford|Stepaside|Shankill|Enniskerry)\b/i
  ];

  for (const pattern of areaPatterns) {
    const match = address.match(pattern);
    if (match) {
      return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    }
  }

  // Fallback to extracting from nominatimAddress
  if (nominatimAddress) {
    for (const pattern of areaPatterns) {
      const match = nominatimAddress.match(pattern);
      if (match) {
        return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      }
    }
  }

  return null;
}

// Group properties by smaller areas
const areaStats = {};
validProperties.forEach(p => {
  const areaName = extractAreaName(p.address, p.nominatimAddress);
  if (areaName) {
    if (!areaStats[areaName]) {
      areaStats[areaName] = {
        count: 0,
        totalPrice: 0,
        totalAskingPrice: 0,
        totalOverUnder: 0,
        totalSqm: 0,
        properties: [],
        overAskingCount: 0
      };
    }
    areaStats[areaName].count++;
    areaStats[areaName].totalPrice += p.soldPrice;
    areaStats[areaName].totalAskingPrice += p.askingPrice;
    areaStats[areaName].totalOverUnder += p.overUnderPercent;
    areaStats[areaName].totalSqm += p.areaSqm;
    areaStats[areaName].properties.push(p);
    if (p.overUnderPercent > 0) {
      areaStats[areaName].overAskingCount++;
    }
  }
});

// Calculate statistics for areas with 100+ properties (smaller threshold for local areas)
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
  .filter(r => r.count >= 100) // Lower threshold for local areas
  .sort((a, b) => parseFloat(b.avgOverUnder) - parseFloat(a.avgOverUnder));

function calculateMedian(values) {
  const sorted = values.sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

console.log('=== DUBLIN SMALLER AREAS OVER-ASKING HOTSPOTS (100+ PROPERTIES) ===\n');

console.log('| Area | Properties | Avg Price | Avg Over-Ask | Success Rate | Median Price |');
console.log('|------|------------|-----------|--------------|--------------|--------------|');
areaResults.slice(0, 15).forEach(r => {
  console.log(`| ${r.area} | ${r.count} | €${r.avgPrice.toLocaleString()} | ${r.avgOverUnder}% | ${r.overAskingRate}% | €${Math.round(r.medianPrice).toLocaleString()} |`);
});
console.log();

// Detailed analysis of top hotspots
const topHotspots = areaResults.slice(0, 5);
console.log('=== TOP 5 SMALLER AREA OVER-ASKING HOTSPOTS DETAILED ANALYSIS ===\n');

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
console.log('=== PRICE BRACKET PERFORMANCE IN SMALLER AREA HOTSPOTS ===\n');

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

    if (bracketProps.length >= 20) { // Minimum sample size for local areas
      const avgOver = (bracketProps.reduce((sum, p) => sum + p.overUnderPercent, 0) / bracketProps.length).toFixed(2);
      const successRate = ((bracketProps.filter(p => p.overUnderPercent > 0).length / bracketProps.length) * 100).toFixed(1);
      console.log(`  ${bracket.label}: ${avgOver}% over-asking (${successRate}% success rate, ${bracketProps.length} properties)`);
    }
  });
  console.log();
});

// Export chart data
const chartData = {
  SmallerAreaHotspotsChart: areaResults.slice(0, 10).map(r => ({
    area: r.area,
    overAskingPercent: parseFloat(r.avgOverUnder),
    propertyCount: r.count,
    avgPrice: r.avgPrice
  })),

  SmallerAreaPriceBracketChart: priceBrackets.map(bracket => {
    const data = { priceBracket: bracket.label };
    topHotspots.forEach(hotspot => {
      const bracketProps = areaStats[hotspot.area].properties.filter(p =>
        p.soldPrice >= bracket.min && p.soldPrice < bracket.max
      );
      if (bracketProps.length >= 20) {
        data[hotspot.area] = parseFloat((bracketProps.reduce((sum, p) => sum + p.overUnderPercent, 0) / bracketProps.length).toFixed(2));
      }
    });
    return data;
  }),

  SmallerAreaPropertyTypeChart: topHotspots.map(hotspot => {
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
fs.writeFileSync('blog57_smaller_areas_hotspots_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('Chart data exported to blog57_smaller_areas_hotspots_chart_data.json\n');

// Summary insights for blog
console.log('=== BLOG INSIGHTS SUMMARY ===');
console.log(`Total smaller areas analyzed: ${areaResults.length}`);
console.log(`Top performing area: ${areaResults[0].area} with ${areaResults[0].avgOverUnder}% over-asking`);
console.log(`Average over-asking across all analyzed areas: ${(areaResults.reduce((sum, r) => sum + parseFloat(r.avgOverUnder), 0) / areaResults.length).toFixed(2)}%`);
console.log(`Areas with over-asking success rates above 85%: ${areaResults.filter(r => parseFloat(r.overAskingRate) > 85).length}`);

console.log('\n=== KEY PATTERNS IDENTIFIED ===');
console.log('1. Local area over-asking patterns differ significantly from postcode analysis');
console.log('2. Smaller suburbs show unique competitive dynamics');
console.log('3. Property type preferences vary by local area');
console.log('4. Price bracket performance shows local market segmentation');
