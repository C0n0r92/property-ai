const fs = require('fs');

// Load data
const data = JSON.parse(fs.readFileSync('dashboard/public/data.json', 'utf8'));

// Filter for valid 2024-2025 properties with rental data
const rentalProperties = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31') &&
         p.areaSqm > 0 &&
         p.dublinPostcode &&
         p.yieldEstimate &&
         p.yieldEstimate.grossYield > 0;
});

console.log(`Total rental properties analyzed: ${rentalProperties.length}`);

// Rental Market Hotspots: Areas with Most Rentals and Rent Value Analysis
console.log('\n=== RENTAL MARKET HOTSPOTS ANALYSIS ===');

// Group properties by Dublin postcode
const postcodeGroups = {};
rentalProperties.forEach(p => {
  const postcode = p.dublinPostcode;
  if (!postcodeGroups[postcode]) {
    postcodeGroups[postcode] = [];
  }
  postcodeGroups[postcode].push(p);
});

// Rental volume analysis
console.log('\nRental Market Volume by Postcode:');
const rentalVolumeData = Object.entries(postcodeGroups)
  .map(([postcode, properties]) => ({
    postcode,
    rentalCount: properties.length,
    avgMonthlyRent: properties.reduce((sum, p) => sum + p.yieldEstimate.monthlyRent, 0) / properties.length,
    avgYield: properties.reduce((sum, p) => sum + p.yieldEstimate.grossYield, 0) / properties.length,
    avgPrice: properties.reduce((sum, p) => sum + p.soldPrice, 0) / properties.length,
    confidence: properties.reduce((sum, p) => sum + (p.yieldEstimate.confidence === 'high' ? 1 : 0), 0) / properties.length * 100
  }))
  .sort((a, b) => b.rentalCount - a.rentalCount); // Sort by most rentals

rentalVolumeData.forEach(data => {
  console.log(`${data.postcode}: ${data.rentalCount} rentals, €${data.avgMonthlyRent.toFixed(0)} avg monthly rent, ${data.avgYield.toFixed(2)}% yield, €${data.avgPrice.toLocaleString()} avg price, ${data.confidence.toFixed(0)}% confidence`);
});

// Rent value spectrum analysis
console.log('\nRent Value Spectrum Analysis:');
const rentValueSpectrum = rentalVolumeData
  .filter(data => data.rentalCount >= 10) // Minimum sample size
  .sort((a, b) => b.avgMonthlyRent - a.avgMonthlyRent); // Sort by highest rent

console.log('\nPremium Rental Areas (Highest Monthly Rents):');
rentValueSpectrum.slice(0, 10).forEach(data => {
  console.log(`${data.postcode}: €${data.avgMonthlyRent.toFixed(0)}/month, ${data.rentalCount} rentals, ${data.avgYield.toFixed(2)}% yield`);
});

console.log('\nValue Rental Areas (Best Bang-for-Buck):');
const valueRentals = rentalVolumeData
  .filter(data => data.rentalCount >= 10)
  .sort((a, b) => b.avgYield - a.avgYield); // Sort by highest yield

valueRentals.slice(0, 10).forEach(data => {
  console.log(`${data.postcode}: ${data.avgYield.toFixed(2)}% yield, €${data.avgMonthlyRent.toFixed(0)}/month, ${data.rentalCount} rentals`);
});

// Rental market concentration analysis
console.log('\nRental Market Concentration:');
const totalRentals = rentalVolumeData.reduce((sum, data) => sum + data.rentalCount, 0);
const top5Concentration = rentalVolumeData.slice(0, 5).reduce((sum, data) => sum + data.rentalCount, 0) / totalRentals * 100;

console.log(`Top 5 areas account for ${top5Concentration.toFixed(1)}% of all rentals`);
console.log(`Top rental area (${rentalVolumeData[0].postcode}) has ${rentalVolumeData[0].rentalCount} rentals (${(rentalVolumeData[0].rentalCount / totalRentals * 100).toFixed(1)}% of market)`);

// Rent-to-price ratio analysis
console.log('\nRent-to-Price Ratio Analysis:');
const rentPriceRatio = rentalVolumeData
  .filter(data => data.rentalCount >= 10)
  .map(data => ({
    ...data,
    rentToPriceRatio: (data.avgMonthlyRent * 12) / data.avgPrice * 100 // Annual rent as % of property price
  }))
  .sort((a, b) => b.rentToPriceRatio - a.rentToPriceRatio);

console.log('\nHighest Rent-to-Price Ratios (Best Rental Returns):');
rentPriceRatio.slice(0, 10).forEach(data => {
  console.log(`${data.postcode}: ${(data.rentToPriceRatio).toFixed(2)}% annual rent-to-price, €${data.avgMonthlyRent.toFixed(0)}/month, €${data.avgPrice.toLocaleString()} price`);
});

console.log('\nLowest Rent-to-Price Ratios (Capital Preservation Focus):');
rentPriceRatio.slice(-10).reverse().forEach(data => {
  console.log(`${data.postcode}: ${(data.rentToPriceRatio).toFixed(2)}% annual rent-to-price, €${data.avgMonthlyRent.toFixed(0)}/month, €${data.avgPrice.toLocaleString()} price`);
});

// Rental yield efficiency analysis
console.log('\nRental Yield Efficiency Analysis:');
const yieldEfficiency = rentalVolumeData
  .filter(data => data.rentalCount >= 10)
  .map(data => ({
    ...data,
    yieldEfficiency: data.avgYield / data.avgPrice * 100000 // Yield per €100k invested
  }))
  .sort((a, b) => b.yieldEfficiency - a.yieldEfficiency);

console.log('\nMost Yield-Efficient Areas:');
yieldEfficiency.slice(0, 10).forEach(data => {
  console.log(`${data.postcode}: ${data.yieldEfficiency.toFixed(2)} yield per €100k, ${data.avgYield.toFixed(2)}% gross yield, €${data.avgPrice.toLocaleString()} avg price`);
});

// Investor preference analysis
console.log('\nInvestor Preference Analysis:');

const investorProfiles = [
  {
    name: 'Cash Flow Investors',
    criteria: ['high_yield', 'stable_rents', 'lower_price_points'],
    optimalScore: (area) => area.avgYield * 0.7 + (100 - area.confidence) * 0.3, // Prefer high yield, penalize low confidence
    description: 'Focus on maximizing rental income relative to investment'
  },
  {
    name: 'Capital Preservation Investors',
    criteria: ['price_stability', 'location_premium', 'lower_rent_to_price'],
    optimalScore: (area) => (100 - rentPriceRatio.find(r => r.postcode === area.postcode)?.rentToPriceRatio || 0) * 0.6 + area.confidence * 0.4,
    description: 'Focus on maintaining property value with stable rental income'
  },
  {
    name: 'Growth-Oriented Investors',
    criteria: ['upward_price_trend', 'rental_demand', 'yield_efficiency'],
    optimalScore: (area) => area.yieldEfficiency * 0.5 + area.rentalCount * 0.01 + area.confidence * 0.4,
    description: 'Balance rental income with potential for property value growth'
  }
];

// Calculate optimal areas for each investor profile
investorProfiles.forEach(profile => {
  console.log(`\n${profile.name} (${profile.description}):`);
  const scoredAreas = rentalVolumeData
    .filter(data => data.rentalCount >= 10)
    .map(area => ({
      ...area,
      score: profile.optimalScore(area)
    }))
    .sort((a, b) => b.score - a.score);

  scoredAreas.slice(0, 5).forEach((area, index) => {
    console.log(`${index + 1}. ${area.postcode}: Score ${area.score.toFixed(1)}, ${area.avgYield.toFixed(2)}% yield, €${area.avgMonthlyRent.toFixed(0)}/month, ${area.rentalCount} rentals`);
  });
});

// Market maturity analysis
console.log('\nRental Market Maturity Analysis:');
const marketMaturity = rentalVolumeData
  .filter(data => data.rentalCount >= 10)
  .map(data => ({
    ...data,
    maturityScore: data.confidence * 0.4 + (data.rentalCount / totalRentals * 100) * 0.3 + data.avgYield * 0.3
  }))
  .sort((a, b) => b.maturityScore - a.maturityScore);

console.log('\nMost Mature Rental Markets:');
marketMaturity.slice(0, 10).forEach(data => {
  console.log(`${data.postcode}: Maturity score ${data.maturityScore.toFixed(1)}, ${data.confidence.toFixed(0)}% confidence, ${data.rentalCount} rentals, ${data.avgYield.toFixed(2)}% yield`);
});

// Rental seasonality analysis (if data allows)
console.log('\nRental Data Seasonality Analysis:');
const quarterlyRentalData = {};
['2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4', '2025-Q1', '2025-Q2'].forEach(quarter => {
  quarterlyRentalData[quarter] = {};
});

Object.keys(postcodeGroups).forEach(postcode => {
  const properties = postcodeGroups[postcode];

  ['2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4', '2025-Q1', '2025-Q2'].forEach(quarter => {
    const quarterProps = properties.filter(p => {
      const date = new Date(p.soldDate);
      const year = date.getFullYear();
      const q = Math.ceil((date.getMonth() + 1) / 3);
      return `${year}-Q${q}` === quarter;
    });

    if (quarterProps.length >= 3) {
      const avgRent = quarterProps.reduce((sum, p) => sum + p.yieldEstimate.monthlyRent, 0) / quarterProps.length;
      const avgYield = quarterProps.reduce((sum, p) => sum + p.yieldEstimate.grossYield, 0) / quarterProps.length;
      quarterlyRentalData[quarter][postcode] = { avgRent, avgYield, count: quarterProps.length };
    }
  });
});

console.log('\nQuarterly Rental Trends (Top 5 Areas):');
rentalVolumeData.slice(0, 5).forEach(area => {
  console.log(`\n${area.postcode} Quarterly Performance:`);
  ['2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4', '2025-Q1', '2025-Q2'].forEach(quarter => {
    const data = quarterlyRentalData[quarter][area.postcode];
    if (data) {
      console.log(`  ${quarter}: €${data.avgRent.toFixed(0)}/month, ${data.avgYield.toFixed(2)}% yield, ${data.count} properties`);
    }
  });
});

// Export chart data
const chartData = {
  rentalVolumeChart: rentalVolumeData.slice(0, 15).map(data => ({
    postcode: data.postcode,
    rentalCount: data.rentalCount,
    avgMonthlyRent: Math.round(data.avgMonthlyRent),
    avgYield: data.avgYield,
    avgPrice: Math.round(data.avgPrice),
    confidence: data.confidence
  })),

  premiumRentalsChart: rentValueSpectrum.slice(0, 10).map(data => ({
    postcode: data.postcode,
    avgMonthlyRent: Math.round(data.avgMonthlyRent),
    rentalCount: data.rentalCount,
    avgYield: data.avgYield
  })),

  valueRentalsChart: valueRentals.slice(0, 10).map(data => ({
    postcode: data.postcode,
    avgYield: data.avgYield,
    avgMonthlyRent: Math.round(data.avgMonthlyRent),
    rentalCount: data.rentalCount
  })),

  rentPriceRatioChart: rentPriceRatio.slice(0, 15).map(data => ({
    postcode: data.postcode,
    rentToPriceRatio: data.rentToPriceRatio,
    avgMonthlyRent: Math.round(data.avgMonthlyRent),
    avgPrice: Math.round(data.avgPrice),
    rentalCount: data.rentalCount
  })),

  yieldEfficiencyChart: yieldEfficiency.slice(0, 15).map(data => ({
    postcode: data.postcode,
    yieldEfficiency: data.yieldEfficiency,
    avgYield: data.avgYield,
    avgPrice: Math.round(data.avgPrice),
    rentalCount: data.rentalCount
  })),

  investorProfilesChart: investorProfiles.map(profile => ({
    profileName: profile.name,
    description: profile.description,
    criteria: profile.criteria,
    topAreas: rentalVolumeData
      .filter(data => data.rentalCount >= 10)
      .map(area => ({
        postcode: area.postcode,
        score: profile.optimalScore(area),
        avgYield: area.avgYield,
        avgMonthlyRent: Math.round(area.avgMonthlyRent),
        rentalCount: area.rentalCount
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  })),

  marketMaturityChart: marketMaturity.slice(0, 15).map(data => ({
    postcode: data.postcode,
    maturityScore: data.maturityScore,
    confidence: data.confidence,
    rentalCount: data.rentalCount,
    avgYield: data.avgYield
  })),

  quarterlyRentalTrendsChart: rentalVolumeData.slice(0, 5).map(area => ({
    postcode: area.postcode,
    quarterlyData: ['2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4', '2025-Q1', '2025-Q2'].map(quarter => {
      const data = quarterlyRentalData[quarter][area.postcode];
      return data ? {
        quarter,
        avgMonthlyRent: Math.round(data.avgRent),
        avgYield: data.avgYield,
        rentalCount: data.count
      } : null;
    }).filter(Boolean)
  }))
};

fs.writeFileSync('../dashboard/public/blog49_rental_market_hotspots_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('\nChart data exported to blog49_rental_market_hotspots_chart_data.json');

// Summary insights
console.log('\n=== KEY INSIGHTS ===');
console.log(`Total rental properties analyzed: ${rentalProperties.length}`);
console.log(`Areas with rental data: ${Object.keys(postcodeGroups).length}`);
console.log(`Top rental area: ${rentalVolumeData[0]?.postcode} (${rentalVolumeData[0]?.rentalCount} rentals)`);
console.log(`Highest average rent: ${rentValueSpectrum[0]?.postcode} (€${rentValueSpectrum[0]?.avgMonthlyRent.toFixed(0)}/month)`);
console.log(`Highest rental yield: ${valueRentals[0]?.postcode} (${valueRentals[0]?.avgYield.toFixed(2)}%)`);
console.log(`Most yield-efficient: ${yieldEfficiency[0]?.postcode} (${yieldEfficiency[0]?.yieldEfficiency.toFixed(2)} per €100k)`);
console.log(`Average rental yield across market: ${(rentalVolumeData.reduce((sum, data) => sum + data.avgYield, 0) / rentalVolumeData.length).toFixed(2)}%`);
console.log(`Total monthly rent potential: €${rentalVolumeData.reduce((sum, data) => sum + (data.avgMonthlyRent * data.rentalCount), 0).toLocaleString()}`);
