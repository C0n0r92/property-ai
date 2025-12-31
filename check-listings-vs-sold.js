const fs = require('fs');

// Load the data
const data = JSON.parse(fs.readFileSync('./dashboard/public/data.json', 'utf8'));

console.log('=== Checking Listings vs Sold Properties ===\n');

// Extract addresses
const soldAddresses = new Set();
data.properties.forEach(prop => {
  if (prop.address) {
    // Normalize address for comparison (remove extra spaces, convert to lowercase)
    const normalized = prop.address.toLowerCase().replace(/\s+/g, ' ').trim();
    soldAddresses.add(normalized);
  }
});

console.log(`Found ${soldAddresses.size} unique sold property addresses\n`);

// Check listings against sold addresses
const matches = [];
let checked = 0;

data.listings.forEach(listing => {
  checked++;
  if (listing.address) {
    const normalized = listing.address.toLowerCase().replace(/\s+/g, ' ').trim();

    // Check for exact match
    if (soldAddresses.has(normalized)) {
      matches.push({
        address: listing.address,
        askingPrice: listing.askingPrice,
        propertyType: listing.propertyType,
        sourceUrl: listing.sourceUrl
      });
    }
  }

  // Progress indicator
  if (checked % 500 === 0) {
    console.log(`Checked ${checked}/${data.listings.length} listings...`);
  }
});

// Check for recently sold properties (last 30 days)
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const recentSales = data.properties.filter(prop => {
  if (!prop.soldDate) return false;
  const soldDate = new Date(prop.soldDate);
  return soldDate >= thirtyDaysAgo;
});

console.log(`\nRecent sales (last 30 days): ${recentSales.length}`);

console.log(`\n=== RESULTS ===`);
console.log(`Total listings checked: ${data.listings.length}`);
console.log(`Total sold properties: ${data.properties.length}`);
console.log(`Matches found: ${matches.length}\n`);

if (matches.length > 0) {
  console.log('🚨 PROPERTIES FOUND IN BOTH LISTINGS AND SOLD DATA:');
  console.log('================================================');
  matches.forEach((match, index) => {
    console.log(`${index + 1}. ${match.address}`);
    console.log(`   Asking Price: €${match.askingPrice.toLocaleString()}`);
    console.log(`   Type: ${match.propertyType}`);
    console.log(`   URL: ${match.sourceUrl}`);
    console.log('');
  });
} else {
  console.log('✅ No properties found in both listings and sold data');
  console.log('All current listings appear to be genuinely active.');
  console.log(`\nData appears clean - no stale listings detected.`);
}
