/**
 * Generic Supabase Uploader
 *
 * Uploads scraped property data from JSON files to Supabase.
 * Can be run independently of the scrapers for better reliability.
 *
 * Usage:
 * - npm run upload:sold        # Upload sold properties
 * - npm run upload:listings    # Upload property listings
 * - npm run upload:rentals     # Upload rental listings
 * - npm run upload:all         # Upload all data types
 */

import { db } from './database.js';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_DIR = './data';

// ============== Utility Functions ==============

function loadLatestFile(dataType: string): any[] {
  const typeDir = join(DATA_DIR, dataType);

  if (!existsSync(typeDir)) {
    console.log(`⚠️  Directory ${typeDir} does not exist`);
    return [];
  }

  const files = readdirSync(typeDir)
    .filter(f => f.endsWith('.json') && !f.includes('latest'))
    .sort()
    .reverse(); // Most recent first

  if (files.length === 0) {
    console.log(`⚠️  No ${dataType} files found`);
    return [];
  }

  const latestFile = files[0];
  const filePath = join(typeDir, latestFile);

  console.log(`📂 Loading ${dataType} from: ${filePath}`);

  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    console.log(`✅ Loaded ${data.length} ${dataType} records`);
    return data;
  } catch (error) {
    console.error(`❌ Failed to load ${filePath}:`, error);
    return [];
  }
}

// ============== Upload Functions ==============

async function uploadSoldProperties(): Promise<void> {
  console.log('\n🏠 UPLOADING SOLD PROPERTIES\n');

  const properties = loadLatestFile('sold');
  if (properties.length === 0) return;

  try {
    const result = await db.upsertSoldProperties(properties);
    console.log(`✅ Sold properties upload complete: ${result.inserted} inserted, ${result.updated} updated, ${result.failed} failed`);
  } catch (error) {
    console.error('❌ Sold properties upload failed:', error);
  }
}

async function uploadListings(): Promise<void> {
  console.log('\n🏢 UPLOADING PROPERTY LISTINGS\n');

  const rawListings = loadLatestFile('listings');
  if (rawListings.length === 0) return;

  // Transform raw listings to database format
  const listings = rawListings.map(listing => ({
    id: listing.id,
    address: listing.address,
    property_type: listing.propertyType,
    beds: listing.beds,
    baths: listing.baths,
    area_sqm: listing.areaSqm,
    asking_price: listing.askingPrice,
    price_per_sqm: listing.pricePerSqm,
    latitude: listing.latitude,
    longitude: listing.longitude,
    eircode: listing.eircode,
    dublin_postcode: listing.dublinPostcode,
    ber_rating: listing.berRating,
    first_seen_date: listing.scrapedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
    last_seen_date: listing.scrapedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
    days_on_market: 0,
    price_changes: 0,
    price_history: [{
      date: listing.scrapedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
      price: listing.askingPrice
    }],
    source_url: listing.sourceUrl,
    scraped_at: listing.scrapedAt || new Date().toISOString(),
  }));

  try {
    const result = await db.upsertListings(listings);
    console.log(`✅ Listings upload complete: ${result.inserted} inserted, ${result.updated} updated, ${result.failed} failed`);
  } catch (error) {
    console.error('❌ Listings upload failed:', error);
  }
}

async function uploadRentals(): Promise<void> {
  console.log('\n🏠 UPLOADING RENTAL LISTINGS\n');

  const rentals = loadLatestFile('rentals');
  if (rentals.length === 0) return;

  try {
    const result = await db.upsertRentals(rentals);
    console.log(`✅ Rentals upload complete: ${result.inserted} inserted, ${result.updated} updated, ${result.failed} failed`);
  } catch (error) {
    console.error('❌ Rentals upload failed:', error);
  }
}

async function uploadAll(): Promise<void> {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║         SUPABASE DATA UPLOAD                ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  await uploadSoldProperties();
  await uploadListings();
  await uploadRentals();

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║         UPLOAD COMPLETE                      ║');
  console.log('╚══════════════════════════════════════════════╝');
}

// ============== CLI Interface ==============

const command = process.argv[2];

async function main() {
  switch (command) {
    case 'sold':
      await uploadSoldProperties();
      break;
    case 'listings':
      await uploadListings();
      break;
    case 'rentals':
      await uploadRentals();
      break;
    case 'all':
      await uploadAll();
      break;
    default:
      console.log('Usage: tsx src/upload-to-supabase.ts <command>');
      console.log('Commands:');
      console.log('  sold      - Upload sold properties');
      console.log('  listings  - Upload property listings');
      console.log('  rentals   - Upload rental listings');
      console.log('  all       - Upload all data types');
      process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
