const fs = require('fs');

// Load data
const data = JSON.parse(fs.readFileSync('dashboard/public/data.json', 'utf8'));

// Filter for valid 2024-2025 properties
const validProperties = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31');
});

console.log(`Properties analyzed: ${validProperties.length}`);

// Seasonal Timing Analysis - When to buy and sell in Dublin
console.log('\nSeasonal Timing Analysis:');

// Monthly sales volume and pricing
const monthlyStats = {};
validProperties.forEach(p => {
  const month = p.soldDate.substring(0, 7); // YYYY-MM
  if (!monthlyStats[month]) monthlyStats[month] = [];
  monthlyStats[month].push(p);
});

console.log('Monthly Sales Volume and Pricing:');
const monthlyData = Object.entries(monthlyStats)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([month, props]) => {
    const avgPrice = props.reduce((sum, p) => sum + p.soldPrice, 0) / props.length;
    const totalVolume = props.reduce((sum, p) => sum + p.soldPrice, 0);

    return {
      month,
      salesCount: props.length,
      avgPrice: avgPrice,
      totalVolume: totalVolume
    };
  });

monthlyData.forEach(item => {
  console.log(`${item.month}: ${item.salesCount} sales, €${item.avgPrice.toLocaleString()} avg, €${(item.totalVolume/1000000).toFixed(1)}M volume`);
});

// Seasonal patterns by quarter
console.log('\nQuarterly Analysis:');
const quarterlyStats = {};
monthlyData.forEach(item => {
  const monthNum = parseInt(item.month.split('-')[1]);
  const quarter = Math.ceil(monthNum / 3);
  const year = item.month.split('-')[0];
  const quarterKey = `${year}-Q${quarter}`;

  if (!quarterlyStats[quarterKey]) {
    quarterlyStats[quarterKey] = { sales: 0, totalVolume: 0, months: [] };
  }

  quarterlyStats[quarterKey].sales += item.salesCount;
  quarterlyStats[quarterKey].totalVolume += item.totalVolume;
  quarterlyStats[quarterKey].months.push(item);
});

Object.entries(quarterlyStats).forEach(([quarter, data]) => {
  const avgPrice = data.months.reduce((sum, m) => sum + m.avgPrice, 0) / data.months.length;
  const avgMonthlySales = data.sales / data.months.length;

  console.log(`${quarter}:`);
  console.log(`  Average monthly sales: ${avgMonthlySales.toFixed(0)}`);
  console.log(`  Average price: €${avgPrice.toLocaleString()}`);
  console.log(`  Total quarterly volume: €${(data.totalVolume/1000000).toFixed(1)}M`);
  console.log('');
});

// Best and worst months for selling
const bestSellingMonths = monthlyData.sort((a, b) => b.salesCount - a.salesCount);
const bestPricingMonths = monthlyData.sort((a, b) => b.avgPrice - a.avgPrice);

console.log('Best Months for Selling (Volume):');
bestSellingMonths.slice(0, 3).forEach((month, i) => {
  console.log(`${i+1}. ${month.month}: ${month.salesCount} sales`);
});

console.log('\nBest Months for Pricing:');
bestPricingMonths.slice(0, 3).forEach((month, i) => {
  console.log(`${i+1}. ${month.month}: €${month.avgPrice.toLocaleString()} avg`);
});

// Seasonal patterns by property type
console.log('\nSeasonal Patterns by Property Type:');
const propertyTypes = ['Apartment', 'Semi-D', 'Terrace', 'Detached'];
propertyTypes.forEach(type => {
  const typeProps = validProperties.filter(p => p.propertyType === type);
  if (typeProps.length < 500) return;

  const typeMonthlyStats = {};
  typeProps.forEach(p => {
    const month = p.soldDate.substring(0, 7);
    if (!typeMonthlyStats[month]) typeMonthlyStats[month] = [];
    typeMonthlyStats[month].push(p);
  });

  const typeMonthlyData = Object.entries(typeMonthlyStats).map(([month, props]) => ({
    month,
    salesCount: props.length,
    avgPrice: props.reduce((sum, p) => sum + p.soldPrice, 0) / props.length
  }));

  const bestMonth = typeMonthlyData.reduce((best, current) =>
    current.salesCount > best.salesCount ? current : best
  );

  const bestPriceMonth = typeMonthlyData.reduce((best, current) =>
    current.avgPrice > best.avgPrice ? current : best
  );

  console.log(`${type} properties:`);
  console.log(`  Best sales volume: ${bestMonth.month} (${bestMonth.salesCount} sales)`);
  console.log(`  Best pricing: ${bestPriceMonth.month} (€${bestPriceMonth.avgPrice.toLocaleString()})`);
  console.log('');
});

// Seasonal patterns by price bracket
console.log('Seasonal Patterns by Price Bracket:');
const priceBrackets = [
  { min: 0, max: 300000, label: '€0-300k' },
  { min: 300000, max: 500000, label: '€300k-500k' },
  { min: 500000, max: 700000, label: '€500k-700k' },
  { min: 700000, max: 1000000, label: '€700k-1M' },
  { min: 1000000, max: 999999999, label: '€1M+' }
];

priceBrackets.forEach(bracket => {
  const bracketProps = validProperties.filter(p =>
    p.soldPrice >= bracket.min && p.soldPrice < bracket.max
  );
  if (bracketProps.length < 200) return;

  const bracketMonthlyStats = {};
  bracketProps.forEach(p => {
    const month = p.soldDate.substring(0, 7);
    if (!bracketMonthlyStats[month]) bracketMonthlyStats[month] = [];
    bracketMonthlyStats[month].push(p);
  });

  const bracketMonthlyData = Object.entries(bracketMonthlyStats).map(([month, props]) => ({
    month,
    salesCount: props.length,
    avgPrice: props.reduce((sum, p) => sum + p.soldPrice, 0) / props.length
  }));

  const bestVolumeMonth = bracketMonthlyData.reduce((best, current) =>
    current.salesCount > best.salesCount ? current : best
  );

  console.log(`${bracket.label} properties:`);
  console.log(`  Best month: ${bestVolumeMonth.month} (${bestVolumeMonth.salesCount} sales)`);
  console.log(`  Peak price: €${bestVolumeMonth.avgPrice.toLocaleString()}`);
  console.log('');
});

// Weekday selling patterns (for timing within month)
console.log('Weekday Selling Patterns:');
const weekdayStats = {};
validProperties.forEach(p => {
  const date = new Date(p.soldDate);
  const weekday = date.getDay(); // 0=Sunday, 6=Saturday
  if (!weekdayStats[weekday]) weekdayStats[weekday] = [];
  weekdayStats[weekday].push(p);
});

const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
Object.entries(weekdayStats).forEach(([day, props]) => {
  const dayIndex = parseInt(day);
  const avgPrice = props.reduce((sum, p) => sum + p.soldPrice, 0) / props.length;
  console.log(`${weekdayNames[dayIndex]}: ${props.length} sales, €${avgPrice.toLocaleString()} avg`);
});

// Timing strategy insights
console.log('\nTiming Strategy Insights:');

// Calculate price volatility by month
const priceVolatility = monthlyData.map((item, index) => {
  if (index === 0) return { ...item, volatility: 0 };
  const prevPrice = monthlyData[index - 1].avgPrice;
  const volatility = ((item.avgPrice - prevPrice) / prevPrice) * 100;
  return { ...item, volatility };
});

console.log('Monthly Price Volatility:');
priceVolatility.forEach(item => {
  console.log(`${item.month}: ${item.volatility > 0 ? '+' : ''}${item.volatility.toFixed(1)}%`);
});

// Best months for buyers vs sellers
const buyerBestMonths = monthlyData.sort((a, b) => a.avgPrice - b.avgPrice).slice(0, 3);
const sellerBestMonths = monthlyData.sort((a, b) => b.avgPrice - a.avgPrice).slice(0, 3);

console.log('\nBest Months for Buyers (lowest prices):');
buyerBestMonths.forEach((month, i) => {
  console.log(`${i+1}. ${month.month}: €${month.avgPrice.toLocaleString()}`);
});

console.log('\nBest Months for Sellers (highest prices):');
sellerBestMonths.forEach((month, i) => {
  console.log(`${i+1}. ${month.month}: €${month.avgPrice.toLocaleString()}`);
});

// Export chart data
const chartData = {
  monthlySalesVolumeChart: monthlyData.map(item => ({
    month: item.month,
    salesCount: item.salesCount,
    averagePrice: Math.round(item.avgPrice),
    totalVolume: Math.round(item.totalVolume / 1000000) // Convert to millions
  })),

  quarterlyAnalysisChart: Object.entries(quarterlyStats).map(([quarter, data]) => {
    const avgPrice = data.months.reduce((sum, m) => sum + m.avgPrice, 0) / data.months.length;
    return {
      quarter,
      averageMonthlySales: Math.round(data.sales / data.months.length),
      averagePrice: Math.round(avgPrice),
      totalVolume: Math.round(data.totalVolume / 1000000)
    };
  }),

  propertyTypeSeasonalChart: propertyTypes.map(type => {
    const typeProps = validProperties.filter(p => p.propertyType === type);
    if (typeProps.length < 500) return null;

    const typeMonthlyStats = {};
    typeProps.forEach(p => {
      const month = p.soldDate.substring(0, 7);
      if (!typeMonthlyStats[month]) typeMonthlyStats[month] = [];
      typeMonthlyStats[month].push(p);
    });

    const typeMonthlyData = Object.entries(typeMonthlyStats).map(([month, props]) => ({
      month,
      salesCount: props.length,
      averagePrice: Math.round(props.reduce((sum, p) => sum + p.soldPrice, 0) / props.length)
    }));

    return {
      propertyType: type,
      monthlyData: typeMonthlyData
    };
  }).filter(Boolean),

  priceBracketSeasonalChart: priceBrackets.map(bracket => {
    const bracketProps = validProperties.filter(p =>
      p.soldPrice >= bracket.min && p.soldPrice < bracket.max
    );
    if (bracketProps.length < 200) return null;

    const bracketMonthlyStats = {};
    bracketProps.forEach(p => {
      const month = p.soldDate.substring(0, 7);
      if (!bracketMonthlyStats[month]) bracketMonthlyStats[month] = [];
      bracketMonthlyStats[month].push(p);
    });

    const bracketMonthlyData = Object.entries(bracketMonthlyStats).map(([month, props]) => ({
      month,
      salesCount: props.length,
      averagePrice: Math.round(props.reduce((sum, p) => sum + p.soldPrice, 0) / props.length)
    }));

    return {
      priceBracket: bracket.label,
      monthlyData: bracketMonthlyData
    };
  }).filter(Boolean),

  weekdayPerformanceChart: Object.entries(weekdayStats).map(([day, props]) => ({
    weekday: weekdayNames[parseInt(day)],
    salesCount: props.length,
    averagePrice: Math.round(props.reduce((sum, p) => sum + p.soldPrice, 0) / props.length)
  })),

  priceVolatilityChart: priceVolatility.map(item => ({
    month: item.month,
    volatility: item.volatility
  })),

  buyerSellerTimingChart: [
    ...buyerBestMonths.map((month, i) => ({
      timing: 'Buyer Advantage',
      month: month.month,
      averagePrice: Math.round(month.avgPrice),
      rank: i + 1
    })),
    ...sellerBestMonths.map((month, i) => ({
      timing: 'Seller Advantage',
      month: month.month,
      averagePrice: Math.round(month.avgPrice),
      rank: i + 1
    }))
  ]
};

fs.writeFileSync('blog39_seasonal_timing_strategy_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('\nChart data exported to blog39_seasonal_timing_strategy_chart_data.json');
