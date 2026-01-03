#!/usr/bin/env tsx

/**
 * Update geocoding data for existing property listings
 * Adds latitude, longitude, eircode, and nominatimAddress to entries where they're missing
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { geocodeAddress } from './geocode.ts';

interface PropertyListing {
  id: string;
  address: string;
  askingPrice: number;
  beds: number;
  baths: number;
  areaSqm: number;
  propertyType: string;
  berRating: string | null;
  sourceUrl: string;
  sourcePage: number;
  latitude: number | null;
  longitude: number | null;
  eircode: string | null;
  nominatimAddress: string | null;
  pricePerSqm: number;
  scrapedAt: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LISTINGS_FILE = path.join(__dirname, '../data/listings/listings-2026-01-03.json');

async function updateGeocoding() {
  console.log('🔄 Loading listings data...');

  // Read the existing listings file
  const listingsData = fs.readFileSync(LISTINGS_FILE, 'utf-8');
  const listings: PropertyListing[] = JSON.parse(listingsData);

  console.log(`📊 Found ${listings.length} listings to process`);

  let updatedCount = 0;
  let geocodingErrors = 0;

  // Process each listing
  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];

    // Skip if already geocoded
    if (listing.latitude !== null && listing.longitude !== null) {
      continue;
    }

    console.log(`🔍 Geocoding ${i + 1}/${listings.length}: ${listing.address.substring(0, 50)}...`);

    try {
      const geocodeResult = await geocodeAddress(listing.address);

      if (geocodeResult) {
        listing.latitude = geocodeResult.latitude;
        listing.longitude = geocodeResult.longitude;
        listing.eircode = geocodeResult.eircode;
        listing.nominatimAddress = geocodeResult.nominatimAddress;
        updatedCount++;
        console.log(`  ✅ Geocoded: ${geocodeResult.latitude.toFixed(4)}, ${geocodeResult.longitude.toFixed(4)}`);
      } else {
        console.log(`  ⚠️  No geocoding result found`);
        geocodingErrors++;
      }
    } catch (error) {
      console.log(`  ❌ Geocoding error: ${error}`);
      geocodingErrors++;
    }

    // Rate limiting - be nice to the geocoding service
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Save the updated data
  console.log('💾 Saving updated listings...');
  fs.writeFileSync(LISTINGS_FILE, JSON.stringify(listings, null, 2));

  console.log('🎉 Geocoding update complete!');
  console.log(`✅ Updated ${updatedCount} listings`);
  console.log(`⚠️  ${geocodingErrors} geocoding errors`);
  console.log(`📁 File saved: ${LISTINGS_FILE}`);
}

updateGeocoding().catch(console.error);
