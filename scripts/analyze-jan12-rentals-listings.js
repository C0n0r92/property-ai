const fs = require('fs');
const path = require('path');

// Load today's data and previous data
const todayData = JSON.parse(fs.readFileSync(path.join(__dirname, '../scraper/data/consolidated/data-2026-01-12.json'), 'utf8'));
const previousData = JSON.parse(fs.readFileSync(path.join(__dirname, '../scraper/data/consolidated/data-2026-01-04.json'), 'utf8'));

console.log('=== ANALYZING NEW RENTALS & LISTINGS FROM JAN 12, 2026 ===\n');

// Analyze rentals
if (todayData.rentals && previousData.rentals) {
  const newRentalsCount = todayData.rentals.length - previousData.rentals.length;
  console.log(`RENTALS: ${todayData.rentals.length} total, ${newRentalsCount} new`);

  if (newRentalsCount > 0) {
    const newRentals = todayData.rentals.slice(-newRentalsCount);
    analyzeRentals(newRentals, 'New Rentals from Jan 12');
  } else {
    // Analyze recent rentals instead
    const recentRentals = todayData.rentals.slice(-50);
    analyzeRentals(recentRentals, 'Recent 50 Rentals');
  }
} else {
  console.log('No rental data available');
}

// Analyze listings
if (todayData.listings && previousData.listings) {
  const newListingsCount = todayData.listings.length - previousData.listings.length;
  console.log(`\nLISTINGS: ${todayData.listings.length} total, ${newListingsCount} new`);

  if (newListingsCount > 0) {
    const newListings = todayData.listings.slice(-newListingsCount);
    analyzeListings(newListings, 'New Listings from Jan 12');
  } else {
    // Analyze recent listings instead
    const recentListings = todayData.listings.slice(-50);
    analyzeListings(recentListings, 'Recent 50 Listings');
  }
} else {
  console.log('No listing data available');
}

function analyzeRentals(rentals, label) {
  console.log(`\n=== ${label.toUpperCase()} (${rentals.length} rentals) ===\n`);

  // Filter out invalid rentals
  const validRentals = rentals.filter(r => r.rent && r.rent > 0);

  if (validRentals.length === 0) {
    console.log('No valid rental data to analyze.');
    return;
  }

  // Rent analysis
  const rents = validRentals.map(r => r.rent);
  const medianRent = rents.sort((a, b) => a - b)[Math.floor(rents.length / 2)];
  const avgRent = rents.reduce((a, b) => a + b, 0) / rents.length;
  const minRent = Math.min(...rents);
  const maxRent = Math.max(...rents);

  console.log('RENT STATISTICS:');
  console.log(`  Median: €${medianRent.toLocaleString()}/month`);
  console.log(`  Average: €${Math.round(avgRent).toLocaleString()}/month`);
  console.log(`  Range: €${minRent.toLocaleString()} - €${maxRent.toLocaleString()}/month\n`);

  // Property type analysis
  const byType = {};
  validRentals.forEach(r => {
    const type = r.propertyType || 'Unknown';
    if (!byType[type]) byType[type] = [];
    byType[type].push(r.rent);
  });

  console.log('RENTALS BY PROPERTY TYPE:');
  Object.entries(byType)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([type, rents]) => {
      const avg = rents.reduce((a, b) => a + b, 0) / rents.length;
      const median = rents.sort((a, b) => a - b)[Math.floor(rents.length / 2)];
      console.log(`  ${type}: ${rents.length} rentals, median €${median.toLocaleString()}, avg €${Math.round(avg).toLocaleString()}`);
    });
  console.log();

  // Bedroom analysis
  const byBeds = {};
  validRentals.forEach(r => {
    const beds = r.beds || 'Unknown';
    if (!byBeds[beds]) byBeds[beds] = [];
    byBeds[beds].push(r.rent);
  });

  console.log('RENTALS BY BEDROOMS:');
  Object.entries(byBeds)
    .sort((a, b) => {
      if (a[0] === 'Unknown') return 1;
      if (b[0] === 'Unknown') return -1;
      return Number(a[0]) - Number(b[0]);
    })
    .forEach(([beds, rents]) => {
      const avg = rents.reduce((a, b) => a + b, 0) / rents.length;
      const median = rents.sort((a, b) => a - b)[Math.floor(rents.length / 2)];
      console.log(`  ${beds} bed: ${rents.length} rentals, median €${median.toLocaleString()}, avg €${Math.round(avg).toLocaleString()}`);
    });
  console.log();

  // Postcode analysis
  const byPostcode = {};
  validRentals.forEach(r => {
    const postcode = r.dublinPostcode || 'Unknown';
    if (!byPostcode[postcode]) byPostcode[postcode] = [];
    byPostcode[postcode].push(r.rent);
  });

  console.log('RENTALS BY POSTCODE (top 10):');
  Object.entries(byPostcode)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10)
    .forEach(([postcode, rents]) => {
      const avg = rents.reduce((a, b) => a + b, 0) / rents.length;
      const median = rents.sort((a, b) => a - b)[Math.floor(rents.length / 2)];
      console.log(`  ${postcode}: ${rents.length} rentals, median €${median.toLocaleString()}, avg €${Math.round(avg).toLocaleString()}`);
    });
  console.log();

  // Rent per sqm analysis
  const withSqm = validRentals.filter(r => r.areaSqm && r.areaSqm > 0);
  if (withSqm.length > 0) {
    const rentPerSqm = withSqm.map(r => r.rent / r.areaSqm);
    const medianSqm = rentPerSqm.sort((a, b) => a - b)[Math.floor(rentPerSqm.length / 2)];
    const avgSqm = rentPerSqm.reduce((a, b) => a + b, 0) / rentPerSqm.length;

    console.log('RENT PER SQUARE METER:');
    console.log(`  Rentals with sqm data: ${withSqm.length}`);
    console.log(`  Median: €${Math.round(medianSqm * 100) / 100}/sqm/month`);
    console.log(`  Average: €${Math.round(avgSqm * 100) / 100}/sqm/month\n`);
  }

  // Sample of recent rentals
  console.log('SAMPLE RECENT RENTALS:');
  validRentals.slice(-5).forEach((r, i) => {
    const postcode = r.dublinPostcode || 'Unknown';
    const type = r.propertyType || 'Unknown';
    const beds = r.beds || '?';
    console.log(`  ${r.address}: ${beds} bed ${type}, €${r.rent}/month (${postcode})`);
  });
}

function analyzeListings(listings, label) {
  console.log(`\n=== ${label.toUpperCase()} (${listings.length} listings) ===\n`);

  // Filter out invalid listings
  const validListings = listings.filter(l => l.price && l.price > 0);

  if (validListings.length === 0) {
    console.log('No valid listing data to analyze.');
    return;
  }

  // Price analysis
  const prices = validListings.map(l => l.price);
  const medianPrice = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)];
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  console.log('PRICE STATISTICS:');
  console.log(`  Median: €${medianPrice.toLocaleString()}`);
  console.log(`  Average: €${Math.round(avgPrice).toLocaleString()}`);
  console.log(`  Range: €${minPrice.toLocaleString()} - €${maxPrice.toLocaleString()}\n`);

  // Property type analysis
  const byType = {};
  validListings.forEach(l => {
    const type = l.propertyType || 'Unknown';
    if (!byType[type]) byType[type] = [];
    byType[type].push(l.price);
  });

  console.log('LISTINGS BY PROPERTY TYPE:');
  Object.entries(byType)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([type, prices]) => {
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const median = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)];
      console.log(`  ${type}: ${prices.length} listings, median €${median.toLocaleString()}, avg €${Math.round(avg).toLocaleString()}`);
    });
  console.log();

  // Bedroom analysis
  const byBeds = {};
  validListings.forEach(l => {
    const beds = l.beds || 'Unknown';
    if (!byBeds[beds]) byBeds[beds] = [];
    byBeds[beds].push(l.price);
  });

  console.log('LISTINGS BY BEDROOMS:');
  Object.entries(byBeds)
    .sort((a, b) => {
      if (a[0] === 'Unknown') return 1;
      if (b[0] === 'Unknown') return -1;
      return Number(a[0]) - Number(b[0]);
    })
    .forEach(([beds, prices]) => {
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const median = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)];
      console.log(`  ${beds} bed: ${prices.length} listings, median €${median.toLocaleString()}, avg €${Math.round(avg).toLocaleString()}`);
    });
  console.log();

  // Postcode analysis
  const byPostcode = {};
  validListings.forEach(l => {
    const postcode = l.dublinPostcode || 'Unknown';
    if (!byPostcode[postcode]) byPostcode[postcode] = [];
    byPostcode[postcode].push(l.price);
  });

  console.log('LISTINGS BY POSTCODE (top 10):');
  Object.entries(byPostcode)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10)
    .forEach(([postcode, prices]) => {
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const median = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)];
      console.log(`  ${postcode}: ${prices.length} listings, median €${median.toLocaleString()}, avg €${Math.round(avg).toLocaleString()}`);
    });
  console.log();

  // Price per sqm analysis
  const withSqm = validListings.filter(l => l.areaSqm && l.areaSqm > 0);
  if (withSqm.length > 0) {
    const pricePerSqm = withSqm.map(l => l.price / l.areaSqm);
    const medianSqm = pricePerSqm.sort((a, b) => a - b)[Math.floor(pricePerSqm.length / 2)];
    const avgSqm = pricePerSqm.reduce((a, b) => a + b, 0) / pricePerSqm.length;

    console.log('PRICE PER SQUARE METER:');
    console.log(`  Listings with sqm data: ${withSqm.length}`);
    console.log(`  Median: €${Math.round(medianSqm).toLocaleString()}/sqm`);
    console.log(`  Average: €${Math.round(avgSqm).toLocaleString()}/sqm\n`);
  }

  // Sample of recent listings
  console.log('SAMPLE RECENT LISTINGS:');
  validListings.slice(-5).forEach((l, i) => {
    const postcode = l.dublinPostcode || 'Unknown';
    const type = l.propertyType || 'Unknown';
    const beds = l.beds || '?';
    console.log(`  ${l.address}: ${beds} bed ${type}, €${l.price} (${postcode})`);
  });
}

// Generate blog topic proposals based on the analysis
console.log('\n=== BLOG TOPIC PROPOSALS BASED ON NEW DATA ===\n');

// Analyze patterns for potential blog topics
if (todayData.rentals && todayData.rentals.length > previousData.rentals.length) {
  console.log('POTENTIAL RENTAL BLOG TOPICS:');
  console.log('1. "January 2026 Dublin Rental Market Update: New Supply Patterns"');
  console.log('2. "Dublin Rental Price Segmentation: Premium vs Affordable Markets"');
  console.log('3. "Property Type Rental Efficiency: Which Homes Yield Best Returns"');
}

if (todayData.listings && todayData.listings.length > previousData.listings.length) {
  console.log('\nPOTENTIAL LISTING BLOG TOPICS:');
  console.log('4. "January 2026 Dublin Sales Market: Fresh Inventory Analysis"');
  console.log('5. "Dublin Listing Price Strategy: Market Positioning Trends"');
  console.log('6. "Area-Specific Listing Dynamics: Where Competition Intensifies"');
}
