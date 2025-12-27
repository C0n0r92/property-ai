const fs = require('fs');

// Load the data
const data = JSON.parse(fs.readFileSync('../dashboard/public/data.json', 'utf8'));

// Filter for valid 2024-2025 transactions only (exclude future dates)
const validProperties = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  const cutoffDate = new Date('2025-12-31');
  return soldDate <= cutoffDate && p.soldPrice && p.askingPrice;
});

console.log(`Total valid properties: ${validProperties.length}`);

// Function to get quarter from date
function getQuarter(dateStr) {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  if (month <= 3) return 'Q1';
  if (month <= 6) return 'Q2';
  if (month <= 9) return 'Q3';
  return 'Q4';
}

// Function to get year from date
function getYear(dateStr) {
  return new Date(dateStr).getFullYear();
}

// Analyze Q1 vs Q2 patterns for 2024 and 2025
function analyzeQuarterlySelling() {
  const q1Properties = validProperties.filter(p => getQuarter(p.soldDate) === 'Q1');
  const q2Properties = validProperties.filter(p => getQuarter(p.soldDate) === 'Q2');

  console.log(`Q1 properties: ${q1Properties.length}`);
  console.log(`Q2 properties: ${q2Properties.length}`);

  // Calculate metrics for each quarter
  const calculateMetrics = (properties) => {
    const totalValue = properties.reduce((sum, p) => sum + p.soldPrice, 0);
    const avgPrice = totalValue / properties.length;
    const avgOverAsk = properties.reduce((sum, p) => sum + p.overUnderPercent, 0) / properties.length;
    const medianOverAsk = properties.sort((a, b) => a.overUnderPercent - b.overUnderPercent)[Math.floor(properties.length / 2)].overUnderPercent;

    const priceRanges = {
      'Under €400k': properties.filter(p => p.soldPrice < 400000).length,
      '€400k-€600k': properties.filter(p => p.soldPrice >= 400000 && p.soldPrice < 600000).length,
      '€600k-€800k': properties.filter(p => p.soldPrice >= 600000 && p.soldPrice < 800000).length,
      '€800k+': properties.filter(p => p.soldPrice >= 800000).length
    };

    return {
      count: properties.length,
      avgPrice: Math.round(avgPrice),
      avgOverAsk: Math.round(avgOverAsk * 100) / 100,
      medianOverAsk: Math.round(medianOverAsk * 100) / 100,
      priceRanges
    };
  };

  const q1Metrics = calculateMetrics(q1Properties);
  const q2Metrics = calculateMetrics(q2Properties);

  // Analyze by property type
  const propertyTypes = ['Apartment', 'Semi-D', 'Detached', 'Terraced', 'Duplex'];

  const typeAnalysis = propertyTypes.map(type => {
    const q1Type = q1Properties.filter(p => p.propertyType === type);
    const q2Type = q2Properties.filter(p => p.propertyType === type);

    return {
      type,
      q1Count: q1Type.length,
      q2Count: q2Type.length,
      q1AvgOverAsk: q1Type.length > 0 ? Math.round(q1Type.reduce((sum, p) => sum + p.overUnderPercent, 0) / q1Type.length * 100) / 100 : 0,
      q2AvgOverAsk: q2Type.length > 0 ? Math.round(q2Type.reduce((sum, p) => sum + p.overUnderPercent, 0) / q2Type.length * 100) / 100 : 0
    };
  });

  // Analyze by Dublin postcode
  const postcodes = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D6W', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18', 'D20', 'D22', 'D24'];

  const postcodeAnalysis = postcodes.map(postcode => {
    const q1Area = q1Properties.filter(p => p.dublinPostcode === postcode);
    const q2Area = q2Properties.filter(p => p.dublinPostcode === postcode);

    return {
      postcode,
      q1Count: q1Area.length,
      q2Count: q2Area.length,
      q1AvgPrice: q1Area.length > 0 ? Math.round(q1Area.reduce((sum, p) => sum + p.soldPrice, 0) / q1Area.length) : 0,
      q2AvgPrice: q2Area.length > 0 ? Math.round(q2Area.reduce((sum, p) => sum + p.soldPrice, 0) / q2Area.length) : 0,
      q1AvgOverAsk: q1Area.length > 0 ? Math.round(q1Area.reduce((sum, p) => sum + p.overUnderPercent, 0) / q1Area.length * 100) / 100 : 0,
      q2AvgOverAsk: q2Area.length > 0 ? Math.round(q2Area.reduce((sum, p) => sum + p.overUnderPercent, 0) / q2Area.length * 100) / 100 : 0
    };
  }).filter(area => area.q1Count > 0 || area.q2Count > 0);

  // Monthly breakdown within Q1 and Q2
  const monthlyData = [];
  for (let month = 1; month <= 6; month++) {
    const monthStr = month.toString().padStart(2, '0');
    const monthProps = validProperties.filter(p => {
      const date = new Date(p.soldDate);
      return date.getMonth() + 1 === month;
    });

    if (monthProps.length > 0) {
      monthlyData.push({
        month: `2024-${monthStr}`,
        count: monthProps.length,
        avgPrice: Math.round(monthProps.reduce((sum, p) => sum + p.soldPrice, 0) / monthProps.length),
        avgOverAsk: Math.round(monthProps.reduce((sum, p) => sum + p.overUnderPercent, 0) / monthProps.length * 100) / 100
      });
    }
  }

  return {
    summary: {
      q1Metrics,
      q2Metrics,
      q1ToQ2Comparison: {
        priceChange: Math.round(((q2Metrics.avgPrice - q1Metrics.avgPrice) / q1Metrics.avgPrice) * 100 * 100) / 100,
        overAskChange: Math.round((q2Metrics.avgOverAsk - q1Metrics.avgOverAsk) * 100) / 100,
        volumeChange: Math.round(((q2Metrics.count - q1Metrics.count) / q1Metrics.count) * 100 * 100) / 100
      }
    },
    typeAnalysis,
    postcodeAnalysis,
    monthlyData
  };
}

const results = analyzeQuarterlySelling();

// Export chart data for visualization
const chartData = {
  quarterlyComparison: [
    { quarter: 'Q1', avgPrice: results.summary.q1Metrics.avgPrice, avgOverAsk: results.summary.q1Metrics.avgOverAsk, count: results.summary.q1Metrics.count },
    { quarter: 'Q2', avgPrice: results.summary.q2Metrics.avgPrice, avgOverAsk: results.summary.q2Metrics.avgOverAsk, count: results.summary.q2Metrics.count }
  ],
  monthlyTrend: results.monthlyData,
  priceRangeDistribution: [
    { range: 'Under €400k', q1: results.summary.q1Metrics.priceRanges['Under €400k'], q2: results.summary.q2Metrics.priceRanges['Under €400k'] },
    { range: '€400k-€600k', q1: results.summary.q1Metrics.priceRanges['€400k-€600k'], q2: results.summary.q2Metrics.priceRanges['€400k-€600k'] },
    { range: '€600k-€800k', q1: results.summary.q1Metrics.priceRanges['€600k-€800k'], q2: results.summary.q2Metrics.priceRanges['€600k-€800k'] },
    { range: '€800k+', q1: results.summary.q1Metrics.priceRanges['€800k+'], q2: results.summary.q2Metrics.priceRanges['€800k+'] }
  ],
  postcodeComparison: results.postcodeAnalysis.slice(0, 10).map(area => ({
    postcode: area.postcode,
    q1AvgPrice: area.q1AvgPrice,
    q2AvgPrice: area.q2AvgPrice,
    q1OverAsk: area.q1AvgOverAsk,
    q2OverAsk: area.q2AvgOverAsk
  }))
};

// Save chart data
fs.writeFileSync('../blogs/blog12_q2_vs_q1_chart_data.json', JSON.stringify(chartData, null, 2));

// Print key findings
console.log('\n=== KEY FINDINGS ===');
console.log(`Q1 vs Q2 Price Change: ${results.summary.q1ToQ2Comparison.priceChange}%`);
console.log(`Q1 vs Q2 Over-Ask Change: ${results.summary.q1ToQ2Comparison.overAskChange}%`);
console.log(`Q1 vs Q2 Volume Change: ${results.summary.q1ToQ2Comparison.volumeChange}%`);

console.log('\nQ1 Metrics:');
console.log(`- Properties: ${results.summary.q1Metrics.count}`);
console.log(`- Avg Price: €${results.summary.q1Metrics.avgPrice.toLocaleString()}`);
console.log(`- Avg Over Ask: ${results.summary.q1Metrics.avgOverAsk}%`);

console.log('\nQ2 Metrics:');
console.log(`- Properties: ${results.summary.q2Metrics.count}`);
console.log(`- Avg Price: €${results.summary.q2Metrics.avgPrice.toLocaleString()}`);
console.log(`- Avg Over Ask: ${results.summary.q2Metrics.avgOverAsk}%`);

console.log('\nTop Property Type Changes:');
results.typeAnalysis.forEach(type => {
  if (type.q1Count > 50 || type.q2Count > 50) {
    console.log(`${type.type}: Q1 ${type.q1AvgOverAsk}% → Q2 ${type.q2AvgOverAsk}% over-asking`);
  }
});

console.log('\nAnalysis complete. Chart data saved to blogs/blog12_q2_vs_q1_chart_data.json');
