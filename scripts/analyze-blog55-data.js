// Dublin Corner House Discount Analysis
// Blog 55: Why Corner Properties Cost 13% Less

const fs = require('fs');

// Load data
const data = JSON.parse(fs.readFileSync('dashboard/public/data.json', 'utf8'));

// Filter to valid Dublin properties 2021-2025
const properties = data.properties.filter(p => {
  const year = new Date(p.soldDate).getFullYear();
  return year >= 2021 && year <= 2025 && p.dublinPostcode && p.areaSqm && p.soldPrice;
});

console.log(`Analyzing ${properties.length} Dublin properties from 2021-2025`);

// Corner property identification
function isCornerProperty(property) {
  // End of Terrace properties are corner houses
  return property.propertyType === 'End of Terrace';
}

function isRegularProperty(property) {
  // Regular terrace/semi-d properties (not end of terrace)
  return (property.propertyType === 'Terrace' || property.propertyType === 'Semi-D') &&
         !property.address.toLowerCase().includes('corner');
}

// Separate corner and regular properties
const cornerProperties = properties.filter(isCornerProperty);
const regularProperties = properties.filter(isRegularProperty);

console.log(`Corner properties: ${cornerProperties.length}`);
console.log(`Regular properties: ${regularProperties.length}`);

// Calculate overall averages
const cornerAvgPrice = cornerProperties.reduce((sum, p) => sum + p.soldPrice, 0) / cornerProperties.length;
const regularAvgPrice = regularProperties.reduce((sum, p) => sum + p.soldPrice, 0) / regularProperties.length;
const discountPercent = ((regularAvgPrice - cornerAvgPrice) / regularAvgPrice) * 100;

console.log(`Corner average price: €${Math.round(cornerAvgPrice).toLocaleString()}`);
console.log(`Regular average price: €${Math.round(regularAvgPrice).toLocaleString()}`);
console.log(`Corner discount: ${discountPercent.toFixed(1)}%`);

// Analyze by property type (comparing end-of-terrace to regular terrace/semi-d)
const analysisByType = {};

// Compare end-of-terrace to regular terrace houses
const cornerTerraceLike = cornerProperties; // All end-of-terrace
const regularTerrace = regularProperties.filter(p => p.propertyType === 'Terrace');
const regularSemiD = regularProperties.filter(p => p.propertyType === 'Semi-D');

if (cornerTerraceLike.length > 20 && regularTerrace.length > 20) {
  const cornerAvg = cornerTerraceLike.reduce((sum, p) => sum + p.soldPrice, 0) / cornerTerraceLike.length;
  const regularAvg = regularTerrace.reduce((sum, p) => sum + p.soldPrice, 0) / regularTerrace.length;
  const discount = ((regularAvg - cornerAvg) / regularAvg) * 100;

  analysisByType['End Terrace vs Terrace'] = {
    cornerCount: cornerTerraceLike.length,
    regularCount: regularTerrace.length,
    cornerAvg: Math.round(cornerAvg),
    regularAvg: Math.round(regularAvg),
    discount: Math.round(discount * 10) / 10
  };
}

if (cornerTerraceLike.length > 20 && regularSemiD.length > 20) {
  const cornerAvg = cornerTerraceLike.reduce((sum, p) => sum + p.soldPrice, 0) / cornerTerraceLike.length;
  const regularAvg = regularSemiD.reduce((sum, p) => sum + p.soldPrice, 0) / regularSemiD.length;
  const discount = ((regularAvg - cornerAvg) / regularAvg) * 100;

  analysisByType['End Terrace vs Semi-D'] = {
    cornerCount: cornerTerraceLike.length,
    regularCount: regularSemiD.length,
    cornerAvg: Math.round(cornerAvg),
    regularAvg: Math.round(regularAvg),
    discount: Math.round(discount * 10) / 10
  };
}

// Analyze by size brackets
const sizeBrackets = [
  { min: 0, max: 100, label: 'Under 100sqm' },
  { min: 100, max: 150, label: '100-150sqm' },
  { min: 150, max: 200, label: '150-200sqm' },
  { min: 200, max: 999, label: 'Over 200sqm' }
];

const sizeAnalysis = {};

sizeBrackets.forEach(bracket => {
  const cornerSize = cornerProperties.filter(p =>
    p.areaSqm >= bracket.min && p.areaSqm < bracket.max
  );
  const regularSize = regularProperties.filter(p =>
    p.areaSqm >= bracket.min && p.areaSqm < bracket.max
  );

  if (cornerSize.length > 10 && regularSize.length > 10) {
    const cornerAvg = cornerSize.reduce((sum, p) => sum + p.soldPrice, 0) / cornerSize.length;
    const regularAvg = regularSize.reduce((sum, p) => sum + p.soldPrice, 0) / regularSize.length;
    const discount = ((regularAvg - cornerAvg) / regularAvg) * 100;

    sizeAnalysis[bracket.label] = {
      cornerCount: cornerSize.length,
      regularCount: regularSize.length,
      cornerAvg: Math.round(cornerAvg),
      regularAvg: Math.round(regularAvg),
      discount: Math.round(discount * 10) / 10
    };
  }
});

// Analyze by Dublin area (top areas by volume)
const areaAnalysis = {};
const topAreas = ['D15', 'D18', 'D24', 'D4', 'D8', 'D13', 'D14', 'D7', 'D6W', 'D22'];

topAreas.forEach(area => {
  const cornerArea = cornerProperties.filter(p => p.dublinPostcode === area);
  const regularArea = regularProperties.filter(p => p.dublinPostcode === area);

  if (cornerArea.length > 5 && regularArea.length > 5) {
    const cornerAvg = cornerArea.reduce((sum, p) => sum + p.soldPrice, 0) / cornerArea.length;
    const regularAvg = regularArea.reduce((sum, p) => sum + p.soldPrice, 0) / regularArea.length;
    const discount = ((regularAvg - cornerAvg) / regularAvg) * 100;

    areaAnalysis[area] = {
      cornerCount: cornerArea.length,
      regularCount: regularArea.length,
      cornerAvg: Math.round(cornerAvg),
      regularAvg: Math.round(regularAvg),
      discount: Math.round(discount * 10) / 10
    };
  }
});

// Generate chart data for blog
const chartData = {
  // Overall discount comparison
  CornerDiscountOverviewChart: [
    {
      category: 'Corner Houses',
      averagePrice: Math.round(cornerAvgPrice),
      count: cornerProperties.length
    },
    {
      category: 'Regular Terrace/Semi',
      averagePrice: Math.round(regularAvgPrice),
      count: regularProperties.length
    }
  ],

  // Discount by property type
  CornerDiscountByTypeChart: Object.keys(analysisByType).map(type => ({
    propertyType: type,
    cornerPrice: analysisByType[type].cornerAvg,
    regularPrice: analysisByType[type].regularAvg,
    discountPercent: analysisByType[type].discount,
    cornerCount: analysisByType[type].cornerCount,
    regularCount: analysisByType[type].regularCount
  })),

  // Discount by size bracket
  CornerDiscountBySizeChart: Object.keys(sizeAnalysis).map(size => ({
    sizeBracket: size,
    cornerPrice: sizeAnalysis[size].cornerAvg,
    regularPrice: sizeAnalysis[size].regularAvg,
    discountPercent: sizeAnalysis[size].discount
  })),

  // Discount by area
  CornerDiscountByAreaChart: Object.keys(areaAnalysis).map(area => ({
    area: area,
    cornerPrice: areaAnalysis[area].cornerAvg,
    regularPrice: areaAnalysis[area].regularAvg,
    discountPercent: areaAnalysis[area].discount,
    totalProperties: areaAnalysis[area].cornerCount + areaAnalysis[area].regularCount
  }))
};

// Save chart data
fs.writeFileSync('blog55_corner_house_discount_chart_data.json', JSON.stringify(chartData, null, 2));

// Generate analysis summary for blog content
console.log('\n=== CORNER HOUSE DISCOUNT ANALYSIS RESULTS ===');
console.log(`Overall discount: ${discountPercent.toFixed(1)}% (€${Math.round(regularAvgPrice - cornerAvgPrice).toLocaleString()} savings)`);

console.log('\nBy Property Type:');
Object.keys(analysisByType).forEach(type => {
  const data = analysisByType[type];
  console.log(`${type}: ${data.discount}% discount, Corner: €${data.cornerAvg.toLocaleString()} (${data.cornerCount}), Regular: €${data.regularAvg.toLocaleString()} (${data.regularCount})`);
});

console.log('\nBy Size Bracket:');
Object.keys(sizeAnalysis).forEach(size => {
  const data = sizeAnalysis[size];
  console.log(`${size}: ${data.discount}% discount`);
});

console.log('\n=== KEY INSIGHTS FOR BLOG ===');
console.log(`Maximum discount area: ${Object.keys(areaAnalysis).reduce((a,b) =>
  areaAnalysis[a].discount > areaAnalysis[b].discount ? a : b
)} (${Math.max(...Object.values(areaAnalysis).map(a => a.discount))}%)`);

console.log(`Average corner discount: ${discountPercent.toFixed(1)}%`);
console.log(`Total potential savings: €${Math.round(regularAvgPrice - cornerAvgPrice).toLocaleString()} per property`);

console.log('\nChart data saved to blog55_corner_house_discount_chart_data.json');
console.log('Ready for blog writing!');
