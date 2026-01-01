const fs = require('fs');

// Load data
const data = JSON.parse(fs.readFileSync('dashboard/public/data.json', 'utf8'));

// Filter for valid 2024-2025 properties
const validProperties = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31');
});

console.log(`Total valid properties analyzed: ${validProperties.length}`);

// Property Type Cyclical Performance Analysis
console.log('\nProperty Type Cyclical Performance Analysis:');

// Define quarters and property types
const quarters = ['2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4', '2025-Q1', '2025-Q2'];
const propertyTypes = ['Apartment', 'Semi-D', 'Terrace', 'Detached'];

const cyclicalData = {};

// Analyze performance by property type and quarter
propertyTypes.forEach(type => {
  cyclicalData[type] = {};

  quarters.forEach(quarter => {
    const quarterProps = validProperties.filter(p => {
      const date = new Date(p.soldDate);
      const year = date.getFullYear();
      const q = Math.ceil((date.getMonth() + 1) / 3);
      return p.propertyType === type && `${year}-Q${q}` === quarter;
    });

    if (quarterProps.length < 20) {
      cyclicalData[type][quarter] = null;
      return;
    }

    const avgPrice = quarterProps.reduce((sum, p) => sum + p.soldPrice, 0) / quarterProps.length;
    const salesVolume = quarterProps.length;

    cyclicalData[type][quarter] = {
      avgPrice,
      salesVolume,
      totalValue: avgPrice * salesVolume
    };
  });
});

// Display quarterly performance patterns
console.log('Quarterly Performance by Property Type:');
propertyTypes.forEach(type => {
  console.log(`\n${type} Properties:`);
  quarters.forEach(quarter => {
    const data = cyclicalData[type][quarter];
    if (!data) {
      console.log(`  ${quarter}: Insufficient data`);
      return;
    }
    console.log(`  ${quarter}: ${data.salesVolume} sales, €${data.avgPrice.toLocaleString()} avg, €${(data.totalValue/1000000).toFixed(1)}M total value`);
  });
});

// Calculate cyclical patterns and seasonal strength
console.log('\nCyclical Pattern Analysis:');

// Calculate seasonal indices (Q1 = 100 baseline)
propertyTypes.forEach(type => {
  console.log(`\n${type} Seasonal Performance Index:`);

  const q1Data = cyclicalData[type]['2024-Q1'];
  if (!q1Data) return;

  quarters.forEach(quarter => {
    const data = cyclicalData[type][quarter];
    if (!data) return;

    const priceIndex = (data.avgPrice / q1Data.avgPrice) * 100;
    const volumeIndex = (data.salesVolume / q1Data.salesVolume) * 100;

    console.log(`  ${quarter}: Price index ${priceIndex.toFixed(1)}, Volume index ${volumeIndex.toFixed(1)}`);
  });
});

// Peak performance analysis
console.log('\nPeak Performance Analysis:');
propertyTypes.forEach(type => {
  const validQuarters = quarters.filter(q => cyclicalData[type][q]);

  if (validQuarters.length < 4) return;

  // Find peak price quarter
  const peakPriceQuarter = validQuarters.reduce((peak, quarter) => {
    const peakData = cyclicalData[type][peak];
    const currentData = cyclicalData[type][quarter];
    return currentData.avgPrice > peakData.avgPrice ? quarter : peak;
  });

  // Find peak volume quarter
  const peakVolumeQuarter = validQuarters.reduce((peak, quarter) => {
    const peakData = cyclicalData[type][peak];
    const currentData = cyclicalData[type][quarter];
    return currentData.salesVolume > peakData.salesVolume ? quarter : peak;
  });

  const peakPriceData = cyclicalData[type][peakPriceQuarter];
  const peakVolumeData = cyclicalData[type][peakVolumeQuarter];

  console.log(`${type}:`);
  console.log(`  Peak pricing: ${peakPriceQuarter} (€${peakPriceData.avgPrice.toLocaleString()})`);
  console.log(`  Peak volume: ${peakVolumeQuarter} (${peakVolumeData.salesVolume} sales)`);
  console.log(`  Peak value: ${peakPriceQuarter} (€${(peakPriceData.totalValue/1000000).toFixed(1)}M)`);
});

// Market timing strategy insights
console.log('\nMarket Timing Strategy Insights:');

// Calculate optimal buying/selling quarters for each property type
propertyTypes.forEach(type => {
  const validQuarters = quarters.filter(q => cyclicalData[type][q]);

  if (validQuarters.length < 4) return;

  // Best quarter for buyers (lowest prices)
  const buyerQuarter = validQuarters.reduce((best, quarter) => {
    const bestData = cyclicalData[type][best];
    const currentData = cyclicalData[type][quarter];
    return currentData.avgPrice < bestData.avgPrice ? quarter : best;
  });

  // Best quarter for sellers (highest prices)
  const sellerQuarter = validQuarters.reduce((best, quarter) => {
    const bestData = cyclicalData[type][best];
    const currentData = cyclicalData[type][quarter];
    return currentData.avgPrice > bestData.avgPrice ? quarter : best;
  });

  const buyerData = cyclicalData[type][buyerQuarter];
  const sellerData = cyclicalData[type][sellerQuarter];
  const priceDifference = sellerData.avgPrice - buyerData.avgPrice;
  const percentageAdvantage = (priceDifference / buyerData.avgPrice) * 100;

  console.log(`${type} Market Timing:`);
  console.log(`  Best for buyers: ${buyerQuarter} (€${buyerData.avgPrice.toLocaleString()})`);
  console.log(`  Best for sellers: ${sellerQuarter} (€${sellerData.avgPrice.toLocaleString()})`);
  console.log(`  Seasonal advantage: €${priceDifference.toLocaleString()} (${percentageAdvantage.toFixed(1)}%)`);
});

// Volatility analysis by property type
console.log('\nPrice Volatility by Property Type and Quarter:');
propertyTypes.forEach(type => {
  const validQuarters = quarters.filter(q => cyclicalData[type][q]);

  if (validQuarters.length < 2) return;

  console.log(`${type} Price Changes:`);

  for (let i = 1; i < validQuarters.length; i++) {
    const currentQuarter = validQuarters[i];
    const previousQuarter = validQuarters[i-1];

    const currentData = cyclicalData[type][currentQuarter];
    const previousData = cyclicalData[type][previousQuarter];

    const priceChange = ((currentData.avgPrice - previousData.avgPrice) / previousData.avgPrice) * 100;

    console.log(`  ${previousQuarter} → ${currentQuarter}: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%`);
  }
});

// Future performance prediction based on cyclical patterns
console.log('\nCyclical Pattern Predictions for 2025-Q3/Q4:');
propertyTypes.forEach(type => {
  const validQuarters = quarters.filter(q => cyclicalData[type][q]);

  if (validQuarters.length < 4) return;

  // Calculate average Q3/Q4 performance vs Q1/Q2
  const q3Data = cyclicalData[type]['2024-Q3'];
  const q4Data = cyclicalData[type]['2024-Q4'];
  const q1Data = cyclicalData[type]['2025-Q1'];
  const q2Data = cyclicalData[type]['2025-Q2'];

  if (!q3Data || !q4Data || !q1Data || !q2Data) return;

  const autumnAvgPrice = (q3Data.avgPrice + q4Data.avgPrice) / 2;
  const springAvgPrice = (q1Data.avgPrice + q2Data.avgPrice) / 2;
  const autumnPremium = ((autumnAvgPrice - springAvgPrice) / springAvgPrice) * 100;

  const autumnAvgVolume = (q3Data.salesVolume + q4Data.salesVolume) / 2;
  const springAvgVolume = (q1Data.salesVolume + q2Data.salesVolume) / 2;
  const volumeChange = ((autumnAvgVolume - springAvgVolume) / springAvgVolume) * 100;

  console.log(`${type} 2025 Autumn Forecast:`);
  console.log(`  Expected price premium: ${autumnPremium > 0 ? '+' : ''}${autumnPremium.toFixed(1)}%`);
  console.log(`  Expected volume change: ${volumeChange > 0 ? '+' : ''}${volumeChange.toFixed(1)}%`);
});

// Export chart data
const chartData = {
  cyclicalPerformanceChart: propertyTypes.map(type => {
    const quarterlyData = quarters.map(quarter => {
      const data = cyclicalData[type][quarter];
      return {
        quarter,
        averagePrice: data ? Math.round(data.avgPrice) : null,
        salesVolume: data ? data.salesVolume : null,
        totalValue: data ? Math.round(data.totalValue / 1000000) : null // Convert to millions
      };
    });

    return {
      propertyType: type,
      quarterlyData
    };
  }),

  seasonalIndexChart: propertyTypes.map(type => {
    const q1Data = cyclicalData[type]['2024-Q1'];
    if (!q1Data) return null;

    const seasonalData = quarters.map(quarter => {
      const data = cyclicalData[type][quarter];
      if (!data) return null;

      return {
        quarter,
        priceIndex: (data.avgPrice / q1Data.avgPrice) * 100,
        volumeIndex: (data.salesVolume / q1Data.salesVolume) * 100
      };
    }).filter(Boolean);

    return {
      propertyType: type,
      seasonalData
    };
  }).filter(Boolean),

  peakPerformanceChart: propertyTypes.map(type => {
    const validQuarters = quarters.filter(q => cyclicalData[type][q]);
    if (validQuarters.length < 4) return null;

    const peakPriceQuarter = validQuarters.reduce((peak, quarter) => {
      const peakData = cyclicalData[type][peak];
      const currentData = cyclicalData[type][quarter];
      return currentData.avgPrice > peakData.avgPrice ? quarter : peak;
    });

    const peakVolumeQuarter = validQuarters.reduce((peak, quarter) => {
      const peakData = cyclicalData[type][peak];
      const currentData = cyclicalData[type][quarter];
      return currentData.salesVolume > peakData.salesVolume ? quarter : peak;
    });

    return {
      propertyType: type,
      peakPriceQuarter,
      peakPrice: Math.round(cyclicalData[type][peakPriceQuarter].avgPrice),
      peakVolumeQuarter,
      peakVolume: cyclicalData[type][peakVolumeQuarter].salesVolume
    };
  }).filter(Boolean),

  marketTimingChart: propertyTypes.map(type => {
    const validQuarters = quarters.filter(q => cyclicalData[type][q]);
    if (validQuarters.length < 4) return null;

    const buyerQuarter = validQuarters.reduce((best, quarter) => {
      const bestData = cyclicalData[type][best];
      const currentData = cyclicalData[type][quarter];
      return currentData.avgPrice < bestData.avgPrice ? quarter : best;
    });

    const sellerQuarter = validQuarters.reduce((best, quarter) => {
      const bestData = cyclicalData[type][best];
      const currentData = cyclicalData[type][quarter];
      return currentData.avgPrice > bestData.avgPrice ? quarter : best;
    });

    const buyerPrice = Math.round(cyclicalData[type][buyerQuarter].avgPrice);
    const sellerPrice = Math.round(cyclicalData[type][sellerQuarter].avgPrice);
    const seasonalAdvantage = sellerPrice - buyerPrice;

    return {
      propertyType: type,
      buyerQuarter,
      buyerPrice,
      sellerQuarter,
      sellerPrice,
      seasonalAdvantage
    };
  }).filter(Boolean),

  priceVolatilityChart: propertyTypes.map(type => {
    const validQuarters = quarters.filter(q => cyclicalData[type][q]);
    if (validQuarters.length < 2) return null;

    const volatilityData = [];
    for (let i = 1; i < validQuarters.length; i++) {
      const currentQuarter = validQuarters[i];
      const previousQuarter = validQuarters[i-1];

      const currentData = cyclicalData[type][currentQuarter];
      const previousData = cyclicalData[type][previousQuarter];

      const priceChange = ((currentData.avgPrice - previousData.avgPrice) / previousData.avgPrice) * 100;

      volatilityData.push({
        quarterTransition: `${previousQuarter}→${currentQuarter}`,
        priceChange
      });
    }

    return {
      propertyType: type,
      volatilityData
    };
  }).filter(Boolean),

  autumnForecastChart: propertyTypes.map(type => {
    const q3Data = cyclicalData[type]['2024-Q3'];
    const q4Data = cyclicalData[type]['2024-Q4'];
    const q1Data = cyclicalData[type]['2025-Q1'];
    const q2Data = cyclicalData[type]['2025-Q2'];

    if (!q3Data || !q4Data || !q1Data || !q2Data) return null;

    const autumnAvgPrice = (q3Data.avgPrice + q4Data.avgPrice) / 2;
    const springAvgPrice = (q1Data.avgPrice + q2Data.avgPrice) / 2;
    const autumnPremium = ((autumnAvgPrice - springAvgPrice) / springAvgPrice) * 100;

    return {
      propertyType: type,
      autumnAvgPrice: Math.round(autumnAvgPrice),
      springAvgPrice: Math.round(springAvgPrice),
      autumnPremium
    };
  }).filter(Boolean)
};

fs.writeFileSync('blog44_property_type_cyclical_performance_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('\nChart data exported to blog44_property_type_cyclical_performance_chart_data.json');
