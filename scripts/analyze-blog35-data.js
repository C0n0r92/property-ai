const fs = require('fs');

// Load data
const data = JSON.parse(fs.readFileSync('../dashboard/public/data.json', 'utf8'));

// Filter for valid 2024-2025 properties
const validProperties = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31');
});

console.log(`Total valid properties analyzed: ${validProperties.length}`);

// Analyze over-asking strategy effectiveness by different market segments
const overAskingAnalysis = {};

// By asking price brackets
const askingBrackets = [
  { min: 0, max: 300000, label: '€0-300k' },
  { min: 300000, max: 500000, label: '€300k-500k' },
  { min: 500000, max: 700000, label: '€500k-700k' },
  { min: 700000, max: 1000000, label: '€700k-1M' },
  { min: 1000000, max: 999999999, label: '€1M+' }
];

console.log('\nOver-Asking Effectiveness by Asking Price Bracket:');
askingBrackets.forEach(bracket => {
  const bracketProperties = validProperties.filter(p =>
    p.askingPrice >= bracket.min && p.askingPrice < bracket.max
  );

  if (bracketProperties.length < 100) return;

  const overAsking = bracketProperties.filter(p => p.overUnderPercent > 0);
  const avgPremium = overAsking.length > 0 ?
    overAsking.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAsking.length : 0;
  const avgAsking = bracketProperties.reduce((sum, p) => sum + p.askingPrice, 0) / bracketProperties.length;
  const avgSold = bracketProperties.reduce((sum, p) => sum + p.soldPrice, 0) / bracketProperties.length;

  const successRate = (overAsking.length / bracketProperties.length * 100);
  const avgProfit = overAsking.length > 0 ?
    overAsking.reduce((sum, p) => sum + (p.soldPrice - p.askingPrice), 0) / overAsking.length : 0;

  console.log(`${bracket.label} (${bracketProperties.length} properties):`);
  console.log(`  Over-asking success rate: ${successRate.toFixed(1)}%`);
  console.log(`  Average premium when successful: ${avgPremium.toFixed(1)}%`);
  console.log(`  Average profit per successful sale: €${avgProfit.toLocaleString()}`);
  console.log(`  Average asking vs sold: €${avgAsking.toLocaleString()} → €${avgSold.toLocaleString()}`);
  console.log('');
});

// By property type
console.log('Over-Asking Effectiveness by Property Type:');
const propertyTypes = ['Apartment', 'Semi-D', 'Terrace', 'Detached', 'End of Terrace', 'Duplex'];
propertyTypes.forEach(type => {
  const typeProperties = validProperties.filter(p => p.propertyType === type);
  if (typeProperties.length < 100) return;

  const overAsking = typeProperties.filter(p => p.overUnderPercent > 0);
  const avgPremium = overAsking.length > 0 ?
    overAsking.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAsking.length : 0;
  const avgAsking = typeProperties.reduce((sum, p) => sum + p.askingPrice, 0) / typeProperties.length;
  const avgSold = typeProperties.reduce((sum, p) => sum + p.soldPrice, 0) / typeProperties.length;

  const successRate = (overAsking.length / typeProperties.length * 100);
  const avgProfit = overAsking.length > 0 ?
    overAsking.reduce((sum, p) => sum + (p.soldPrice - p.askingPrice), 0) / overAsking.length : 0;

  console.log(`${type} (${typeProperties.length} properties):`);
  console.log(`  Over-asking success rate: ${successRate.toFixed(1)}%`);
  console.log(`  Average premium: ${avgPremium.toFixed(1)}%`);
  console.log(`  Average profit: €${avgProfit.toLocaleString()}`);
  console.log('');
});

// By postcode (top 10 most active)
const postcodeStats = {};
validProperties.forEach(p => {
  if (!p.dublinPostcode) return;
  if (!postcodeStats[p.dublinPostcode]) {
    postcodeStats[p.dublinPostcode] = { properties: [], overAskingCount: 0, totalPremium: 0 };
  }
  postcodeStats[p.dublinPostcode].properties.push(p);
  if (p.overUnderPercent > 0) {
    postcodeStats[p.dublinPostcode].overAskingCount++;
    postcodeStats[p.dublinPostcode].totalPremium += p.overUnderPercent;
  }
});

console.log('Over-Asking Effectiveness by Postcode (Top 10 by volume):');
Object.entries(postcodeStats)
  .sort((a, b) => b[1].properties.length - a[1].properties.length)
  .slice(0, 10)
  .forEach(([postcode, data]) => {
    const successRate = (data.overAskingCount / data.properties.length * 100);
    const avgPremium = data.overAskingCount > 0 ? data.totalPremium / data.overAskingCount : 0;
    const avgPrice = data.properties.reduce((sum, p) => sum + p.soldPrice, 0) / data.properties.length;

    console.log(`${postcode} (${data.properties.length} properties, €${avgPrice.toLocaleString()} avg):`);
    console.log(`  Over-asking success rate: ${successRate.toFixed(1)}%`);
    console.log(`  Average premium: ${avgPremium.toFixed(1)}%`);
    console.log('');
  });

// Optimal over-asking strategy analysis
console.log('Optimal Over-Asking Strategy Analysis:');

// Find the sweet spot where over-asking works best
const optimalStrategy = askingBrackets.map(bracket => {
  const bracketProperties = validProperties.filter(p =>
    p.askingPrice >= bracket.min && p.askingPrice < bracket.max
  );

  if (bracketProperties.length < 100) return null;

  const overAsking = bracketProperties.filter(p => p.overUnderPercent > 0);
  const successRate = overAsking.length / bracketProperties.length;
  const avgPremium = overAsking.length > 0 ?
    overAsking.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAsking.length : 0;

  return {
    bracket: bracket.label,
    successRate,
    avgPremium,
    effectiveness: successRate * avgPremium, // Combined metric
    sampleSize: bracketProperties.length
  };
}).filter(Boolean);

console.log('Over-Asking Effectiveness Score (Success Rate × Average Premium):');
optimalStrategy
  .sort((a, b) => b.effectiveness - a.effectiveness)
  .forEach(strategy => {
    console.log(`${strategy.bracket}: ${(strategy.effectiveness * 100).toFixed(1)} points`);
    console.log(`  Success rate: ${(strategy.successRate * 100).toFixed(1)}%`);
    console.log(`  Average premium: ${strategy.avgPremium.toFixed(1)}%`);
    console.log('');
  });

// Premium distribution analysis
console.log('Premium Distribution Analysis:');
const premiums = validProperties
  .filter(p => p.overUnderPercent > 0)
  .map(p => p.overUnderPercent)
  .sort((a, b) => a - b);

const premiumRanges = [
  { min: 0, max: 5, label: '0-5%' },
  { min: 5, max: 10, label: '5-10%' },
  { min: 10, max: 15, label: '10-15%' },
  { min: 15, max: 20, label: '15-20%' },
  { min: 20, max: 999, label: '20%+' }
];

premiumRanges.forEach(range => {
  const rangePremiums = premiums.filter(p => p >= range.min && p < range.max);
  const count = rangePremiums.length;
  const percentage = (count / premiums.length * 100);
  const avgInRange = rangePremiums.length > 0 ?
    rangePremiums.reduce((sum, p) => sum + p, 0) / rangePremiums.length : 0;

  console.log(`${range.label}: ${count} properties (${percentage.toFixed(1)}%)`);
  console.log(`  Average premium in range: ${avgInRange.toFixed(1)}%`);
  console.log('');
});

// Export chart data
const chartData = {
  overAskingByPriceBracketChart: askingBrackets.map(bracket => {
    const bracketProperties = validProperties.filter(p =>
      p.askingPrice >= bracket.min && p.askingPrice < bracket.max
    );

    if (bracketProperties.length < 100) return null;

    const overAsking = bracketProperties.filter(p => p.overUnderPercent > 0);
    const successRate = overAsking.length / bracketProperties.length * 100;
    const avgPremium = overAsking.length > 0 ?
      overAsking.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAsking.length : 0;

    return {
      bracket: bracket.label,
      successRate,
      averagePremium: avgPremium,
      sampleSize: bracketProperties.length
    };
  }).filter(Boolean),
  overAskingByPropertyTypeChart: propertyTypes.map(type => {
    const typeProperties = validProperties.filter(p => p.propertyType === type);
    if (typeProperties.length < 100) return null;

    const overAsking = typeProperties.filter(p => p.overUnderPercent > 0);
    const successRate = overAsking.length / typeProperties.length * 100;
    const avgPremium = overAsking.length > 0 ?
      overAsking.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAsking.length : 0;

    return {
      propertyType: type,
      successRate,
      averagePremium: avgPremium,
      sampleSize: typeProperties.length
    };
  }).filter(Boolean),
  overAskingByPostcodeChart: Object.entries(postcodeStats)
    .sort((a, b) => b[1].properties.length - a[1].properties.length)
    .slice(0, 10)
    .map(([postcode, data]) => {
      const successRate = (data.overAskingCount / data.properties.length * 100);
      const avgPremium = data.overAskingCount > 0 ? data.totalPremium / data.overAskingCount : 0;
      const avgPrice = data.properties.reduce((sum, p) => sum + p.soldPrice, 0) / data.properties.length;

      return {
        postcode,
        successRate,
        averagePremium: avgPremium,
        averagePrice: Math.round(avgPrice),
        sampleSize: data.properties.length
      };
    }),
  premiumDistributionChart: premiumRanges.map(range => {
    const rangePremiums = premiums.filter(p => p >= range.min && p < range.max);
    return {
      range: range.label,
      count: rangePremiums.length,
      percentage: (rangePremiums.length / premiums.length * 100),
      averageInRange: rangePremiums.length > 0 ?
        rangePremiums.reduce((sum, p) => sum + p, 0) / rangePremiums.length : 0
    };
  }),
  optimalStrategyChart: optimalStrategy.map(strategy => ({
    bracket: strategy.bracket,
    effectiveness: strategy.effectiveness * 100,
    successRate: strategy.successRate * 100,
    averagePremium: strategy.avgPremium
  }))
};

fs.writeFileSync('blog35_over_asking_strategy_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('\nChart data exported to blog35_over_asking_strategy_chart_data.json');
