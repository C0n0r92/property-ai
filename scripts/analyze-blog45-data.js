const fs = require('fs');

// Load data
const data = JSON.parse(fs.readFileSync('dashboard/public/data.json', 'utf8'));

// Filter for valid 2024-2025 properties
const validProperties = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31') &&
         p.areaSqm > 0;
});

console.log(`Total valid properties analyzed: ${validProperties.length}`);

// Size Efficiency Paradox: Smaller Properties vs Larger Properties Trade-offs
console.log('\nSize Efficiency Paradox Analysis:');

// Define size bands for comprehensive analysis
const sizeBands = [
  { min: 0, max: 70, label: 'Compact', name: 'Compact (<70sqm)' },
  { min: 70, max: 100, label: 'Standard', name: 'Standard (70-100sqm)' },
  { min: 100, max: 140, label: 'Spacious', name: 'Spacious (100-140sqm)' },
  { min: 140, max: 200, label: 'Large', name: 'Large (140-200sqm)' },
  { min: 200, max: 9999, label: 'XL', name: 'XL (200sqm+)' }
];

// Analyze price per square meter efficiency
console.log('Price Efficiency by Size Band:');
sizeBands.forEach(band => {
  const bandProps = validProperties.filter(p =>
    p.areaSqm >= band.min && p.areaSqm < band.max
  );

  if (bandProps.length < 100) return;

  const avgPrice = bandProps.reduce((sum, p) => sum + p.soldPrice, 0) / bandProps.length;
  const avgPricePerSqm = bandProps.reduce((sum, p) => sum + p.pricePerSqm, 0) / bandProps.length;

  console.log(`${band.name}:`);
  console.log(`  Average price: €${avgPrice.toLocaleString()}`);
  console.log(`  Price per sqm: €${avgPricePerSqm.toFixed(0)}`);
  console.log(`  Properties: ${bandProps.length}`);
});

// Over-asking success paradox
console.log('\nOver-Asking Success Paradox:');
sizeBands.forEach(band => {
  const bandProps = validProperties.filter(p =>
    p.areaSqm >= band.min && p.areaSqm < band.max
  );

  if (bandProps.length < 100) return;

  const overAsking = bandProps.filter(p => p.overUnderPercent > 0);
  const successRate = (overAsking.length / bandProps.length * 100);
  const avgPremium = overAsking.length > 0 ?
    overAsking.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAsking.length : 0;

  console.log(`${band.name}:`);
  console.log(`  Over-asking success rate: ${successRate.toFixed(1)}%`);
  console.log(`  Average premium when successful: ${avgPremium.toFixed(1)}%`);
});

// Value efficiency paradox - smaller vs larger properties
console.log('\nValue Efficiency Paradox:');

// Calculate relative efficiency compared to medium-sized properties
const mediumBand = sizeBands.find(b => b.label === 'Spacious');
if (mediumBand) {
  const mediumProps = validProperties.filter(p =>
    p.areaSqm >= mediumBand.min && p.areaSqm < mediumBand.max
  );

  if (mediumProps.length >= 100) {
    const mediumAvgPricePerSqm = mediumProps.reduce((sum, p) => sum + p.pricePerSqm, 0) / mediumProps.length;

    console.log('Price Efficiency vs Medium Properties (100-140sqm):');
    sizeBands.forEach(band => {
      if (band.label === 'Spacious') return;

      const bandProps = validProperties.filter(p =>
        p.areaSqm >= band.min && p.areaSqm < band.max
      );

      if (bandProps.length < 100) return;

      const bandAvgPricePerSqm = bandProps.reduce((sum, p) => sum + p.pricePerSqm, 0) / bandProps.length;
      const efficiencyRatio = bandAvgPricePerSqm / mediumAvgPricePerSqm;
      const efficiencyPercent = ((efficiencyRatio - 1) * 100);

      console.log(`${band.name}: ${efficiencyPercent > 0 ? '+' : ''}${efficiencyPercent.toFixed(1)}% vs medium (${efficiencyRatio.toFixed(2)}x)`);
    });
  }
}

// Market timing paradox by size
console.log('\nMarket Timing by Size Band:');
const quarters = ['2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4', '2025-Q1', '2025-Q2'];

sizeBands.forEach(band => {
  console.log(`\n${band.name} Quarterly Performance:`);

  quarters.forEach(quarter => {
    const quarterProps = validProperties.filter(p => {
      const date = new Date(p.soldDate);
      const year = date.getFullYear();
      const q = Math.ceil((date.getMonth() + 1) / 3);
      return `${year}-Q${q}` === quarter && p.areaSqm >= band.min && p.areaSqm < band.max;
    });

    if (quarterProps.length < 20) return;

    const avgPrice = quarterProps.reduce((sum, p) => sum + p.soldPrice, 0) / quarterProps.length;
    console.log(`  ${quarter}: ${quarterProps.length} sales, €${avgPrice.toLocaleString()} avg`);
  });
});

// Investment efficiency paradox
console.log('\nInvestment Efficiency Paradox:');
sizeBands.forEach(band => {
  const bandProps = validProperties.filter(p =>
    p.areaSqm >= band.min && p.areaSqm < band.max
  );

  if (bandProps.length < 100) return;

  const yieldProps = bandProps.filter(p => p.yieldEstimate && p.yieldEstimate.grossYield > 0);

  if (yieldProps.length < 20) {
    console.log(`${band.name}: Insufficient yield data`);
    return;
  }

  const avgYield = yieldProps.reduce((sum, p) => sum + p.yieldEstimate.grossYield, 0) / yieldProps.length;
  const avgPrice = yieldProps.reduce((sum, p) => sum + p.soldPrice, 0) / yieldProps.length;

  console.log(`${band.name}:`);
  console.log(`  Average rental yield: ${avgYield.toFixed(2)}%`);
  console.log(`  Average property price: €${avgPrice.toLocaleString()}`);
  console.log(`  Properties with yield data: ${yieldProps.length}`);
});

// Buyer psychology paradox - size preferences
console.log('\nSize Preference Analysis:');

// Analyze property type distribution by size band
sizeBands.forEach(band => {
  const bandProps = validProperties.filter(p =>
    p.areaSqm >= band.min && p.areaSqm < band.max
  );

  if (bandProps.length < 100) return;

  const propertyTypeBreakdown = {};
  bandProps.forEach(p => {
    propertyTypeBreakdown[p.propertyType] = (propertyTypeBreakdown[p.propertyType] || 0) + 1;
  });

  console.log(`\n${band.name} Property Types:`);
  Object.entries(propertyTypeBreakdown)
    .sort(([,a], [,b]) => b - a)
    .forEach(([type, count]) => {
      const percentage = (count / bandProps.length * 100).toFixed(1);
      console.log(`  ${type}: ${count} properties (${percentage}%)`);
    });
});

// Decision-making framework paradox
console.log('\nSize-Based Decision Framework:');

// Calculate optimal size bands for different buyer profiles
const buyerProfiles = [
  {
    name: 'Urban Professionals',
    criteria: ['price_per_sqm', 'location_efficiency', 'maintenance_cost'],
    optimalSize: 'Compact'
  },
  {
    name: 'Growing Families',
    criteria: ['space_requirements', 'resale_value', 'family_friendly'],
    optimalSize: 'Spacious'
  },
  {
    name: 'Investors',
    criteria: ['rental_yield', 'capital_appreciation', 'management_ease'],
    optimalSize: 'Standard'
  },
  {
    name: 'Luxury Buyers',
    criteria: ['prestige', 'exclusivity', 'investment_potential'],
    optimalSize: 'XL'
  }
];

console.log('Optimal Size Bands by Buyer Profile:');
buyerProfiles.forEach(profile => {
  console.log(`\n${profile.name}:`);
  console.log(`  Optimal size: ${profile.optimalSize}`);
  console.log(`  Key criteria: ${profile.criteria.join(', ')}`);

  // Find the corresponding size band data
  const optimalBand = sizeBands.find(b => b.label === profile.optimalSize.split(' ')[0]);
  if (optimalBand) {
    const bandProps = validProperties.filter(p =>
      p.areaSqm >= optimalBand.min && p.areaSqm < optimalBand.max
    );

    if (bandProps.length >= 100) {
      const avgPrice = bandProps.reduce((sum, p) => sum + p.soldPrice, 0) / bandProps.length;
      console.log(`  Average price: €${avgPrice.toLocaleString()}`);
      console.log(`  Sample size: ${bandProps.length} properties`);
    }
  }
});

// Export chart data
const chartData = {
  sizeEfficiencyChart: sizeBands.map(band => {
    const bandProps = validProperties.filter(p =>
      p.areaSqm >= band.min && p.areaSqm < band.max
    );

    if (bandProps.length < 100) return null;

    const avgPrice = bandProps.reduce((sum, p) => sum + p.soldPrice, 0) / bandProps.length;
    const avgPricePerSqm = bandProps.reduce((sum, p) => sum + p.pricePerSqm, 0) / bandProps.length;

    return {
      sizeBand: band.label,
      averagePrice: Math.round(avgPrice),
      pricePerSqm: Math.round(avgPricePerSqm),
      sampleSize: bandProps.length
    };
  }).filter(Boolean),

  overAskingParadoxChart: sizeBands.map(band => {
    const bandProps = validProperties.filter(p =>
      p.areaSqm >= band.min && p.areaSqm < band.max
    );

    if (bandProps.length < 100) return null;

    const overAsking = bandProps.filter(p => p.overUnderPercent > 0);
    const successRate = overAsking.length / bandProps.length * 100;
    const avgPremium = overAsking.length > 0 ?
      overAsking.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAsking.length : 0;

    return {
      sizeBand: band.label,
      successRate,
      averagePremium: avgPremium,
      sampleSize: bandProps.length
    };
  }).filter(Boolean),

  valueEfficiencyChart: (() => {
    const mediumBand = sizeBands.find(b => b.label === 'Spacious');
    if (!mediumBand) return [];

    const mediumProps = validProperties.filter(p =>
      p.areaSqm >= mediumBand.min && p.areaSqm < mediumBand.max
    );

    if (mediumProps.length < 100) return [];

    const mediumAvgPricePerSqm = mediumProps.reduce((sum, p) => sum + p.pricePerSqm, 0) / mediumProps.length;

    return sizeBands.map(band => {
      if (band.label === 'Spacious') return null;

      const bandProps = validProperties.filter(p =>
        p.areaSqm >= band.min && p.areaSqm < band.max
      );

      if (bandProps.length < 100) return null;

      const bandAvgPricePerSqm = bandProps.reduce((sum, p) => sum + p.pricePerSqm, 0) / bandProps.length;
      const efficiencyRatio = bandAvgPricePerSqm / mediumAvgPricePerSqm;

      return {
        sizeBand: band.label,
        efficiencyRatio,
        percentageDifference: ((efficiencyRatio - 1) * 100)
      };
    }).filter(Boolean);
  })(),

  quarterlyTimingChart: sizeBands.map(band => {
    const quarterlyData = quarters.map(quarter => {
      const quarterProps = validProperties.filter(p => {
        const date = new Date(p.soldDate);
        const year = date.getFullYear();
        const q = Math.ceil((date.getMonth() + 1) / 3);
        return `${year}-Q${q}` === quarter && p.areaSqm >= band.min && p.areaSqm < band.max;
      });

      if (quarterProps.length < 20) return null;

      const avgPrice = quarterProps.reduce((sum, p) => sum + p.soldPrice, 0) / quarterProps.length;

      return {
        quarter,
        averagePrice: Math.round(avgPrice),
        salesVolume: quarterProps.length
      };
    }).filter(Boolean);

    return {
      sizeBand: band.label,
      quarterlyData
    };
  }),

  investmentEfficiencyChart: sizeBands.map(band => {
    const bandProps = validProperties.filter(p =>
      p.areaSqm >= band.min && p.areaSqm < band.max
    );

    if (bandProps.length < 100) return null;

    const yieldProps = bandProps.filter(p => p.yieldEstimate && p.yieldEstimate.grossYield > 0);

    if (yieldProps.length < 20) return null;

    const avgYield = yieldProps.reduce((sum, p) => sum + p.yieldEstimate.grossYield, 0) / yieldProps.length;
    const avgPrice = yieldProps.reduce((sum, p) => sum + p.soldPrice, 0) / yieldProps.length;

    return {
      sizeBand: band.label,
      averageYield: avgYield,
      averagePrice: Math.round(avgPrice),
      sampleSize: yieldProps.length
    };
  }).filter(Boolean),

  propertyTypeDistributionChart: sizeBands.map(band => {
    const bandProps = validProperties.filter(p =>
      p.areaSqm >= band.min && p.areaSqm < band.max
    );

    if (bandProps.length < 100) return null;

    const propertyTypeBreakdown = {};
    bandProps.forEach(p => {
      propertyTypeBreakdown[p.propertyType] = (propertyTypeBreakdown[p.propertyType] || 0) + 1;
    });

    const distributionData = Object.entries(propertyTypeBreakdown)
      .sort(([,a], [,b]) => b - a)
      .map(([type, count]) => ({
        propertyType: type,
        count,
        percentage: (count / bandProps.length * 100)
      }));

    return {
      sizeBand: band.label,
      distributionData
    };
  }).filter(Boolean),

  buyerProfileOptimizationChart: buyerProfiles.map(profile => {
    const optimalBand = sizeBands.find(b => b.label === profile.optimalSize.split(' ')[0]);
    if (!optimalBand) return null;

    const bandProps = validProperties.filter(p =>
      p.areaSqm >= optimalBand.min && p.areaSqm < optimalBand.max
    );

    if (bandProps.length < 100) return null;

    const avgPrice = bandProps.reduce((sum, p) => sum + p.soldPrice, 0) / bandProps.length;
    const avgPricePerSqm = bandProps.reduce((sum, p) => sum + p.pricePerSqm, 0) / bandProps.length;

    return {
      buyerProfile: profile.name,
      optimalSize: profile.optimalSize,
      keyCriteria: profile.criteria,
      averagePrice: Math.round(avgPrice),
      pricePerSqm: Math.round(avgPricePerSqm),
      sampleSize: bandProps.length
    };
  }).filter(Boolean)
};

fs.writeFileSync('blog45_size_efficiency_paradox_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('\nChart data exported to blog45_size_efficiency_paradox_chart_data.json');
