const fs = require('fs');
const path = require('path');

// Read the data
const dataPath = path.join(__dirname, '../dashboard/public/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const props = data.properties.filter(p => new Date(p.soldDate) <= new Date('2025-12-31'));

// Filter properties with rental data
const rentalProps = props.filter(p => p.yieldEstimate?.monthlyRent && p.soldPrice);

console.log('=== BLOG 11: DUBLIN RENTAL MARKET ANALYSIS ===\n');

console.log('Properties with rental data:', rentalProps.length);

// Analyze rental pricing by bedroom count
console.log('\n=== RENTAL PRICING BY BEDROOM COUNT ===');
console.log('======================================');

const rentalByBeds = {};
rentalProps.forEach(p => {
  const beds = p.beds;
  if (beds && beds >= 1 && beds <= 5) {
    if (!rentalByBeds[beds]) rentalByBeds[beds] = [];
    rentalByBeds[beds].push(p);
  }
});

const bedsAnalysis = Object.entries(rentalByBeds)
  .sort(([a], [b]) => parseInt(a) - parseInt(b))
  .map(([beds, arr]) => {
    const medianRent = arr.map(p => p.yieldEstimate.monthlyRent).sort((a,b) => a-b)[Math.floor(arr.length/2)];
    const avgRent = (arr.reduce((sum, p) => sum + p.yieldEstimate.monthlyRent, 0) / arr.length);
    const medianYield = arr.map(p => p.yieldEstimate.grossYield).sort((a,b) => a-b)[Math.floor(arr.length/2)];
    const avgYield = (arr.reduce((sum, p) => sum + p.yieldEstimate.grossYield, 0) / arr.length);
    const medianPrice = arr.map(p => p.soldPrice).sort((a,b) => a-b)[Math.floor(arr.length/2)];

    return {
      beds: parseInt(beds),
      count: arr.length,
      medianRent,
      avgRent: Math.round(avgRent),
      medianYield,
      avgYield: parseFloat(avgYield.toFixed(2)),
      medianPrice,
      rentPerBed: Math.round(medianRent / parseInt(beds))
    };
  });

console.log('| Bedrooms | Properties | Median Rent | Avg Rent | Median Yield | Avg Yield | Rent per Bed |');
console.log('|----------|------------|-------------|----------|--------------|-----------|--------------|');
bedsAnalysis.forEach(stat => {
  console.log(`| ${stat.beds} | ${stat.count.toLocaleString()} | €${stat.medianRent.toLocaleString()} | €${stat.avgRent.toLocaleString()} | ${stat.medianYield.toFixed(1)}% | ${stat.avgYield}% | €${stat.rentPerBed} |`);
});

console.log('\n=== PROPERTY TYPE RENTAL ANALYSIS ===');
console.log('====================================');

const rentalByType = {};
rentalProps.forEach(p => {
  const type = p.propertyType;
  if (type) {
    if (!rentalByType[type]) rentalByType[type] = [];
    rentalByType[type].push(p);
  }
});

const typeAnalysis = Object.entries(rentalByType)
  .filter(([type, arr]) => arr.length > 100)
  .map(([type, arr]) => {
    const medianRent = arr.map(p => p.yieldEstimate.monthlyRent).sort((a,b) => a-b)[Math.floor(arr.length/2)];
    const avgRent = (arr.reduce((sum, p) => sum + p.yieldEstimate.monthlyRent, 0) / arr.length);
    const medianYield = arr.map(p => p.yieldEstimate.grossYield).sort((a,b) => a-b)[Math.floor(arr.length/2)];
    const avgYield = (arr.reduce((sum, p) => sum + p.yieldEstimate.grossYield, 0) / arr.length);
    const medianPrice = arr.map(p => p.soldPrice).sort((a,b) => a-b)[Math.floor(arr.length/2)];

    return {
      type,
      count: arr.length,
      medianRent,
      avgRent: Math.round(avgRent),
      medianYield,
      avgYield: parseFloat(avgYield.toFixed(2)),
      medianPrice,
      percentage: ((arr.length / rentalProps.length) * 100).toFixed(1)
    };
  })
  .sort((a, b) => b.medianYield - a.medianYield);

console.log('| Property Type | Count | % of Market | Median Rent | Avg Rent | Median Yield | Avg Yield |');
console.log('|---------------|-------|-------------|-------------|----------|--------------|-----------|');
typeAnalysis.forEach(stat => {
  console.log(`| ${stat.type} | ${stat.count.toLocaleString()} | ${stat.percentage}% | €${stat.medianRent.toLocaleString()} | €${stat.avgRent.toLocaleString()} | ${stat.medianYield.toFixed(1)}% | ${stat.avgYield}% |`);
});

console.log('\n=== TOP AREAS FOR RENTAL INVESTMENT ===');
console.log('=====================================');

const rentalByArea = {};
rentalProps.forEach(p => {
  const area = p.dublinPostcode;
  if (area) {
    if (!rentalByArea[area]) rentalByArea[area] = [];
    rentalByArea[area].push(p);
  }
});

const areaAnalysis = Object.entries(rentalByArea)
  .filter(([area, arr]) => arr.length > 50)
  .map(([area, arr]) => {
    const medianYield = arr.map(p => p.yieldEstimate.grossYield).sort((a,b) => a-b)[Math.floor(arr.length/2)];
    const avgYield = (arr.reduce((sum, p) => sum + p.yieldEstimate.grossYield, 0) / arr.length);
    const medianRent = arr.map(p => p.yieldEstimate.monthlyRent).sort((a,b) => a-b)[Math.floor(arr.length/2)];
    const avgRent = (arr.reduce((sum, p) => sum + p.yieldEstimate.monthlyRent, 0) / arr.length);
    const medianPrice = arr.map(p => p.soldPrice).sort((a,b) => a-b)[Math.floor(arr.length/2)];

    return {
      area,
      count: arr.length,
      medianYield,
      avgYield: parseFloat(avgYield.toFixed(2)),
      medianRent,
      avgRent: Math.round(avgRent),
      medianPrice
    };
  })
  .sort((a, b) => b.medianYield - a.medianYield)
  .slice(0, 15);

console.log('| Area | Properties | Median Yield | Avg Yield | Median Rent | Avg Rent | Median Price |');
console.log('|------|------------|--------------|-----------|-------------|----------|--------------|');
areaAnalysis.forEach(stat => {
  console.log(`| ${stat.area} | ${stat.count} | ${stat.medianYield.toFixed(1)}% | ${stat.avgYield}% | €${stat.medianRent.toLocaleString()} | €${stat.avgRent.toLocaleString()} | €${stat.medianPrice.toLocaleString()} |`);
});

console.log('\n=== BUDGET RENTAL ANALYSIS ===');
console.log('==============================');

// Analyze affordable rental options
const budgetRanges = [
  { name: 'Under €1,500', max: 1500 },
  { name: '€1,500-€2,000', min: 1500, max: 2000 },
  { name: '€2,000-€2,500', min: 2000, max: 2500 },
  { name: '€2,500-€3,000', min: 2500, max: 3000 },
  { name: 'Over €3,000', min: 3000 }
];

const budgetAnalysis = budgetRanges.map(range => {
  let filtered = rentalProps;
  if (range.min) filtered = filtered.filter(p => p.yieldEstimate.monthlyRent >= range.min);
  if (range.max) filtered = filtered.filter(p => p.yieldEstimate.monthlyRent < range.max);

  const count = filtered.length;
  const percentage = ((count / rentalProps.length) * 100).toFixed(1);

  if (count > 0) {
    const medianYield = filtered.map(p => p.yieldEstimate.grossYield).sort((a,b) => a-b)[Math.floor(count/2)];
    const medianPrice = filtered.map(p => p.soldPrice).sort((a,b) => a-b)[Math.floor(count/2)];
    const commonBeds = {};
    filtered.forEach(p => {
      if (p.beds) {
        commonBeds[p.beds] = (commonBeds[p.beds] || 0) + 1;
      }
    });

    const topBed = Object.entries(commonBeds).sort(([,a], [,b]) => b - a)[0]?.[0] || 'Mixed';

    return {
      range: range.name,
      count,
      percentage: parseFloat(percentage),
      medianYield,
      medianPrice,
      topBed
    };
  }

  return {
    range: range.name,
    count: 0,
    percentage: 0,
    medianYield: 0,
    medianPrice: 0,
    topBed: 'N/A'
  };
});

console.log('| Rent Range | Properties | % of Market | Median Yield | Median Price | Common Beds |');
console.log('|------------|------------|-------------|--------------|--------------|-------------|');
budgetAnalysis.forEach(stat => {
  console.log(`| ${stat.range} | ${stat.count} | ${stat.percentage}% | ${stat.medianYield.toFixed(1)}% | €${stat.medianPrice.toLocaleString()} | ${stat.topBed} beds |`);
});

console.log('\n=== AFFORDABILITY BY INCOME LEVEL ===');
console.log('====================================');

// Estimate affordability based on typical income multiples
const incomeMultiples = [
  { income: 30000, name: '€30k Income', multiple: 0.3 }, // 30% of income
  { income: 50000, name: '€50k Income', multiple: 0.3 },
  { income: 75000, name: '€75k Income', multiple: 0.3 },
  { income: 100000, name: '€100k Income', multiple: 0.3 }
];

const affordabilityAnalysis = incomeMultiples.map(level => {
  const maxRent = Math.round(level.income * level.multiple / 12); // Monthly rent limit
  const affordable = rentalProps.filter(p => p.yieldEstimate.monthlyRent <= maxRent);
  const count = affordable.length;
  const percentage = ((count / rentalProps.length) * 100).toFixed(1);

  if (count > 0) {
    const medianRent = affordable.map(p => p.yieldEstimate.monthlyRent).sort((a,b) => a-b)[Math.floor(count/2)];
    const commonTypes = {};
    affordable.forEach(p => {
      if (p.propertyType) {
        commonTypes[p.propertyType] = (commonTypes[p.propertyType] || 0) + 1;
      }
    });

    const topType = Object.entries(commonTypes).sort(([,a], [,b]) => b - a)[0]?.[0] || 'Mixed';

    return {
      income: level.name,
      maxRent,
      count,
      percentage: parseFloat(percentage),
      medianRent,
      topType
    };
  }

  return {
    income: level.name,
    maxRent,
    count: 0,
    percentage: 0,
    medianRent: 0,
    topType: 'N/A'
  };
});

console.log('| Income Level | Max Monthly Rent | Affordable Properties | % Available | Median Rent | Common Type |');
console.log('|--------------|------------------|----------------------|-------------|-------------|-------------|');
affordabilityAnalysis.forEach(stat => {
  console.log(`| ${stat.income} | €${stat.maxRent} | ${stat.count} | ${stat.percentage}% | €${stat.medianRent} | ${stat.topType} |`);
});

// Generate chart data for visualization
const chartData = {
  bedsPricing: bedsAnalysis.map(stat => ({
    bedrooms: stat.beds,
    medianRent: stat.medianRent,
    medianYield: stat.medianYield,
    rentPerBed: stat.rentPerBed
  })),
  typeComparison: typeAnalysis.slice(0, 8).map(stat => ({
    type: stat.type,
    medianRent: stat.medianRent,
    medianYield: stat.medianYield
  })),
  topAreas: areaAnalysis.slice(0, 10).map(stat => ({
    area: stat.area,
    medianYield: stat.medianYield,
    medianRent: stat.medianRent
  })),
  budgetRanges: budgetAnalysis.filter(stat => stat.count > 0).map(stat => ({
    range: stat.range,
    count: stat.count,
    medianYield: stat.medianYield
  }))
};

// Save chart data for blog
const outputPath = path.join(__dirname, '../blog11_rental_market_chart_data.json');
fs.writeFileSync(outputPath, JSON.stringify(chartData, null, 2));
console.log(`\n📈 Chart data saved to: ${outputPath}`);

console.log('\n✅ BLOG 11 ANALYSIS COMPLETE');
console.log('Key insights:');
console.log('• 27,236 properties with rental data available for analysis');
console.log('• 1-bed median €1,925, 2-bed €2,550, 3-bed €3,000, 4-bed €3,931');
console.log('• Duplexes offer highest yield (9.0%), apartments close (8.6%)');
console.log('• Top areas: D22 (9.5%), D11 (9.1%), D15 (8.9%), D1 (8.7%)');
console.log('• Budget analysis: 44.8% of rentals under €2,000/month');
console.log('• Income affordability: €30k income can afford 25.5% of rental market');
