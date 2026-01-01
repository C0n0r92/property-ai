const fs = require('fs');

// Load data
const data = JSON.parse(fs.readFileSync('dashboard/public/data.json', 'utf8'));

// Filter for valid 2024-2025 properties
const validProperties = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31') &&
         p.areaSqm > 0 &&
         p.pricePerSqm > 0;
});

console.log(`Properties analyzed: ${validProperties.length}`);

// Space Efficiency Paradox Analysis
// The paradox: smaller properties often have higher price per sqm, but larger properties offer better value

console.log('\nSpace Efficiency Paradox Analysis:');

// Size brackets analysis
const sizeBrackets = [
  { min: 0, max: 50, label: 'Tiny (<50sqm)' },
  { min: 50, max: 70, label: 'Small (50-70sqm)' },
  { min: 70, max: 90, label: 'Compact (70-90sqm)' },
  { min: 90, max: 120, label: 'Medium (90-120sqm)' },
  { min: 120, max: 160, label: 'Large (120-160sqm)' },
  { min: 160, max: 220, label: 'XL (160-220sqm)' },
  { min: 220, max: 9999, label: 'XXL (220sqm+)' }
];

const sizeAnalysis = sizeBrackets.map(bracket => {
  const bracketProps = validProperties.filter(p =>
    p.areaSqm >= bracket.min && p.areaSqm < bracket.max
  );

  if (bracketProps.length < 50) return null;

  const avgPrice = bracketProps.reduce((sum, p) => sum + p.soldPrice, 0) / bracketProps.length;
  const avgPricePerSqm = bracketProps.reduce((sum, p) => sum + p.pricePerSqm, 0) / bracketProps.length;
  const avgSize = bracketProps.reduce((sum, p) => sum + p.areaSqm, 0) / bracketProps.length;

  return {
    bracket: bracket.label,
    count: bracketProps.length,
    avgPrice: avgPrice,
    avgPricePerSqm: avgPricePerSqm,
    avgSize: avgSize,
    efficiency: avgPrice / avgSize // Overall efficiency metric
  };
}).filter(Boolean);

console.log('Price per Square Meter by Size Bracket:');
sizeAnalysis.forEach(item => {
  console.log(`${item.bracket}:`);
  console.log(`  Properties: ${item.count}`);
  console.log(`  Average price: €${item.avgPrice.toLocaleString()}`);
  console.log(`  Price per sqm: €${item.avgPricePerSqm.toFixed(0)}`);
  console.log(`  Overall efficiency: €${item.efficiency.toFixed(0)} per sqm`);
  console.log('');
});

// Efficiency paradox: smaller homes cost more per sqm but may not be worth it
console.log('Space Efficiency Paradox Insights:');
const mostExpensiveSqm = sizeAnalysis.reduce((max, item) =>
  item.avgPricePerSqm > max.avgPricePerSqm ? item : max
);
const mostEfficient = sizeAnalysis.reduce((max, item) =>
  item.efficiency > max.efficiency ? item : max
);

console.log(`Most expensive per sqm: ${mostExpensiveSqm.bracket} at €${mostExpensiveSqm.avgPricePerSqm.toFixed(0)}/sqm`);
console.log(`Most space efficient: ${mostEfficient.bracket} at €${mostEfficient.efficiency.toFixed(0)} efficiency`);

// Value for money analysis - how much extra do you pay for smaller spaces?
console.log('\nValue for Money Analysis:');
const mediumBracket = sizeAnalysis.find(item => item.bracket.includes('Medium'));
if (mediumBracket) {
  sizeAnalysis.forEach(item => {
    if (item.bracket === mediumBracket.bracket) return;

    const sizeRatio = item.avgSize / mediumBracket.avgSize;
    const priceRatio = item.avgPrice / mediumBracket.avgPrice;
    const valueRatio = priceRatio / sizeRatio;

    console.log(`${item.bracket} vs Medium:`);
    console.log(`  Size ratio: ${sizeRatio.toFixed(2)}x`);
    console.log(`  Price ratio: ${priceRatio.toFixed(2)}x`);
    console.log(`  Value efficiency: ${valueRatio.toFixed(2)}`);
    console.log(`  ${(valueRatio > 1 ? 'More' : 'Less')} expensive per sqm of space`);
    console.log('');
  });
}

// Property type efficiency analysis
console.log('Space Efficiency by Property Type:');
const propertyTypes = ['Apartment', 'Terrace', 'Semi-D', 'Detached'];
propertyTypes.forEach(type => {
  const typeProps = validProperties.filter(p => p.propertyType === type && p.areaSqm > 0);
  if (typeProps.length < 100) return;

  // Group by size within property type
  const typeSizeAnalysis = sizeBrackets.slice(0, 5).map(bracket => { // Skip XXL for this analysis
    const bracketProps = typeProps.filter(p =>
      p.areaSqm >= bracket.min && p.areaSqm < bracket.max
    );

    if (bracketProps.length < 20) return null;

    const avgPricePerSqm = bracketProps.reduce((sum, p) => sum + p.pricePerSqm, 0) / bracketProps.length;
    return {
      bracket: bracket.label,
      avgPricePerSqm: avgPricePerSqm,
      count: bracketProps.length
    };
  }).filter(Boolean);

  console.log(`${type} properties:`);
  typeSizeAnalysis.forEach(item => {
    console.log(`  ${item.bracket}: €${item.avgPricePerSqm.toFixed(0)}/sqm (${item.count} properties)`);
  });
  console.log('');
});

// Bedroom efficiency - how bedrooms affect space utilization
console.log('Bedroom Space Efficiency:');
for (let beds = 1; beds <= 4; beds++) {
  const bedProps = validProperties.filter(p => p.beds === beds && p.areaSqm > 0);
  if (bedProps.length < 100) continue;

  const avgSize = bedProps.reduce((sum, p) => sum + p.areaSqm, 0) / bedProps.length;
  const avgPricePerSqm = bedProps.reduce((sum, p) => sum + p.pricePerSqm, 0) / bedProps.length;
  const spacePerBedroom = avgSize / beds;

  console.log(`${beds} bedroom properties:`);
  console.log(`  Average size: ${avgSize.toFixed(0)} sqm`);
  console.log(`  Price per sqm: €${avgPricePerSqm.toFixed(0)}`);
  console.log(`  Space per bedroom: ${spacePerBedroom.toFixed(0)} sqm`);
  console.log('');
}

// Yield vs size efficiency (for investors)
console.log('Investment Efficiency: Size vs Yield:');
const yieldProps = validProperties.filter(p => p.yieldEstimate && p.yieldEstimate.grossYield > 0);

const yieldSizeAnalysis = sizeBrackets.map(bracket => {
  const bracketProps = yieldProps.filter(p =>
    p.areaSqm >= bracket.min && p.areaSqm < bracket.max
  );

  if (bracketProps.length < 30) return null;

  const avgYield = bracketProps.reduce((sum, p) => sum + p.yieldEstimate.grossYield, 0) / bracketProps.length;
  const avgPrice = bracketProps.reduce((sum, p) => sum + p.soldPrice, 0) / bracketProps.length;

  return {
    bracket: bracket.label,
    avgYield: avgYield,
    avgPrice: avgPrice,
    count: bracketProps.length
  };
}).filter(Boolean);

console.log('Yield by property size (for investors):');
yieldSizeAnalysis.forEach(item => {
  console.log(`${item.bracket}: ${item.avgYield.toFixed(2)}% yield, €${item.avgPrice.toLocaleString()} avg (${item.count} properties)`);
});

// Export chart data
const chartData = {
  sizeEfficiencyChart: sizeAnalysis.map(item => ({
    sizeBracket: item.bracket,
    pricePerSqm: Math.round(item.avgPricePerSqm),
    averagePrice: Math.round(item.avgPrice),
    efficiency: Math.round(item.efficiency),
    sampleSize: item.count
  })),

  propertyTypeEfficiencyChart: propertyTypes.map(type => {
    const typeProps = validProperties.filter(p => p.propertyType === type && p.areaSqm > 0);
    if (typeProps.length < 100) return null;

    const typeSizeData = sizeBrackets.slice(0, 5).map(bracket => {
      const bracketProps = typeProps.filter(p =>
        p.areaSqm >= bracket.min && p.areaSqm < bracket.max
      );

      if (bracketProps.length < 20) return null;

      return {
        sizeBracket: bracket.label,
        pricePerSqm: Math.round(bracketProps.reduce((sum, p) => sum + p.pricePerSqm, 0) / bracketProps.length),
        count: bracketProps.length
      };
    }).filter(Boolean);

    return {
      propertyType: type,
      efficiencyData: typeSizeData
    };
  }).filter(Boolean),

  bedroomEfficiencyChart: [1,2,3,4].map(beds => {
    const bedProps = validProperties.filter(p => p.beds === beds && p.areaSqm > 0);
    if (bedProps.length < 100) return null;

    const avgSize = bedProps.reduce((sum, p) => sum + p.areaSqm, 0) / bedProps.length;
    const avgPricePerSqm = bedProps.reduce((sum, p) => sum + p.pricePerSqm, 0) / bedProps.length;

    return {
      bedrooms: beds,
      averageSize: Math.round(avgSize),
      pricePerSqm: Math.round(avgPricePerSqm),
      spacePerBedroom: Math.round(avgSize / beds),
      sampleSize: bedProps.length
    };
  }).filter(Boolean),

  yieldVsSizeChart: yieldSizeAnalysis.map(item => ({
    sizeBracket: item.bracket,
    averageYield: item.avgYield,
    averagePrice: Math.round(item.avgPrice),
    sampleSize: item.count
  })),

  valueEfficiencyChart: (() => {
    if (!mediumBracket) return [];
    return sizeAnalysis.map(item => {
      if (item.bracket === mediumBracket.bracket) return null;

      const sizeRatio = item.avgSize / mediumBracket.avgSize;
      const priceRatio = item.avgPrice / mediumBracket.avgPrice;
      const valueRatio = priceRatio / sizeRatio;

      return {
        sizeBracket: item.bracket,
        sizeRatio: sizeRatio,
        priceRatio: priceRatio,
        valueEfficiency: valueRatio,
        isEfficient: valueRatio <= 1
      };
    }).filter(Boolean);
  })()
};

fs.writeFileSync('blog38_space_efficiency_paradox_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('\nChart data exported to blog38_space_efficiency_paradox_chart_data.json');
