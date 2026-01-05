// Dublin Street Type Momentum Analysis
// Blog 54: Why Cul-de-Sacs Are Outperforming Main Roads

const fs = require('fs');

// Load data
const data = JSON.parse(fs.readFileSync('dashboard/public/data.json', 'utf8'));

// Filter to valid Dublin properties 2021-2025
const properties = data.properties.filter(p => {
  const year = new Date(p.soldDate).getFullYear();
  return year >= 2021 && year <= 2025 && p.dublinPostcode && p.areaSqm && p.soldPrice;
});

console.log(`Analyzing ${properties.length} Dublin properties from 2021-2025`);

// Street type identification function
function getStreetType(address) {
  const addr = address.toLowerCase();

  if (addr.includes(' road')) return 'road';
  else if (addr.includes(' avenue')) return 'avenue';
  else if (addr.includes(' lane')) return 'lane';
  else if (addr.includes(' drive')) return 'drive';
  else if (addr.includes(' grove')) return 'grove';
  else if (addr.includes(' crescent')) return 'crescent';
  else if (addr.includes(' close')) return 'close';
  else if (addr.includes(' street')) return 'street';
  else if (addr.includes(' way')) return 'way';
  else return 'other';
}

// Organize data by street type and year
const streetData = {};

properties.forEach(p => {
  const year = new Date(p.soldDate).getFullYear();
  const streetType = getStreetType(p.address);

  if (!streetData[streetType]) {
    streetData[streetType] = {};
  }
  if (!streetData[streetType][year]) {
    streetData[streetType][year] = { count: 0, totalPrice: 0, prices: [] };
  }

  streetData[streetType][year].count++;
  streetData[streetType][year].totalPrice += p.soldPrice;
  streetData[streetType][year].prices.push(p.soldPrice);
});

// Calculate annual growth rates for street types with sufficient data
const analysis = {};

Object.keys(streetData).forEach(streetType => {
  const years = Object.keys(streetData[streetType]).sort();
  const yearData = streetData[streetType];

  // Need at least 3 years of data and reasonable sample sizes
  if (years.length >= 3 && yearData['2021'] && yearData['2025']) {
    const startPrice = yearData['2021'].totalPrice / yearData['2021'].count;
    const endPrice = yearData['2025'].totalPrice / yearData['2025'].count;
    const totalGrowth = ((endPrice - startPrice) / startPrice) * 100;
    const annualGrowth = totalGrowth / 4; // 4 year period

    const totalProperties = Object.values(yearData).reduce((sum, y) => sum + y.count, 0);

    analysis[streetType] = {
      startPrice: Math.round(startPrice),
      endPrice: Math.round(endPrice),
      totalGrowth: Math.round(totalGrowth * 10) / 10,
      annualGrowth: Math.round(annualGrowth * 10) / 10,
      totalProperties,
      yearlyData: years.map(year => ({
        year: parseInt(year),
        avgPrice: Math.round(yearData[year].totalPrice / yearData[year].count),
        count: yearData[year].count,
        medianPrice: yearData[year].prices.sort((a,b) => a-b)[Math.floor(yearData[year].prices.length / 2)]
      }))
    };
  }
});

// Sort by annual growth rate
const sortedStreetTypes = Object.keys(analysis).sort((a,b) =>
  analysis[b].annualGrowth - analysis[a].annualGrowth
);

// Generate chart data for blog
const chartData = {
  // Main growth chart - annual growth rates
  StreetTypeGrowthChart: sortedStreetTypes.map(type => ({
    streetType: type.charAt(0).toUpperCase() + type.slice(1),
    annualGrowth: analysis[type].annualGrowth,
    totalGrowth: analysis[type].totalGrowth,
    avgPrice: analysis[type].endPrice,
    properties: analysis[type].totalProperties
  })),

  // Price progression over time
  PriceProgressionChart: sortedStreetTypes.slice(0, 5).map(type => ({
    streetType: type.charAt(0).toUpperCase() + type.slice(1),
    ...Object.fromEntries(
      analysis[type].yearlyData.map(y => [`year${y.year}`, y.avgPrice])
    )
  })),

  // Investment efficiency chart (growth vs starting price)
  StreetTypeInvestmentEfficiencyChart: sortedStreetTypes.map(type => ({
    streetType: type.charAt(0).toUpperCase() + type.slice(1),
    annualGrowth: analysis[type].annualGrowth,
    startingPrice: analysis[type].startPrice,
    efficiency: Math.round((analysis[type].annualGrowth / analysis[type].startPrice) * 100000) / 100 // Growth per €100K invested
  }))
};

// Save chart data
fs.writeFileSync('blog54_street_type_momentum_chart_data.json', JSON.stringify(chartData, null, 2));

// Generate analysis summary for blog content
console.log('\n=== STREET TYPE MOMENTUM ANALYSIS RESULTS ===');
sortedStreetTypes.forEach(type => {
  const data = analysis[type];
  console.log(`${type.padEnd(10)}: ${data.annualGrowth.toFixed(1)}% annual (${data.totalGrowth.toFixed(1)}% total), ${data.totalProperties} properties`);
  console.log(`             €${data.startPrice.toLocaleString()} → €${data.endPrice.toLocaleString()}`);
});

// Key insights for blog
console.log('\n=== KEY INSIGHTS FOR BLOG ===');
console.log(`Top Performer: ${sortedStreetTypes[0]} (+${analysis[sortedStreetTypes[0]].annualGrowth.toFixed(1)}% annual)`);
console.log(`Worst Performer: ${sortedStreetTypes[sortedStreetTypes.length-1]} (${analysis[sortedStreetTypes[sortedStreetTypes.length-1]].annualGrowth >= 0 ? '+' : ''}${analysis[sortedStreetTypes[sortedStreetTypes.length-1]].annualGrowth.toFixed(1)}% annual)`);
console.log(`Performance Gap: ${(analysis[sortedStreetTypes[0]].annualGrowth - analysis[sortedStreetTypes[sortedStreetTypes.length-1]].annualGrowth).toFixed(1)} percentage points annually`);

console.log('\nChart data saved to blog54_street_type_momentum_chart_data.json');
console.log('Ready for blog writing!');
