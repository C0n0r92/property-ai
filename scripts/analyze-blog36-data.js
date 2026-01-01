const fs = require('fs');

// Load data
const data = JSON.parse(fs.readFileSync('dashboard/public/data.json', 'utf8'));

// Filter for valid 2024-2025 properties
const validProperties = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31');
});

// Filter for D1 properties only
const d1Properties = validProperties.filter(p => p.dublinPostcode === 'D1');

console.log(`D1 Properties analyzed: ${d1Properties.length}`);
console.log(`Date range: 2024-2025`);

// D1 Market Overview
const avgPrice = d1Properties.reduce((sum, p) => sum + p.soldPrice, 0) / d1Properties.length;
const avgSize = d1Properties.reduce((sum, p) => sum + p.areaSqm, 0) / d1Properties.length;
const avgPricePerSqm = d1Properties.reduce((sum, p) => sum + p.pricePerSqm, 0) / d1Properties.length;

console.log('\nD1 Market Overview:');
console.log(`Average price: €${avgPrice.toLocaleString()}`);
console.log(`Average size: ${avgSize.toFixed(0)} sqm`);
console.log(`Average price per sqm: €${avgPricePerSqm.toFixed(0)}`);

// Property type analysis in D1
console.log('\nProperty Types in D1:');
const propertyTypes = ['Apartment', 'Terrace', 'End of Terrace', 'Semi-D', 'Detached', 'Duplex'];
propertyTypes.forEach(type => {
  const typeProps = d1Properties.filter(p => p.propertyType === type);
  if (typeProps.length < 10) return;

  const avgPrice = typeProps.reduce((sum, p) => sum + p.soldPrice, 0) / typeProps.length;
  const avgSize = typeProps.reduce((sum, p) => sum + p.areaSqm, 0) / typeProps.length;

  console.log(`${type}: ${typeProps.length} properties`);
  console.log(`  Average price: €${avgPrice.toLocaleString()}`);
  console.log(`  Average size: ${avgSize.toFixed(0)} sqm`);
  console.log('');
});

// Bedroom analysis
console.log('Bedroom Distribution in D1:');
for (let beds = 1; beds <= 5; beds++) {
  const bedProps = d1Properties.filter(p => p.beds === beds);
  if (bedProps.length < 5) continue;

  const avgPrice = bedProps.reduce((sum, p) => sum + p.soldPrice, 0) / bedProps.length;
  const avgSize = bedProps.reduce((sum, p) => sum + p.areaSqm, 0) / bedProps.length;

  console.log(`${beds} bed: ${bedProps.length} properties, €${avgPrice.toLocaleString()} avg, ${avgSize.toFixed(0)}sqm avg`);
}

// Monthly price trends for D1
console.log('\nMonthly Price Trends in D1:');
const monthlyStats = {};
d1Properties.forEach(p => {
  const month = p.soldDate.substring(0, 7);
  if (!monthlyStats[month]) monthlyStats[month] = [];
  monthlyStats[month].push(p);
});

Object.entries(monthlyStats).sort().forEach(([month, props]) => {
  const avgPrice = props.reduce((sum, p) => sum + p.soldPrice, 0) / props.length;
  console.log(`${month}: ${props.length} sales, €${avgPrice.toLocaleString()} avg`);
});

// Over-asking analysis for D1
const overAsking = d1Properties.filter(p => p.overUnderPercent > 0);
const underAsking = d1Properties.filter(p => p.overUnderPercent < 0);
const exactPrice = d1Properties.filter(p => p.overUnderPercent === 0);

console.log('\nOver-asking Analysis in D1:');
console.log(`Properties sold above asking: ${overAsking.length} (${(overAsking.length/d1Properties.length*100).toFixed(1)}%)`);
console.log(`Properties sold below asking: ${underAsking.length} (${(underAsking.length/d1Properties.length*100).toFixed(1)}%)`);
console.log(`Properties sold at asking: ${exactPrice.length} (${(exactPrice.length/d1Properties.length*100).toFixed(1)}%)`);

if (overAsking.length > 0) {
  const avgPremium = overAsking.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAsking.length;
  console.log(`Average premium when over-asking successful: ${avgPremium.toFixed(1)}%`);
}

// Size efficiency in D1
console.log('\nSize Efficiency Analysis in D1:');
const sizeBrackets = [
  { min: 0, max: 60, label: 'Tiny (<60sqm)' },
  { min: 60, max: 90, label: 'Small (60-90sqm)' },
  { min: 90, max: 130, label: 'Medium (90-130sqm)' },
  { min: 130, max: 200, label: 'Large (130-200sqm)' },
  { min: 200, max: 9999, label: 'XL (200sqm+)' }
];

sizeBrackets.forEach(bracket => {
  const bracketProps = d1Properties.filter(p => p.areaSqm >= bracket.min && p.areaSqm < bracket.max);
  if (bracketProps.length < 5) return;

  const avgPricePerSqm = bracketProps.reduce((sum, p) => sum + p.pricePerSqm, 0) / bracketProps.length;
  console.log(`${bracket.label}: ${bracketProps.length} properties, €${avgPricePerSqm.toFixed(0)}/sqm avg`);
});

// Export chart data
const chartData = {
  d1PropertyTypesChart: propertyTypes.map(type => {
    const typeProps = d1Properties.filter(p => p.propertyType === type);
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

  d1BedroomAnalysisChart: [1,2,3,4,5].map(beds => {
    const bedProps = d1Properties.filter(p => p.beds === beds);
    if (bedProps.length < 5) return null;

    const avgPrice = bedProps.reduce((sum, p) => sum + p.soldPrice, 0) / bedProps.length;

    return {
      bedrooms: beds,
      count: bedProps.length,
      averagePrice: Math.round(avgPrice)
    };
  }).filter(Boolean),

  d1MonthlyTrendsChart: Object.entries(monthlyStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, props]) => {
      const avgPrice = props.reduce((sum, p) => sum + p.soldPrice, 0) / props.length;
      return {
        month,
        salesCount: props.length,
        averagePrice: Math.round(avgPrice)
      };
    }),

  d1SizeEfficiencyChart: sizeBrackets.map(bracket => {
    const bracketProps = d1Properties.filter(p => p.areaSqm >= bracket.min && p.areaSqm < bracket.max);
    if (bracketProps.length < 5) return null;

    const avgPricePerSqm = bracketProps.reduce((sum, p) => sum + p.pricePerSqm, 0) / bracketProps.length;

    return {
      sizeBracket: bracket.label,
      count: bracketProps.length,
      averagePricePerSqm: Math.round(avgPricePerSqm)
    };
  }).filter(Boolean),

  d1MarketOverviewChart: [{
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
    value: d1Properties.length
  }]
};

fs.writeFileSync('blog36_d1_area_analysis_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('\nChart data exported to blog36_d1_area_analysis_chart_data.json');
