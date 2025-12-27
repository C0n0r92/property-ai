const fs = require('fs');

// Load the data
const data = JSON.parse(fs.readFileSync('../dashboard/public/data.json', 'utf8'));

// Filter for valid 2024-2025 transactions with yield data
const validProperties = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  const cutoffDate = new Date('2025-12-31');
  return soldDate <= cutoffDate && p.soldPrice && p.yieldEstimate && p.yieldEstimate.grossYield;
});

console.log(`Total properties with yield data: ${validProperties.length}`);

// Analyze rental yields by various factors
function analyzeRentalMarket() {
  // Overall yield statistics
  const yields = validProperties.map(p => p.yieldEstimate.grossYield);
  const avgYield = yields.reduce((sum, y) => sum + y, 0) / yields.length;
  const medianYield = yields.sort((a, b) => a - b)[Math.floor(yields.length / 2)];

  // Yield distribution
  const yieldBrackets = {
    'Under 4%': validProperties.filter(p => p.yieldEstimate.grossYield < 4).length,
    '4-5%': validProperties.filter(p => p.yieldEstimate.grossYield >= 4 && p.yieldEstimate.grossYield < 5).length,
    '5-6%': validProperties.filter(p => p.yieldEstimate.grossYield >= 5 && p.yieldEstimate.grossYield < 6).length,
    '6-7%': validProperties.filter(p => p.yieldEstimate.grossYield >= 6 && p.yieldEstimate.grossYield < 7).length,
    '7%+': validProperties.filter(p => p.yieldEstimate.grossYield >= 7).length
  };

  // Yield by property type
  const propertyTypes = ['Apartment', 'Semi-D', 'Detached', 'Terraced', 'Duplex'];
  const typeYields = propertyTypes.map(type => {
    const typeProps = validProperties.filter(p => p.propertyType === type);
    if (typeProps.length === 0) return null;

    const typeYields = typeProps.map(p => p.yieldEstimate.grossYield);
    return {
      type,
      count: typeProps.length,
      avgYield: Math.round(typeYields.reduce((sum, y) => sum + y, 0) / typeYields.length * 100) / 100,
      medianYield: Math.round(typeYields.sort((a, b) => a - b)[Math.floor(typeYields.length / 2)] * 100) / 100,
      avgPrice: Math.round(typeProps.reduce((sum, p) => sum + p.soldPrice, 0) / typeProps.length),
      avgMonthlyRent: Math.round(typeProps.reduce((sum, p) => sum + p.yieldEstimate.monthlyRent, 0) / typeProps.length)
    };
  }).filter(Boolean);

  // Yield by bedroom count
  const bedroomYields = [1, 2, 3, 4, 5].map(beds => {
    const bedProps = validProperties.filter(p => p.beds === beds);
    if (bedProps.length < 50) return null;

    const bedYields = bedProps.map(p => p.yieldEstimate.grossYield);
    return {
      bedrooms: beds,
      count: bedProps.length,
      avgYield: Math.round(bedYields.reduce((sum, y) => sum + y, 0) / bedYields.length * 100) / 100,
      medianYield: Math.round(bedYields.sort((a, b) => a - b)[Math.floor(bedYields.length / 2)] * 100) / 100,
      avgPrice: Math.round(bedProps.reduce((sum, p) => sum + p.soldPrice, 0) / bedProps.length),
      avgMonthlyRent: Math.round(bedProps.reduce((sum, p) => sum + p.yieldEstimate.monthlyRent, 0) / bedProps.length)
    };
  }).filter(Boolean);

  // Yield by Dublin postcode
  const postcodes = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D6W', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18', 'D20', 'D22', 'D24'];

  const postcodeYields = postcodes.map(postcode => {
    const areaProps = validProperties.filter(p => p.dublinPostcode === postcode);
    if (areaProps.length < 20) return null;

    const areaYields = areaProps.map(p => p.yieldEstimate.grossYield);
    return {
      postcode,
      count: areaProps.length,
      avgYield: Math.round(areaYields.reduce((sum, y) => sum + y, 0) / areaYields.length * 100) / 100,
      medianYield: Math.round(areaYields.sort((a, b) => a - b)[Math.floor(areaYields.length / 2)] * 100) / 100,
      avgPrice: Math.round(areaProps.reduce((sum, p) => sum + p.soldPrice, 0) / areaProps.length),
      avgMonthlyRent: Math.round(areaProps.reduce((sum, p) => sum + p.yieldEstimate.monthlyRent, 0) / areaProps.length)
    };
  }).filter(Boolean).sort((a, b) => b.avgYield - a.avgYield);

  // Affordability analysis - rent as percentage of income
  // Assuming average Dublin salary of €45,000 (from CSO data)
  const avgAnnualSalary = 45000;
  const avgMonthlySalary = avgAnnualSalary / 12;

  const affordabilityByType = typeYields.map(type => ({
    ...type,
    rentToIncomeRatio: Math.round((type.avgMonthlyRent / avgMonthlySalary) * 100 * 100) / 100
  }));

  const affordabilityByBedrooms = bedroomYields.map(bed => ({
    ...bed,
    rentToIncomeRatio: Math.round((bed.avgMonthlyRent / avgMonthlySalary) * 100 * 100) / 100
  }));

  // High yield opportunities (>6.5% gross yield)
  const highYieldAreas = postcodeYields.filter(area => area.avgYield > 6.5);
  const highYieldProperties = validProperties.filter(p => p.yieldEstimate.grossYield > 6.5);

  // Property size vs yield analysis
  const sizeYieldCorrelation = validProperties.map(p => ({
    pricePerSqm: Math.round(p.soldPrice / p.areaSqm),
    yield: p.yieldEstimate.grossYield,
    propertyType: p.propertyType,
    bedrooms: p.beds
  }));

  // Group by price per sqm brackets
  const pricePerSqmBrackets = [
    { min: 0, max: 3000, label: 'Under €3,000/sqm' },
    { min: 3000, max: 5000, label: '€3,000-€5,000/sqm' },
    { min: 5000, max: 7000, label: '€5,000-€7,000/sqm' },
    { min: 7000, max: 10000, label: '€7,000-€10,000/sqm' },
    { min: 10000, max: Infinity, label: '€10,000+/sqm' }
  ];

  const yieldByPriceBracket = pricePerSqmBrackets.map(bracket => {
    const bracketProps = validProperties.filter(p => {
      const ppsqm = p.soldPrice / p.areaSqm;
      return ppsqm >= bracket.min && ppsqm < bracket.max;
    });

    if (bracketProps.length < 20) return null;

    const bracketYields = bracketProps.map(p => p.yieldEstimate.grossYield);
    return {
      bracket: bracket.label,
      count: bracketProps.length,
      avgYield: Math.round(bracketYields.reduce((sum, y) => sum + y, 0) / bracketYields.length * 100) / 100,
      avgPricePerSqm: Math.round(bracketProps.reduce((sum, p) => sum + (p.soldPrice / p.areaSqm), 0) / bracketProps.length)
    };
  }).filter(Boolean);

  return {
    summary: {
      totalProperties: validProperties.length,
      avgYield: Math.round(avgYield * 100) / 100,
      medianYield: Math.round(medianYield * 100) / 100,
      yieldBrackets,
      highYieldCount: highYieldProperties.length
    },
    typeAnalysis: typeYields,
    bedroomAnalysis: bedroomYields,
    postcodeAnalysis: postcodeYields.slice(0, 15), // Top 15 by yield
    affordability: {
      byType: affordabilityByType,
      byBedrooms: affordabilityByBedrooms,
      avgSalary: avgAnnualSalary
    },
    highYieldAreas,
    yieldByPriceBracket
  };
}

const results = analyzeRentalMarket();

// Export chart data
const chartData = {
  yieldDistribution: [
    { bracket: 'Under 4%', count: results.summary.yieldBrackets['Under 4%'], percentage: Math.round((results.summary.yieldBrackets['Under 4%'] / results.summary.totalProperties) * 100 * 100) / 100 },
    { bracket: '4-5%', count: results.summary.yieldBrackets['4-5%'], percentage: Math.round((results.summary.yieldBrackets['4-5%'] / results.summary.totalProperties) * 100 * 100) / 100 },
    { bracket: '5-6%', count: results.summary.yieldBrackets['5-6%'], percentage: Math.round((results.summary.yieldBrackets['5-6%'] / results.summary.totalProperties) * 100 * 100) / 100 },
    { bracket: '6-7%', count: results.summary.yieldBrackets['6-7%'], percentage: Math.round((results.summary.yieldBrackets['6-7%'] / results.summary.totalProperties) * 100 * 100) / 100 },
    { bracket: '7%+', count: results.summary.yieldBrackets['7%+'], percentage: Math.round((results.summary.yieldBrackets['7%+'] / results.summary.totalProperties) * 100 * 100) / 100 }
  ],
  yieldByPropertyType: results.typeAnalysis.map(type => ({
    type: type.type,
    avgYield: type.avgYield,
    avgPrice: type.avgPrice,
    avgRent: type.avgMonthlyRent
  })),
  yieldByBedrooms: results.bedroomAnalysis.map(bed => ({
    bedrooms: bed.bedrooms,
    avgYield: bed.avgYield,
    avgPrice: bed.avgPrice,
    avgRent: bed.avgMonthlyRent
  })),
  topYieldAreas: results.postcodeAnalysis.slice(0, 10).map(area => ({
    postcode: area.postcode,
    avgYield: area.avgYield,
    avgRent: area.avgMonthlyRent
  })),
  affordabilityByType: results.affordability.byType.map(type => ({
    type: type.type,
    rentToIncomeRatio: type.rentToIncomeRatio,
    avgRent: type.avgMonthlyRent
  })),
  yieldVsPriceBracket: results.yieldByPriceBracket.map(bracket => ({
    bracket: bracket.bracket,
    avgYield: bracket.avgYield,
    avgPricePerSqm: bracket.avgPricePerSqm
  }))
};

// Save chart data
fs.writeFileSync('../blogs/blog13_renter_market_insights_chart_data.json', JSON.stringify(chartData, null, 2));

// Print key findings
console.log('\n=== RENTER MARKET INSIGHTS ===');
console.log(`Properties analyzed: ${results.summary.totalProperties}`);
console.log(`Average gross yield: ${results.summary.avgYield}%`);
console.log(`Median gross yield: ${results.summary.medianYield}%`);
console.log(`High yield properties (>6.5%): ${results.summary.highYieldCount}`);

console.log('\nYield Distribution:');
Object.entries(results.summary.yieldBrackets).forEach(([bracket, count]) => {
  const percentage = Math.round((count / results.summary.totalProperties) * 100 * 100) / 100;
  console.log(`${bracket}: ${count} properties (${percentage}%)`);
});

console.log('\nTop Yield Areas:');
results.postcodeAnalysis.slice(0, 5).forEach(area => {
  console.log(`${area.postcode}: ${area.avgYield}% yield, €${area.avgMonthlyRent}/month`);
});

console.log('\nAffordability (rent as % of €45k salary):');
results.affordability.byType.forEach(type => {
  console.log(`${type.type}: ${type.rentToIncomeRatio}% of monthly income`);
});

console.log('\nAnalysis complete. Chart data saved to blogs/blog13_renter_market_insights_chart_data.json');
