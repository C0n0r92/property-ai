const fs = require('fs');

// Load the property data
const data = JSON.parse(fs.readFileSync('dashboard/public/data.json', 'utf8'));

// Filter for valid properties (2020-2025, no future dates)
const validProperties = data.properties.filter(p => {
  const date = new Date(p.soldDate);
  const year = date.getFullYear();
  return year >= 2020 && year <= 2025 && p.dublinPostcode && p.soldPrice > 10000;
});

// Group by year and property type
const byYear = {};
const byYearType = {};

validProperties.forEach(p => {
  const year = new Date(p.soldDate).getFullYear();
  const type = p.propertyType;

  if (!byYear[year]) byYear[year] = [];
  if (!byYearType[year]) byYearType[year] = {};
  if (!byYearType[year][type]) byYearType[year][type] = [];

  byYear[year].push(p);
  byYearType[year][type].push(p);
});

// Calculate average prices by year and type
const yearStats = {};
Object.keys(byYear).forEach(year => {
  const properties = byYear[year];
  const avgPrice = properties.reduce((sum, p) => sum + p.soldPrice, 0) / properties.length;
  const avgPricePerSqm = properties.reduce((sum, p) => sum + p.pricePerSqm, 0) / properties.length;
  const medianPrice = properties.map(p => p.soldPrice).sort((a,b) => a-b)[Math.floor(properties.length/2)];

  yearStats[year] = {
    count: properties.length,
    avgPrice: Math.round(avgPrice),
    medianPrice: Math.round(medianPrice),
    avgPricePerSqm: Math.round(avgPricePerSqm)
  };
});

// Calculate by property type and year
const typeStats = {};
Object.keys(byYearType).forEach(year => {
  typeStats[year] = {};
  Object.keys(byYearType[year]).forEach(type => {
    const properties = byYearType[year][type];
    if (properties.length < 10) return; // Skip types with too few properties

    const avgPrice = properties.reduce((sum, p) => sum + p.soldPrice, 0) / properties.length;
    const avgPricePerSqm = properties.reduce((sum, p) => sum + p.pricePerSqm, 0) / properties.length;
    const medianPrice = properties.map(p => p.soldPrice).sort((a,b) => a-b)[Math.floor(properties.length/2)];

    typeStats[year][type] = {
      count: properties.length,
      avgPrice: Math.round(avgPrice),
      medianPrice: Math.round(medianPrice),
      avgPricePerSqm: Math.round(avgPricePerSqm)
    };
  });
});

// Find price inflation between years
const inflation = {};
const years = Object.keys(yearStats).sort((a,b) => parseInt(a) - parseInt(b));
for (let i = 1; i < years.length; i++) {
  const current = yearStats[years[i]];
  const previous = yearStats[years[i-1]];
  const priceIncrease = ((current.avgPrice - previous.avgPrice) / previous.avgPrice * 100);
  const sqmIncrease = ((current.avgPricePerSqm - previous.avgPricePerSqm) / previous.avgPricePerSqm * 100);

  inflation[`${years[i-1]}-${years[i]}`] = {
    priceIncrease: priceIncrease,
    sqmIncrease: sqmIncrease
  };
}

// Find specific property comparisons (similar properties across years)
function findSimilarProperties(baseYear, compareYear, targetPrice, propertyType, maxDiff = 50000) {
  const baseProps = byYearType[baseYear]?.[propertyType] || [];
  const compareProps = byYearType[compareYear]?.[propertyType] || [];

  // Find properties in base year closest to target price
  const baseMatches = baseProps
    .filter(p => Math.abs(p.soldPrice - targetPrice) <= maxDiff)
    .sort((a,b) => Math.abs(a.soldPrice - targetPrice) - Math.abs(b.soldPrice - targetPrice))
    .slice(0, 5);

  // Find similar properties in comparison year
  const compareMatches = [];
  baseMatches.forEach(baseProp => {
    const similar = compareProps
      .filter(p =>
        p.beds === baseProp.beds &&
        Math.abs(p.areaSqm - baseProp.areaSqm) <= 10 &&
        p.dublinPostcode === baseProp.dublinPostcode
      )
      .sort((a,b) => Math.abs(a.soldPrice - baseProp.soldPrice) - Math.abs(b.soldPrice - baseProp.soldPrice))
      .slice(0, 3);

    compareMatches.push(...similar.map(p => ({ base: baseProp, compare: p })));
  });

  return compareMatches.slice(0, 8); // Return top matches
}

// Create comparison examples
const comparisons = [];
const targetPrices = [250000, 350000, 500000, 750000];

targetPrices.forEach(price => {
  ['Semi-D', 'Detached', 'Apartment'].forEach(type => {
    if (byYearType[2021]?.[type] && byYearType[2025]?.[type]) {
      const matches = findSimilarProperties(2021, 2025, price, type);
      comparisons.push(...matches);
    }
  });
});

// Remove duplicates and sort by price difference
const uniqueComparisons = [];
const seen = new Set();
comparisons.forEach(comp => {
  const key = `${comp.base.id}-${comp.compare.id}`;
  if (!seen.has(key)) {
    seen.add(key);
    uniqueComparisons.push(comp);
  }
});

uniqueComparisons.sort((a,b) => (b.compare.soldPrice - b.base.soldPrice) - (a.compare.soldPrice - a.base.soldPrice));

// Calculate value erosion statistics
const valueErosionStats = {};
uniqueComparisons.forEach(comp => {
  const priceDiff = comp.compare.soldPrice - comp.base.soldPrice;
  const percentDiff = (priceDiff / comp.base.soldPrice * 100);

  if (!valueErosionStats[comp.base.propertyType]) {
    valueErosionStats[comp.base.propertyType] = {
      count: 0,
      totalPriceDiff: 0,
      totalPercentDiff: 0,
      examples: []
    };
  }

  valueErosionStats[comp.base.propertyType].count++;
  valueErosionStats[comp.base.propertyType].totalPriceDiff += priceDiff;
  valueErosionStats[comp.base.propertyType].totalPercentDiff += percentDiff;
  valueErosionStats[comp.base.propertyType].examples.push({
    baseYear: 2021,
    compareYear: 2025,
    basePrice: comp.base.soldPrice,
    comparePrice: comp.compare.soldPrice,
    priceDiff: priceDiff,
    percentDiff: percentDiff,
    beds: comp.base.beds,
    areaSqm: comp.base.areaSqm,
    postcode: comp.base.dublinPostcode
  });
});

// Calculate averages
Object.keys(valueErosionStats).forEach(type => {
  const stats = valueErosionStats[type];
  stats.avgPriceDiff = Math.round(stats.totalPriceDiff / stats.count);
  stats.avgPercentDiff = Math.round(stats.totalPercentDiff / stats.count * 10) / 10;
});

// Create chart data
const chartData = {
  YearOverYearPricesChart: years.map(year => ({
    year: parseInt(year),
    avgPrice: yearStats[year].avgPrice,
    medianPrice: yearStats[year].medianPrice,
    avgPricePerSqm: yearStats[year].avgPricePerSqm
  })),

  PropertyTypeComparisonChart: years.map(year => {
    const data = { year: parseInt(year) };
    Object.keys(typeStats[year]).forEach(type => {
      data[type] = typeStats[year][type].avgPrice;
    });
    return data;
  }),

  ValueErosionChart: Object.keys(valueErosionStats).map(type => ({
    propertyType: type,
    avgPercentIncrease: valueErosionStats[type].avgPercentDiff,
    exampleCount: valueErosionStats[type].count
  }))
};

// Save chart data
fs.writeFileSync('blog7_year_comparison_chart_data.json', JSON.stringify(chartData, null, 2));

// Generate markdown tables
function generateYearComparisonTable() {
  const table = [
    '| Year | Properties | Avg Price | Median Price | Price/㎡ |',
    '|------|------------|-----------|--------------|----------|'
  ];

  years.forEach(year => {
    const stats = yearStats[year];
    table.push(`| ${year} | ${stats.count.toLocaleString()} | €${stats.avgPrice.toLocaleString()} | €${stats.medianPrice.toLocaleString()} | €${stats.avgPricePerSqm.toLocaleString()} |`);
  });

  return table.join('\n');
}

function generateValueErosionTable() {
  const table = [
    '| Property Type | Properties | Avg Price Increase | % Increase |',
    '|---------------|------------|-------------------|------------|'
  ];

  Object.keys(valueErosionStats).forEach(type => {
    const stats = valueErosionStats[type];
    table.push(`| ${type} | ${stats.count} | €${stats.avgPriceDiff.toLocaleString()} | ${stats.avgPercentDiff}% |`);
  });

  return table.join('\n');
}

function generatePropertyComparisonTable() {
  const table = [
    '| Property Type | Beds | Area (㎡) | Postcode | 2021 Price | 2025 Price | Increase | % Change |',
    '|---------------|------|-----------|----------|------------|------------|----------|----------|'
  ];

  // Take top 6 examples
  uniqueComparisons.slice(0, 6).forEach(comp => {
    const priceDiff = comp.compare.soldPrice - comp.base.soldPrice;
    const percentDiff = Math.round((priceDiff / comp.base.soldPrice * 100) * 10) / 10;

    table.push(`| ${comp.base.propertyType} | ${comp.base.beds} | ${comp.base.areaSqm} | ${comp.base.dublinPostcode} | €${comp.base.soldPrice.toLocaleString()} | €${comp.compare.soldPrice.toLocaleString()} | €${priceDiff.toLocaleString()} | +${percentDiff}% |`);
  });

  return table.join('\n');
}

// Console output
console.log('=== YEAR-BY-YEAR ANALYSIS ===');
console.log('Properties by year:', Object.keys(byYear).map(y => `${y}: ${byYear[y].length}`).join(', '));

console.log('\n=== AVERAGE PRICES BY YEAR ===');
years.forEach(year => {
  const stats = yearStats[year];
  console.log(`${year}: €${stats.avgPrice.toLocaleString()} avg, €${stats.medianPrice.toLocaleString()} median, €${stats.avgPricePerSqm.toLocaleString()}/㎡, ${stats.count} properties`);
});

console.log('\n=== PRICE INFLATION BETWEEN YEARS ===');
Object.keys(inflation).forEach(period => {
  const data = inflation[period];
  console.log(`${period}: Price +${data.priceIncrease.toFixed(1)}%, Price/㎡ +${data.sqmIncrease.toFixed(1)}%`);
});

console.log('\n=== VALUE EROSION BY PROPERTY TYPE ===');
Object.keys(valueErosionStats).forEach(type => {
  const stats = valueErosionStats[type];
  console.log(`${type}: +${stats.avgPercentDiff}% (${stats.count} comparisons)`);
});

console.log('\n=== BLOG TABLES ===');
console.log('\nYear Comparison Table:');
console.log(generateYearComparisonTable());

console.log('\nValue Erosion Table:');
console.log(generateValueErosionTable());

console.log('\nProperty Comparison Table:');
console.log(generatePropertyComparisonTable());

// Export key insights
const keyInsights = {
  totalProperties: validProperties.length,
  yearsAnalyzed: years,
  yearStats: yearStats,
  inflation: inflation,
  valueErosionStats: valueErosionStats,
  topComparisons: uniqueComparisons.slice(0, 6),
  yearComparisonTable: generateYearComparisonTable(),
  valueErosionTable: generateValueErosionTable(),
  propertyComparisonTable: generatePropertyComparisonTable(),
  chartData: chartData
};

console.log('\n=== KEY INSIGHTS FOR BLOG ===');
console.log(JSON.stringify({
  totalProperties: validProperties.length,
  years: years,
  priceIncrease2021to2025: inflation['2021-2025'] ? inflation['2021-2025'].priceIncrease.toFixed(1) + '%' : 'N/A',
  sqmIncrease2021to2025: inflation['2021-2025'] ? inflation['2021-2025'].sqmIncrease.toFixed(1) + '%' : 'N/A',
  valueErosionExamples: uniqueComparisons.slice(0, 3).map(comp => ({
    type: comp.base.propertyType,
    beds: comp.base.beds,
    area: comp.base.areaSqm,
    postcode: comp.base.dublinPostcode,
    price2021: comp.base.soldPrice,
    price2025: comp.compare.soldPrice,
    increase: comp.compare.soldPrice - comp.base.soldPrice
  }))
}, null, 2));
