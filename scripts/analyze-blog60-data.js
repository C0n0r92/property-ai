const fs = require('fs');

// Load consolidated data
const data = JSON.parse(fs.readFileSync('dashboard/public/data.json', 'utf8'));

// Filter to valid 2024-2025 transactions only
const validProperties = data.properties.filter(p => {
  const year = p.soldDate?.substring(0, 4);
  return year === '2024' || year === '2025';
});

console.log('=== D8 AREA DEEP DIVE ANALYSIS ===\n');
console.log(`Total valid 2024-2025 transactions: ${validProperties.length.toLocaleString()}`);

// Filter to D8 only
const d8Properties = validProperties.filter(p => p.dublinPostcode === 'D8');
console.log(`D8 transactions: ${d8Properties.length.toLocaleString()}\n`);

// === MARKET OVERVIEW ===
console.log('=== MARKET OVERVIEW ===');
const d8Prices = d8Properties.map(p => p.soldPrice).filter(Boolean);
const avgPrice = d8Prices.reduce((a, b) => a + b, 0) / d8Prices.length;
const medianPrice = d8Prices.sort((a, b) => a - b)[Math.floor(d8Prices.length / 2)];
const minPrice = Math.min(...d8Prices);
const maxPrice = Math.max(...d8Prices);

console.log(`Average sold price: €${Math.round(avgPrice).toLocaleString()}`);
console.log(`Median sold price: €${Math.round(medianPrice).toLocaleString()}`);
console.log(`Price range: €${minPrice.toLocaleString()} - €${maxPrice.toLocaleString()}\n`);

// Over/under asking analysis
const d8WithAsking = d8Properties.filter(p => p.overUnderPercent !== null && p.overUnderPercent !== undefined);
const avgOverUnder = d8WithAsking.reduce((a, b) => a + b.overUnderPercent, 0) / d8WithAsking.length;
const overAsking = d8WithAsking.filter(p => p.overUnderPercent > 0).length;
const overAskingPct = (overAsking / d8WithAsking.length) * 100;

console.log(`Average over/under asking: ${avgOverUnder.toFixed(2)}%`);
console.log(`Properties sold over asking: ${overAskingPct.toFixed(1)}% (${overAsking}/${d8WithAsking.length})\n`);

// === PROPERTY TYPE BREAKDOWN ===
console.log('=== PROPERTY TYPE BREAKDOWN ===');
const typeStats = {};
d8Properties.forEach(p => {
  if (!p.propertyType) return;
  if (!typeStats[p.propertyType]) {
    typeStats[p.propertyType] = {
      count: 0,
      prices: [],
      overUnder: []
    };
  }
  typeStats[p.propertyType].count++;
  if (p.soldPrice) typeStats[p.propertyType].prices.push(p.soldPrice);
  if (p.overUnderPercent !== null && p.overUnderPercent !== undefined) {
    typeStats[p.propertyType].overUnder.push(p.overUnderPercent);
  }
});

const typeTable = Object.entries(typeStats)
  .filter(([_, stats]) => stats.count >= 20) // Only include types with 20+ sales
  .map(([type, stats]) => {
    const avgPrice = stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length;
    const avgOU = stats.overUnder.length > 0
      ? stats.overUnder.reduce((a, b) => a + b, 0) / stats.overUnder.length
      : 0;
    return {
      type,
      count: stats.count,
      avgPrice: Math.round(avgPrice),
      avgOverUnder: avgOU.toFixed(2)
    };
  })
  .sort((a, b) => b.count - a.count);

console.log('\n| Property Type | Sales | Avg Price | Avg Over/Under |');
console.log('|--------------|-------|-----------|----------------|');
typeTable.forEach(row => {
  console.log(`| ${row.type} | ${row.count} | €${row.avgPrice.toLocaleString()} | ${row.avgOverUnder}% |`);
});

// === PRICE PER SQM ANALYSIS ===
console.log('\n=== PRICE PER SQM ANALYSIS ===');
const d8WithSqm = d8Properties.filter(p => p.pricePerSqm && p.areaSqm);
const avgPricePerSqm = d8WithSqm.reduce((a, b) => a + b.pricePerSqm, 0) / d8WithSqm.length;
console.log(`Average price per sqm: €${Math.round(avgPricePerSqm).toLocaleString()}`);
console.log(`Properties with sqm data: ${d8WithSqm.length}/${d8Properties.length}\n`);

// Price per sqm by property type
const sqmByType = {};
d8WithSqm.forEach(p => {
  if (!sqmByType[p.propertyType]) {
    sqmByType[p.propertyType] = { prices: [], areas: [] };
  }
  sqmByType[p.propertyType].prices.push(p.pricePerSqm);
  sqmByType[p.propertyType].areas.push(p.areaSqm);
});

const sqmTable = Object.entries(sqmByType)
  .filter(([_, stats]) => stats.prices.length >= 10)
  .map(([type, stats]) => {
    const avgPricePerSqm = stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length;
    const avgArea = stats.areas.reduce((a, b) => a + b, 0) / stats.areas.length;
    return {
      type,
      count: stats.prices.length,
      avgPricePerSqm: Math.round(avgPricePerSqm),
      avgArea: Math.round(avgArea)
    };
  })
  .sort((a, b) => b.avgPricePerSqm - a.avgPricePerSqm);

console.log('| Property Type | Sample | Avg €/sqm | Avg Size (sqm) |');
console.log('|--------------|--------|-----------|----------------|');
sqmTable.forEach(row => {
  console.log(`| ${row.type} | ${row.count} | €${row.avgPricePerSqm.toLocaleString()} | ${row.avgArea}sqm |`);
});

// === BEDROOM BREAKDOWN ===
console.log('\n=== BEDROOM BREAKDOWN ===');
const bedStats = {};
d8Properties.forEach(p => {
  if (!p.beds || p.beds === 0) return;
  if (!bedStats[p.beds]) {
    bedStats[p.beds] = { count: 0, prices: [], overUnder: [] };
  }
  bedStats[p.beds].count++;
  if (p.soldPrice) bedStats[p.beds].prices.push(p.soldPrice);
  if (p.overUnderPercent !== null && p.overUnderPercent !== undefined) {
    bedStats[p.beds].overUnder.push(p.overUnderPercent);
  }
});

const bedTable = Object.entries(bedStats)
  .filter(([_, stats]) => stats.count >= 20)
  .map(([beds, stats]) => {
    const avgPrice = stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length;
    const avgOU = stats.overUnder.length > 0
      ? stats.overUnder.reduce((a, b) => a + b, 0) / stats.overUnder.length
      : 0;
    return {
      beds: parseInt(beds),
      count: stats.count,
      avgPrice: Math.round(avgPrice),
      avgOverUnder: avgOU.toFixed(2)
    };
  })
  .sort((a, b) => a.beds - b.beds);

console.log('\n| Bedrooms | Sales | Avg Price | Avg Over/Under |');
console.log('|----------|-------|-----------|----------------|');
bedTable.forEach(row => {
  console.log(`| ${row.beds} bed | ${row.count} | €${row.avgPrice.toLocaleString()} | ${row.avgOverUnder}% |`);
});

// === PRICE BAND ANALYSIS ===
console.log('\n=== PRICE BAND ANALYSIS ===');
const bands = [
  { min: 0, max: 300000, label: 'Under €300k' },
  { min: 300000, max: 400000, label: '€300k-€400k' },
  { min: 400000, max: 500000, label: '€400k-€500k' },
  { min: 500000, max: 600000, label: '€500k-€600k' },
  { min: 600000, max: 750000, label: '€600k-€750k' },
  { min: 750000, max: 1000000, label: '€750k-€1m' },
  { min: 1000000, max: Infinity, label: 'Over €1m' }
];

const bandStats = bands.map(band => {
  const props = d8Properties.filter(p => p.soldPrice >= band.min && p.soldPrice < band.max);
  return {
    label: band.label,
    count: props.length,
    pct: ((props.length / d8Properties.length) * 100).toFixed(1)
  };
}).filter(b => b.count > 0);

console.log('\n| Price Band | Sales | % of Market |');
console.log('|------------|-------|-------------|');
bandStats.forEach(row => {
  console.log(`| ${row.label} | ${row.count} | ${row.pct}% |`);
});

// === YIELD ANALYSIS ===
console.log('\n=== INVESTOR YIELD ANALYSIS ===');
const d8WithYield = d8Properties.filter(p => p.yieldEstimate && p.yieldEstimate.grossYield);
console.log(`Properties with yield data: ${d8WithYield.length}/${d8Properties.length}`);

if (d8WithYield.length >= 50) {
  const avgYield = d8WithYield.reduce((a, b) => a + b.yieldEstimate.grossYield, 0) / d8WithYield.length;
  console.log(`Average gross yield: ${avgYield.toFixed(2)}%`);

  const highYield = d8WithYield.filter(p => p.yieldEstimate.grossYield >= 6).length;
  const highYieldPct = (highYield / d8WithYield.length) * 100;
  console.log(`Properties with 6%+ yield: ${highYield} (${highYieldPct.toFixed(1)}%)`);

  // Yield by property type
  const yieldByType = {};
  d8WithYield.forEach(p => {
    if (!yieldByType[p.propertyType]) {
      yieldByType[p.propertyType] = { yields: [], count: 0 };
    }
    yieldByType[p.propertyType].yields.push(p.yieldEstimate.grossYield);
    yieldByType[p.propertyType].count++;
  });

  console.log('\nYield by property type:');
  Object.entries(yieldByType)
    .filter(([_, stats]) => stats.count >= 10)
    .map(([type, stats]) => {
      const avgYield = stats.yields.reduce((a, b) => a + b, 0) / stats.yields.length;
      return { type, avgYield: avgYield.toFixed(2), count: stats.count };
    })
    .sort((a, b) => parseFloat(b.avgYield) - parseFloat(a.avgYield))
    .forEach(row => {
      console.log(`  ${row.type}: ${row.avgYield}% (n=${row.count})`);
    });
}

// === COMPARISON WITH DUBLIN AVERAGE ===
console.log('\n=== D8 vs DUBLIN AVERAGE ===');
const dublinAvgPrice = validProperties.reduce((a, b) => a + b.soldPrice, 0) / validProperties.length;
const dublinAvgOU = validProperties
  .filter(p => p.overUnderPercent !== null && p.overUnderPercent !== undefined)
  .reduce((a, b) => a + b.overUnderPercent, 0) /
  validProperties.filter(p => p.overUnderPercent !== null && p.overUnderPercent !== undefined).length;

const priceDiff = ((avgPrice - dublinAvgPrice) / dublinAvgPrice) * 100;
const ouDiff = avgOverUnder - dublinAvgOU;

console.log(`D8 avg price: €${Math.round(avgPrice).toLocaleString()}`);
console.log(`Dublin avg price: €${Math.round(dublinAvgPrice).toLocaleString()}`);
console.log(`D8 price premium/discount: ${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(1)}%`);
console.log(`D8 over/under: ${avgOverUnder.toFixed(2)}%`);
console.log(`Dublin over/under: ${dublinAvgOU.toFixed(2)}%`);
console.log(`Competition difference: ${ouDiff > 0 ? '+' : ''}${ouDiff.toFixed(2)} percentage points\n`);

// === COMPETITIVE HOTSPOTS ===
console.log('=== MOST COMPETITIVE SEGMENTS ===');
const segments = [];

// Analyze by property type
Object.entries(typeStats).forEach(([type, stats]) => {
  if (stats.count >= 30 && stats.overUnder.length >= 20) {
    const avgOU = stats.overUnder.reduce((a, b) => a + b, 0) / stats.overUnder.length;
    const overAskingPct = (stats.overUnder.filter(ou => ou > 0).length / stats.overUnder.length) * 100;
    segments.push({
      segment: `${type}`,
      avgOverUnder: avgOU.toFixed(2),
      overAskingPct: overAskingPct.toFixed(1),
      count: stats.count
    });
  }
});

segments.sort((a, b) => parseFloat(b.avgOverUnder) - parseFloat(a.avgOverUnder));
console.log('\n| Segment | Avg Over/Under | % Over Asking | Sample |');
console.log('|---------|----------------|---------------|--------|');
segments.slice(0, 5).forEach(row => {
  console.log(`| ${row.segment} | ${row.avgOverUnder}% | ${row.overAskingPct}% | ${row.count} |`);
});

// === SEASONAL PATTERNS ===
console.log('\n=== SEASONAL PATTERNS (2024-2025) ===');
const monthlyStats = {};
d8Properties.forEach(p => {
  if (!p.soldDate) return;
  const month = p.soldDate.substring(0, 7); // YYYY-MM
  if (!monthlyStats[month]) {
    monthlyStats[month] = { count: 0, prices: [] };
  }
  monthlyStats[month].count++;
  if (p.soldPrice) monthlyStats[month].prices.push(p.soldPrice);
});

const monthlyData = Object.entries(monthlyStats)
  .map(([month, stats]) => ({
    month,
    count: stats.count,
    avgPrice: stats.prices.length > 0
      ? Math.round(stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length)
      : 0
  }))
  .sort((a, b) => a.month.localeCompare(b.month));

console.log('\nMonthly transaction volume and average prices:');
monthlyData.forEach(row => {
  if (row.count >= 10) {
    console.log(`  ${row.month}: ${row.count} sales, avg €${row.avgPrice.toLocaleString()}`);
  }
});

// === EXPORT CHART DATA ===
const chartData = {
  priceByPropertyType: typeTable.map(row => ({
    type: row.type,
    avgPrice: row.avgPrice,
    count: row.count
  })),
  pricePerSqmByType: sqmTable.map(row => ({
    type: row.type,
    pricePerSqm: row.avgPricePerSqm,
    avgArea: row.avgArea
  })),
  priceByBedrooms: bedTable.map(row => ({
    beds: row.beds,
    avgPrice: row.avgPrice,
    count: row.count
  })),
  priceBands: bandStats.map(row => ({
    label: row.label,
    count: row.count,
    pct: parseFloat(row.pct)
  })),
  monthlyVolume: monthlyData.filter(m => m.count >= 10).map(row => ({
    month: row.month,
    count: row.count,
    avgPrice: row.avgPrice
  })),
  overviewMetrics: {
    totalSales: d8Properties.length,
    avgPrice: Math.round(avgPrice),
    medianPrice: Math.round(medianPrice),
    avgOverUnder: parseFloat(avgOverUnder.toFixed(2)),
    overAskingPct: parseFloat(overAskingPct.toFixed(1)),
    avgPricePerSqm: Math.round(avgPricePerSqm),
    dublinComparison: {
      d8AvgPrice: Math.round(avgPrice),
      dublinAvgPrice: Math.round(dublinAvgPrice),
      priceDiff: parseFloat(priceDiff.toFixed(1))
    }
  }
};

fs.writeFileSync('blog60_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('\n✓ Chart data exported to blog60_chart_data.json');
