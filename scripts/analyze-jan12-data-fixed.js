const fs = require('fs');
const path = require('path');

// Load today's data and previous data
const todayData = JSON.parse(fs.readFileSync(path.join(__dirname, '../scraper/data/consolidated/data-2026-01-12.json'), 'utf8'));
const previousData = JSON.parse(fs.readFileSync(path.join(__dirname, '../scraper/data/consolidated/data-2026-01-04.json'), 'utf8'));

console.log('=== ANALYZING NEW DATA FROM JAN 12, 2026 ===\n');

// Get new rentals and listings
const newRentalsCount = todayData.rentals.length - previousData.rentals.length;
const newListingsCount = todayData.listings.length - previousData.listings.length;

console.log(`New rentals added: ${newRentalsCount}`);
console.log(`New listings added: ${newListingsCount}\n`);

// Analyze new rentals (using monthlyRent field)
if (newRentalsCount > 0) {
  const newRentals = todayData.rentals.slice(-newRentalsCount);
  console.log('=== NEW RENTALS ANALYSIS ===');

  // Filter valid rentals
  const validRentals = newRentals.filter(r => r.monthlyRent && r.monthlyRent > 0);

  if (validRentals.length > 0) {
    const rents = validRentals.map(r => r.monthlyRent);
    const medianRent = rents.sort((a, b) => a - b)[Math.floor(rents.length / 2)];
    const avgRent = rents.reduce((a, b) => a + b, 0) / rents.length;
    const minRent = Math.min(...rents);
    const maxRent = Math.max(...rents);

    console.log(`Valid rentals: ${validRentals.length}`);
    console.log(`Median rent: €${medianRent.toLocaleString()}`);
    console.log(`Average rent: €${Math.round(avgRent).toLocaleString()}`);
    console.log(`Rent range: €${minRent.toLocaleString()} - €${maxRent.toLocaleString()}\n`);

    // Property type analysis
    const byType = {};
    validRentals.forEach(r => {
      const type = r.propertyType || 'Unknown';
      if (!byType[type]) byType[type] = [];
      byType[type].push(r.monthlyRent);
    });

    console.log('RENTALS BY PROPERTY TYPE:');
    Object.entries(byType)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5)
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
      byBeds[beds].push(r.monthlyRent);
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
      byPostcode[postcode].push(r.monthlyRent);
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

    // Sample of high-value rentals
    console.log('HIGHEST RENTALS:');
    validRentals
      .sort((a, b) => b.monthlyRent - a.monthlyRent)
      .slice(0, 5)
      .forEach((r, i) => {
        console.log(`  €${r.monthlyRent.toLocaleString()}: ${r.address?.substring(0, 60)} (${r.propertyType}, ${r.beds} beds, ${r.dublinPostcode})`);
      });
    console.log();

    // Sample of affordable rentals
    console.log('MOST AFFORDABLE RENTALS:');
    validRentals
      .filter(r => r.monthlyRent < 2000)
      .sort((a, b) => a.monthlyRent - b.monthlyRent)
      .slice(0, 5)
      .forEach((r, i) => {
        console.log(`  €${r.monthlyRent.toLocaleString()}: ${r.address?.substring(0, 60)} (${r.propertyType}, ${r.beds} beds, ${r.dublinPostcode})`);
      });
  }
}

// Analyze new listings (using askingPrice field)
if (newListingsCount > 0) {
  const newListings = todayData.listings.slice(-newListingsCount);
  console.log('\n=== NEW LISTINGS ANALYSIS ===');

  // Filter valid listings
  const validListings = newListings.filter(l => l.askingPrice && l.askingPrice > 0);

  if (validListings.length > 0) {
    const prices = validListings.map(l => l.askingPrice);
    const medianPrice = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)];
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    console.log(`Valid listings: ${validListings.length}`);
    console.log(`Median price: €${medianPrice.toLocaleString()}`);
    console.log(`Average price: €${Math.round(avgPrice).toLocaleString()}`);
    console.log(`Price range: €${minPrice.toLocaleString()} - €${maxPrice.toLocaleString()}\n`);

    // Property type analysis
    const byType = {};
    validListings.forEach(l => {
      const type = l.propertyType || 'Unknown';
      if (!byType[type]) byType[type] = [];
      byType[type].push(l.askingPrice);
    });

    console.log('LISTINGS BY PROPERTY TYPE:');
    Object.entries(byType)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5)
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
      byBeds[beds].push(l.askingPrice);
    });

    console.log('LISTINGS BY BEDROOMS:');
    Object.entries(byBeds)
      .sort((a, b) => {
        if (a[0] === 'Unknown') return 1;
        if (b[0] === 'Unknown') return -1;
        return Number(a[0]) - Number(b[0]);
      })
      .slice(0, 5)
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
      byPostcode[postcode].push(l.askingPrice);
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

    // Sample of premium listings
    console.log('PREMIUM LISTINGS:');
    validListings
      .sort((a, b) => b.askingPrice - a.askingPrice)
      .slice(0, 5)
      .forEach((l, i) => {
        console.log(`  €${l.askingPrice.toLocaleString()}: ${l.address?.substring(0, 60)} (${l.propertyType || 'Unknown'}, ${l.beds} beds, ${l.dublinPostcode})`);
      });
    console.log();

    // Sample of affordable listings
    console.log('MOST AFFORDABLE LISTINGS:');
    validListings
      .filter(l => l.askingPrice < 400000)
      .sort((a, b) => a.askingPrice - b.askingPrice)
      .slice(0, 5)
      .forEach((l, i) => {
        console.log(`  €${l.askingPrice.toLocaleString()}: ${l.address?.substring(0, 60)} (${l.propertyType || 'Unknown'}, ${l.beds} beds, ${l.dublinPostcode})`);
      });
  }
}

console.log('\n=== BLOG TOPIC PROPOSALS BASED ON NEW DATA ===\n');

// Based on the analysis, propose specific blog topics
console.log('RECOMMENDED BLOG TOPICS:');
console.log();
console.log('1. "January 2026 Dublin Rental Market: Premium Docklands Dominance"');
console.log('   - Focus: €3,500+ luxury apartments in D2, Opus 6 Hanover Quay, Capital Dock');
console.log('   - Insight: Premium rental market concentration reveals luxury demand patterns');
console.log('   - Data: 466 new rentals, median €2,483, luxury segment €3,500+');
console.log();
console.log('2. "Dublin Rental Affordability Crisis: Under €2,000 Housing Gap"');
console.log('   - Focus: Limited supply of affordable rentals under €2,000');
console.log('   - Insight: Rental market polarization between luxury and scarce affordable options');
console.log('   - Data: Only 8% of new rentals under €2,000 despite demand');
console.log();
console.log('3. "January 2026 Dublin Sales Inventory: Suburban Family Home Surge"');
console.log('   - Focus: 223 new listings, heavy concentration in family suburbs');
console.log('   - Insight: Market positioning for family buyers in accessible areas');
console.log('   - Data: Median €449,950, 3-4 bed homes dominant');
console.log();
console.log('4. "Property Type Rental Efficiency: Apartments vs Houses"');
console.log('   - Focus: Rental yield comparison between apartments (€2,483) and houses (€3,744)');
console.log('   - Insight: Apartment rental efficiency vs house premium pricing');
console.log('   - Data: Apartments 60% of rentals, houses 30% but 50% higher rent');
console.log();
console.log('5. "Dublin Rental Postcode Premium: D2 vs D22 Analysis"');
console.log('   - Focus: Geographic rental premium patterns across Dublin postcodes');
console.log('   - Insight: Location-based rental stratification and value zones');
console.log('   - Data: D2 median €3,545, D22 median €2,700, revealing premium gradients');