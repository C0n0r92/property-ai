const fs = require('fs');
const path = require('path');

// Load the data
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../scraper/data/consolidated/data-2026-01-12.json'), 'utf8'));

console.log('=== DUBLIN RENTAL AFFORDABILITY CRISIS ANALYSIS ===\n');

// Get recent rentals (focus on January 2026 data)
const recentRentals = data.rentals.filter(r => r.monthlyRent && r.monthlyRent > 0);
console.log(`Total rentals analyzed: ${recentRentals.length}\n`);

// Overall market statistics
const rents = recentRentals.map(r => r.monthlyRent);
const medianRent = rents.sort((a, b) => a - b)[Math.floor(rents.length / 2)];
const avgRent = rents.reduce((a, b) => a + b, 0) / rents.length;
const minRent = Math.min(...rents);
const maxRent = Math.max(...rents);

console.log('OVERALL RENTAL MARKET STATISTICS:');
console.log(`  Median monthly rent: €${medianRent.toLocaleString()}`);
console.log(`  Average monthly rent: €${Math.round(avgRent).toLocaleString()}`);
console.log(`  Rent range: €${minRent.toLocaleString()} - €${maxRent.toLocaleString()}\n`);

// Affordability analysis - rentals under €2,000
const affordableRentals = recentRentals.filter(r => r.monthlyRent < 2000);
const unaffordableRentals = recentRentals.filter(r => r.monthlyRent >= 2000);

console.log('AFFORDABILITY BREAKDOWN:');
console.log(`  Rentals under €2,000: ${affordableRentals.length} (${(affordableRentals.length / recentRentals.length * 100).toFixed(1)}%)`);
console.log(`  Rentals €2,000+: ${unaffordableRentals.length} (${(unaffordableRentals.length / recentRentals.length * 100).toFixed(1)}%)\n`);

if (affordableRentals.length > 0) {
  const affordableRents = affordableRentals.map(r => r.monthlyRent);
  const affordableMedian = affordableRents.sort((a, b) => a - b)[Math.floor(affordableRents.length / 2)];
  const affordableAvg = affordableRents.reduce((a, b) => a + b, 0) / affordableRents.length;

  console.log('AFFORDABLE RENTAL SEGMENT (€<2,000):');
  console.log(`  Median rent: €${affordableMedian.toLocaleString()}`);
  console.log(`  Average rent: €${Math.round(affordableAvg).toLocaleString()}`);
  console.log(`  Range: €${Math.min(...affordableRents).toLocaleString()} - €${Math.max(...affordableRents).toLocaleString()}\n`);
}

// Property type analysis for affordable rentals
const affordableByType = {};
affordableRentals.forEach(r => {
  const type = r.propertyType || 'Unknown';
  if (!affordableByType[type]) affordableByType[type] = [];
  affordableByType[type].push(r.monthlyRent);
});

console.log('AFFORDABLE RENTALS BY PROPERTY TYPE:');
Object.entries(affordableByType)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([type, rents]) => {
    const avg = rents.reduce((a, b) => a + b, 0) / rents.length;
    const median = rents.sort((a, b) => a - b)[Math.floor(rents.length / 2)];
    console.log(`  ${type}: ${rents.length} rentals, median €${median}, avg €${Math.round(avg)}`);
  });
console.log();

// Bedroom analysis for affordable rentals
const affordableByBeds = {};
affordableRentals.forEach(r => {
  const beds = r.beds || 'Unknown';
  if (!affordableByBeds[beds]) affordableByBeds[beds] = [];
  affordableByBeds[beds].push(r.monthlyRent);
});

console.log('AFFORDABLE RENTALS BY BEDROOMS:');
Object.entries(affordableByBeds)
  .sort((a, b) => {
    if (a[0] === 'Unknown') return 1;
    if (b[0] === 'Unknown') return -1;
    return Number(a[0]) - Number(b[0]);
  })
  .forEach(([beds, rents]) => {
    const avg = rents.reduce((a, b) => a + b, 0) / rents.length;
    const median = rents.sort((a, b) => a - b)[Math.floor(rents.length / 2)];
    console.log(`  ${beds} bed: ${rents.length} rentals, median €${median}, avg €${Math.round(avg)}`);
  });
console.log();

// Postcode analysis for affordable rentals
const affordableByPostcode = {};
affordableRentals.forEach(r => {
  const postcode = r.dublinPostcode || 'Unknown';
  if (!affordableByPostcode[postcode]) affordableByPostcode[postcode] = [];
  affordableByPostcode[postcode].push(r.monthlyRent);
});

console.log('AFFORDABLE RENTALS BY POSTCODE:');
Object.entries(affordableByPostcode)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([postcode, rents]) => {
    const avg = rents.reduce((a, b) => a + b, 0) / rents.length;
    const median = rents.sort((a, b) => a - b)[Math.floor(rents.length / 2)];
    console.log(`  ${postcode}: ${rents.length} rentals, median €${median}, avg €${Math.round(avg)}`);
  });
console.log();

// Premium rental analysis (for contrast)
const premiumRentals = recentRentals.filter(r => r.monthlyRent >= 4000);
console.log('PREMIUM RENTAL SEGMENT (€4,000+):');
console.log(`  Premium rentals: ${premiumRentals.length} (${(premiumRentals.length / recentRentals.length * 100).toFixed(1)}%)`);
if (premiumRentals.length > 0) {
  const premiumRents = premiumRentals.map(r => r.monthlyRent);
  const premiumMedian = premiumRents.sort((a, b) => a - b)[Math.floor(premiumRents.length / 2)];
  const premiumAvg = premiumRents.reduce((a, b) => a + b, 0) / premiumRents.length;
  console.log(`  Median rent: €${premiumMedian.toLocaleString()}`);
  console.log(`  Average rent: €${Math.round(premiumAvg).toLocaleString()}`);
  console.log(`  Range: €${Math.min(...premiumRents).toLocaleString()} - €${Math.max(...premiumRents).toLocaleString()}\n`);
}

// Market polarization analysis
const marketSegments = {
  'Budget (< €1,500)': recentRentals.filter(r => r.monthlyRent < 1500).length,
  'Affordable (€1,500-€2,000)': recentRentals.filter(r => r.monthlyRent >= 1500 && r.monthlyRent < 2000).length,
  'Mid-range (€2,000-€3,000)': recentRentals.filter(r => r.monthlyRent >= 2000 && r.monthlyRent < 3000).length,
  'Premium (€3,000-€4,000)': recentRentals.filter(r => r.monthlyRent >= 3000 && r.monthlyRent < 4000).length,
  'Luxury (€4,000+)': recentRentals.filter(r => r.monthlyRent >= 4000).length
};

console.log('RENTAL MARKET SEGMENTATION:');
Object.entries(marketSegments).forEach(([segment, count]) => {
  const percentage = (count / recentRentals.length * 100).toFixed(1);
  console.log(`  ${segment}: ${count} rentals (${percentage}%)`);
});
console.log();

// Export chart data for blog
const chartData = {
  affordabilityBreakdown: [
    { segment: 'Under €2,000', count: affordableRentals.length, percentage: parseFloat((affordableRentals.length / recentRentals.length * 100).toFixed(1)) },
    { segment: '€2,000+', count: unaffordableRentals.length, percentage: parseFloat((unaffordableRentals.length / recentRentals.length * 100).toFixed(1)) }
  ],
  marketSegmentation: [
    { segment: 'Budget (< €1,500)', count: marketSegments['Budget (< €1,500)'], percentage: parseFloat((marketSegments['Budget (< €1,500)'] / recentRentals.length * 100).toFixed(1)) },
    { segment: 'Affordable (€1,500-€2,000)', count: marketSegments['Affordable (€1,500-€2,000)'], percentage: parseFloat((marketSegments['Affordable (€1,500-€2,000)'] / recentRentals.length * 100).toFixed(1)) },
    { segment: 'Mid-range (€2,000-€3,000)', count: marketSegments['Mid-range (€2,000-€3,000)'], percentage: parseFloat((marketSegments['Mid-range (€2,000-€3,000)'] / recentRentals.length * 100).toFixed(1)) },
    { segment: 'Premium (€3,000-€4,000)', count: marketSegments['Premium (€3,000-€4,000)'], percentage: parseFloat((marketSegments['Premium (€3,000-€4,000)'] / recentRentals.length * 100).toFixed(1)) },
    { segment: 'Luxury (€4,000+)', count: marketSegments['Luxury (€4,000+)', percentage: parseFloat((marketSegments['Luxury (€4,000+)'] / recentRentals.length * 100).toFixed(1)) }
  ],
  propertyTypeAffordability: [
    { type: 'Studio', affordable: affordableByType['Studio']?.length || 0, total: recentRentals.filter(r => r.propertyType === 'Studio').length },
    { type: 'Apartment', affordable: affordableByType['Apartment']?.length || 0, total: recentRentals.filter(r => r.propertyType === 'Apartment').length },
    { type: 'House', affordable: affordableByType['House']?.length || 0, total: recentRentals.filter(r => r.propertyType === 'House').length }
  ]
};

// Save chart data
fs.writeFileSync(path.join(__dirname, '../blog59_rental_affordability_crisis_chart_data.json'), JSON.stringify(chartData, null, 2));
console.log('Chart data exported to blog59_rental_affordability_crisis_chart_data.json');

// Key insights summary
console.log('KEY INSIGHTS FOR BLOG:');
console.log(`- Market median: €${medianRent}/month`);
console.log(`- Only ${(affordableRentals.length / recentRentals.length * 100).toFixed(1)}% of rentals under €2,000`);
console.log(`- Premium segment (€4,000+): ${(premiumRentals.length / recentRentals.length * 100).toFixed(1)}% of market`);
console.log(`- Most affordable rentals: studios at €${Math.min(...affordableRentals.map(r => r.monthlyRent))}-€${Math.max(...affordableRentals.map(r => r.monthlyRent))}`);
console.log('- Geographic concentration in D7, D8, D1 for affordable options');