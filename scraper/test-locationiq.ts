#!/usr/bin/env node
/**
 * Test LocationIQ geocoding integration
 * 
 * Usage:
 *   LOCATIONIQ_API_KEY=your_key npm run test:geocoding
 */

import { geocodeAddress } from './src/geocode.js';

// Test addresses from your actual data
const TEST_ADDRESSES = [
  '2 Belmont Grove, Galloping Green, Stillorgan, Dublin',
  '25 Glenealy Downs, Clonsilla Dublin 15, Dublin, Dublin 15, Dublin',
  '15 Obelisk Avenue, Stillorgan Park, Blackrock, Dublin',
  '112 Carysfort Park, Blackrock, Dublin',
  'Oakwood Grove, Clondalkin, Dublin 22',
  // Alternative variations for the failing address
  'Oakwood Grove, Dublin 22',
  'Oakwood Grove, Clondalkin',
];

async function testGeocoding() {
  const apiKey = process.env.LOCATIONIQ_API_KEY;
  
  console.log('🧪 Testing Geocoding Integration\n');
  console.log('Configuration:');
  console.log(`  Provider: ${apiKey ? 'LocationIQ Cloud API' : 'Local Nominatim'}`);
  console.log(`  API Key: ${apiKey ? `${apiKey.slice(0, 8)}...` : 'N/A'}`);
  console.log('');

  let successCount = 0;
  let failCount = 0;

  for (const address of TEST_ADDRESSES) {
    console.log(`📍 Testing: ${address}`);
    
    try {
      const result = await geocodeAddress(address);
      
      if (result) {
        successCount++;
        console.log(`  ✅ Success!`);
        console.log(`     Lat/Lng: ${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`);
        console.log(`     Eircode: ${result.eircode || 'N/A'}`);
        console.log(`     Full: ${result.nominatimAddress.slice(0, 80)}...`);
      } else {
        failCount++;
        console.log(`  ❌ Failed: No results found`);
      }
    } catch (error: any) {
      failCount++;
      console.log(`  ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }

  console.log('═'.repeat(60));
  console.log(`Results: ${successCount}/${TEST_ADDRESSES.length} successful`);
  console.log(`Success rate: ${((successCount / TEST_ADDRESSES.length) * 100).toFixed(1)}%`);
  
  if (successCount === TEST_ADDRESSES.length) {
    console.log('\n✅ All tests passed! Geocoding is working correctly.\n');
    process.exit(0);
  } else if (successCount > 0) {
    console.log('\n⚠️  Some tests failed. Check the errors above.\n');
    process.exit(1);
  } else {
    console.log('\n❌ All tests failed. Check your configuration.\n');
    process.exit(1);
  }
}

testGeocoding().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});

