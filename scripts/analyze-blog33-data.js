const fs = require('fs');

// Load data
const data = JSON.parse(fs.readFileSync('../dashboard/public/data.json', 'utf8'));

// Filter for valid 2024-2025 properties with yield estimates
const propertiesWithYields = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31') &&
         p.yieldEstimate &&
         p.yieldEstimate.confidence === 'high' &&
         p.dublinPostcode;
});

console.log(`Properties with high-confidence yields: ${propertiesWithYields.length}`);

// Analyze yield patterns by postcode
const postcodeAnalysis = {};
const minProperties = 30; // Minimum sample size for reliable analysis

propertiesWithYields.forEach(p => {
  const postcode = p.dublinPostcode;
  if (!postcodeAnalysis[postcode]) {
    postcodeAnalysis[postcode] = {
      properties: [],
      totalYield: 0,
      totalPrice: 0,
      yieldSum: 0
    };
  }

  postcodeAnalysis[postcode].properties.push(p);
  postcodeAnalysis[postcode].totalYield += p.yieldEstimate.grossYield;
  postcodeAnalysis[postcode].totalPrice += p.soldPrice;
  postcodeAnalysis[postcode].yieldSum += p.yieldEstimate.grossYield;
});

console.log('\nYield Analysis by Postcode (minimum 30 properties):');
const validPostcodes = Object.entries(postcodeAnalysis)
  .filter(([_, data]) => data.properties.length >= minProperties)
  .sort((a, b) => (b[1].yieldSum / b[1].properties.length) - (a[1].yieldSum / a[1].properties.length));

validPostcodes.forEach(([postcode, data]) => {
  const avgYield = data.yieldSum / data.properties.length;
  const avgPrice = data.totalPrice / data.properties.length;
  const yieldEfficiency = avgYield / avgPrice * 1000000; // Yield per million euros

  console.log(`${postcode}: ${data.properties.length} properties`);
  console.log(`  Average yield: ${avgYield.toFixed(2)}%`);
  console.log(`  Average price: €${avgPrice.toLocaleString()}`);
  console.log(`  Yield efficiency: ${yieldEfficiency.toFixed(2)}% per €1M`);
  console.log('');
});

// Price vs yield correlation analysis
const priceYieldCorrelation = propertiesWithYields.map(p => ({
  price: p.soldPrice,
  yield: p.yieldEstimate.grossYield,
  postcode: p.dublinPostcode,
  propertyType: p.propertyType
}));

// Group into price brackets and analyze yield patterns
const priceBrackets = [
  { min: 0, max: 300000, label: '€0-300k' },
  { min: 300000, max: 500000, label: '€300k-500k' },
  { min: 500000, max: 700000, label: '€500k-700k' },
  { min: 700000, max: 1000000, label: '€700k-1M' },
  { min: 1000000, max: 999999999, label: '€1M+' }
];

const bracketAnalysis = priceBrackets.map(bracket => {
  const bracketProperties = priceYieldCorrelation.filter(p =>
    p.price >= bracket.min && p.price < bracket.max
  );

  if (bracketProperties.length < 10) return null;

  const avgYield = bracketProperties.reduce((sum, p) => sum + p.yield, 0) / bracketProperties.length;
  const avgPrice = bracketProperties.reduce((sum, p) => sum + p.price, 0) / bracketProperties.length;

  return {
    bracket: bracket.label,
    count: bracketProperties.length,
    averageYield: avgYield,
    averagePrice: avgPrice,
    yieldPerMillion: (avgYield / avgPrice) * 1000000
  };
}).filter(Boolean);

console.log('Yield by Price Bracket:');
bracketAnalysis.forEach(bracket => {
  console.log(`${bracket.bracket}: ${bracket.count} properties`);
  console.log(`  Average yield: ${bracket.averageYield.toFixed(2)}%`);
  console.log(`  Yield per €1M: ${bracket.yieldPerMillion.toFixed(2)}%`);
  console.log('');
});

// Best value areas (high yield, reasonable price)
const bestValueAreas = validPostcodes
  .filter(([_, data]) => {
    const avgYield = data.yieldSum / data.properties.length;
    const avgPrice = data.totalPrice / data.properties.length;
    return avgYield > 6.5 && avgPrice < 600000; // High yield, affordable
  })
  .slice(0, 5);

console.log('Best Value Areas (High Yield + Affordable):');
bestValueAreas.forEach(([postcode, data]) => {
  const avgYield = data.yieldSum / data.properties.length;
  const avgPrice = data.totalPrice / data.properties.length;
  console.log(`${postcode}: ${avgYield.toFixed(2)}% yield, €${avgPrice.toLocaleString()}`);
});

// Export chart data
const chartData = {
  yieldByPostcodeChart: validPostcodes.slice(0, 10).map(([postcode, data]) => ({
    postcode,
    averageYield: data.yieldSum / data.properties.length,
    averagePrice: Math.round(data.totalPrice / data.properties.length),
    sampleSize: data.properties.length
  })),
  yieldByPriceBracketChart: bracketAnalysis.map(bracket => ({
    bracket: bracket.bracket,
    averageYield: bracket.averageYield,
    yieldPerMillion: bracket.yieldPerMillion,
    sampleSize: bracket.count
  })),
  bestValueAreasChart: bestValueAreas.map(([postcode, data]) => ({
    postcode,
    averageYield: data.yieldSum / data.properties.length,
    averagePrice: Math.round(data.totalPrice / data.properties.length),
    sampleSize: data.properties.length
  })),
  yieldDistributionChart: (() => {
    const yields = propertiesWithYields.map(p => p.yieldEstimate.grossYield);
    const min = Math.min(...yields);
    const max = Math.max(...yields);
    const buckets = [];

    for (let i = 0; i < 10; i++) {
      const bucketMin = min + (i * (max - min) / 10);
      const bucketMax = min + ((i + 1) * (max - min) / 10);
      const count = yields.filter(y => y >= bucketMin && y < bucketMax).length;
      buckets.push({
        range: `${bucketMin.toFixed(1)}-${bucketMax.toFixed(1)}%`,
        count,
        percentage: (count / yields.length * 100).toFixed(1)
      });
    }

    return buckets;
  })()
};

fs.writeFileSync('blog33_geographic_yield_patterns_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('\nChart data exported to blog33_geographic_yield_patterns_chart_data.json');
