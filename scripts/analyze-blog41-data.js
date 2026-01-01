const fs = require('fs');

// Load data
const data = JSON.parse(fs.readFileSync('dashboard/public/data.json', 'utf8'));

// Filter for valid 2024-2025 properties
const validProperties = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31');
});

// Filter for D3 properties only
const d3Properties = validProperties.filter(p => p.dublinPostcode === 'D3');

console.log(`D3 Properties analyzed: ${d3Properties.length}`);
console.log(`Date range: 2024-2025`);

// D3 Market Overview
const avgPrice = d3Properties.reduce((sum, p) => sum + p.soldPrice, 0) / d3Properties.length;
const avgSize = d3Properties.reduce((sum, p) => sum + p.areaSqm, 0) / d3Properties.length;
const avgPricePerSqm = d3Properties.reduce((sum, p) => sum + p.pricePerSqm, 0) / d3Properties.length;

console.log('\nD3 Market Overview:');
console.log(`Average price: €${avgPrice.toLocaleString()}`);
console.log(`Average size: ${avgSize.toFixed(0)} sqm`);
console.log(`Average price per sqm: €${avgPricePerSqm.toFixed(0)}`);

// Property type analysis in D3
console.log('\nProperty Types in D3:');
const propertyTypes = ['Apartment', 'Terrace', 'Semi-D', 'Detached', 'End of Terrace'];
propertyTypes.forEach(type => {
  const typeProps = d3Properties.filter(p => p.propertyType === type);
  if (typeProps.length < 10) return;

  const avgPrice = typeProps.reduce((sum, p) => sum + p.soldPrice, 0) / typeProps.length;
  const avgSize = typeProps.reduce((sum, p) => sum + p.areaSqm, 0) / typeProps.length;

  console.log(`${type}: ${typeProps.length} properties`);
  console.log(`  Average price: €${avgPrice.toLocaleString()}`);
  console.log(`  Average size: ${avgSize.toFixed(0)} sqm`);
  console.log('');
});

// Bedroom analysis
console.log('Bedroom Distribution in D3:');
for (let beds = 1; beds <= 5; beds++) {
  const bedProps = d3Properties.filter(p => p.beds === beds);
  if (bedProps.length < 5) continue;

  const avgPrice = bedProps.reduce((sum, p) => sum + p.soldPrice, 0) / bedProps.length;
  const avgSize = bedProps.reduce((sum, p) => sum + p.areaSqm, 0) / bedProps.length;

  console.log(`${beds} bed: ${bedProps.length} properties, €${avgPrice.toLocaleString()} avg, ${avgSize.toFixed(0)}sqm avg`);
}

// Monthly price trends for D3
console.log('\nMonthly Price Trends in D3:');
const monthlyStats = {};
d3Properties.forEach(p => {
  const month = p.soldDate.substring(0, 7); // YYYY-MM
  if (!monthlyStats[month]) monthlyStats[month] = [];
  monthlyStats[month].push(p);
});

Object.entries(monthlyStats).sort().forEach(([month, props]) => {
  const avgPrice = props.reduce((sum, p) => sum + p.soldPrice, 0) / props.length;
  console.log(`${month}: ${props.length} sales, €${avgPrice.toLocaleString()} avg`);
});

// Over-asking analysis for D3
const overAsking = d3Properties.filter(p => p.overUnderPercent > 0);
const underAsking = d3Properties.filter(p => p.overUnderPercent < 0);
const exactPrice = d3Properties.filter(p => p.overUnderPercent === 0);

console.log('\nOver-asking Analysis in D3:');
console.log(`Properties sold above asking: ${overAsking.length} (${(overAsking.length/d3Properties.length*100).toFixed(1)}%)`);
console.log(`Properties sold below asking: ${underAsking.length} (${(underAsking.length/d3Properties.length*100).toFixed(1)}%)`);
console.log(`Properties sold at asking: ${exactPrice.length} (${(exactPrice.length/d3Properties.length*100).toFixed(1)}%)`);

if (overAsking.length > 0) {
  const avgPremium = overAsking.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAsking.length;
  console.log(`Average premium when over-asking successful: ${avgPremium.toFixed(1)}%`);
}

// Size efficiency in D3
console.log('\nSize Efficiency Analysis in D3:');
const sizeBrackets = [
  { min: 0, max: 70, label: 'Compact (<70sqm)' },
  { min: 70, max: 100, label: 'Standard (70-100sqm)' },
  { min: 100, max: 140, label: 'Spacious (100-140sqm)' },
  { min: 140, max: 200, label: 'Large (140-200sqm)' },
  { min: 200, max: 9999, label: 'XL (200sqm+)' }
];

sizeBrackets.forEach(bracket => {
  const bracketProps = d3Properties.filter(p => p.areaSqm >= bracket.min && p.areaSqm < bracket.max);
  if (bracketProps.length < 5) return;

  const avgPricePerSqm = bracketProps.reduce((sum, p) => sum + p.pricePerSqm, 0) / bracketProps.length;
  console.log(`${bracket.label}: ${bracketProps.length} properties, €${avgPricePerSqm.toFixed(0)}/sqm avg`);
});

// Quarterly performance analysis for D3
console.log('\nQuarterly Performance in D3:');
const quarters = ['2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4', '2025-Q1', '2025-Q2'];
quarters.forEach(quarter => {
  const quarterProps = d3Properties.filter(p => {
    const date = new Date(p.soldDate);
    const year = date.getFullYear();
    const q = Math.ceil((date.getMonth() + 1) / 3);
    return `${year}-Q${q}` === quarter;
  });

  if (quarterProps.length < 10) return;
  const avgPrice = quarterProps.reduce((sum, p) => sum + p.soldPrice, 0) / quarterProps.length;
  console.log(`${quarter}: ${quarterProps.length} sales, €${avgPrice.toLocaleString()} avg`);
});

// Export chart data
const chartData = {
  d3PropertyTypesChart: propertyTypes.map(type => {
    const typeProps = d3Properties.filter(p => p.propertyType === type);
    if (typeProps.length < 10) return null;

    const avgPrice = typeProps.reduce((sum, p) => sum + p.soldPrice, 0) / typeProps.length;
    const avgSize = typeProps.reduce((sum, p) => sum + p.areaSqm, 0) / typeProps.length;

    return {
      propertyType: type,
      count: typeProps.length,
      averagePrice: Math.round(avgPrice),
      averageSize: Math.round(avgSize)
    };
  }).filter(Boolean),

  d3BedroomAnalysisChart: [1,2,3,4,5].map(beds => {
    const bedProps = d3Properties.filter(p => p.beds === beds);
    if (bedProps.length < 5) return null;

    const avgPrice = bedProps.reduce((sum, p) => sum + p.soldPrice, 0) / bedProps.length;

    return {
      bedrooms: beds,
      count: bedProps.length,
      averagePrice: Math.round(avgPrice)
    };
  }).filter(Boolean),

  d3MonthlyTrendsChart: Object.entries(monthlyStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, props]) => {
      const avgPrice = props.reduce((sum, p) => sum + p.soldPrice, 0) / props.length;
      return {
        month,
        salesCount: props.length,
        averagePrice: Math.round(avgPrice)
      };
    }),

  d3SizeEfficiencyChart: sizeBrackets.map(bracket => {
    const bracketProps = d3Properties.filter(p => p.areaSqm >= bracket.min && p.areaSqm < bracket.max);
    if (bracketProps.length < 5) return null;

    const avgPricePerSqm = bracketProps.reduce((sum, p) => sum + p.pricePerSqm, 0) / bracketProps.length;

    return {
      sizeBracket: bracket.label,
      count: bracketProps.length,
      averagePricePerSqm: Math.round(avgPricePerSqm)
    };
  }).filter(Boolean),

  d3QuarterlyPerformanceChart: quarters.map(quarter => {
    const quarterProps = d3Properties.filter(p => {
      const date = new Date(p.soldDate);
      const year = date.getFullYear();
      const q = Math.ceil((date.getMonth() + 1) / 3);
      return `${year}-Q${q}` === quarter;
    });

    if (quarterProps.length < 10) return null;
    const avgPrice = quarterProps.reduce((sum, p) => sum + p.soldPrice, 0) / quarterProps.length;

    return {
      quarter,
      salesCount: quarterProps.length,
      averagePrice: Math.round(avgPrice)
    };
  }).filter(Boolean),

  d3MarketOverviewChart: [{
    metric: 'Average Price',
    value: Math.round(avgPrice)
  }, {
    metric: 'Average Size',
    value: Math.round(avgSize)
  }, {
    metric: 'Price per SqM',
    value: Math.round(avgPricePerSqm)
  }, {
    metric: 'Total Properties',
    value: d3Properties.length
  }]
};

fs.writeFileSync('blog41_d3_area_analysis_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('\nChart data exported to blog41_d3_area_analysis_chart_data.json');
