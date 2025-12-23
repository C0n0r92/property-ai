#!/usr/bin/env node
/**
 * Initial Data Migration Script
 *
 * Imports existing JSON data into Supabase database.
 * Run this once to populate the new database with existing scraped data.
 */

// Load environment variables FIRST
import * as dotenv from 'dotenv';
dotenv.config();

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { db } from './src/database.js';

// Load environment variables
dotenv.config();

// Configuration
const DATA_DIR = './data';

// Load and validate environment
function validateEnvironment() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('❌ Missing environment variables:');
    console.error('   SUPABASE_URL=your_supabase_url');
    console.error('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
    console.error('');
    console.error('Get these from: https://supabase.com/dashboard/project/your-project/settings/api');
    process.exit(1);
  }

  console.log('✅ Environment validated');
}

// Load data from JSON files
function loadExistingData() {
  const data = {
    properties: [],
    listings: [],
    rentals: []
  };

  // Load from most recent files only (avoid duplicates)
  // Load sold properties from the most recent source
  const soldInitialFile = join(DATA_DIR, 'sold', 'sold-initial.json');
  if (existsSync(soldInitialFile)) {
    try {
      console.log(`📂 Loading sold properties from ${soldInitialFile}...`);
      const content = readFileSync(soldInitialFile, 'utf-8');
      const properties = JSON.parse(content);
      data.properties = properties;
      console.log(`   ✅ Found ${properties.length} properties`);
    } catch (error) {
      console.warn(`⚠️  Failed to load sold properties:`, error.message);
    }
  } else {
    // Fallback to properties.json
    const propertiesFile = join(DATA_DIR, 'properties.json');
    if (existsSync(propertiesFile)) {
      try {
        console.log(`📂 Loading sold properties from ${propertiesFile}...`);
        const content = readFileSync(propertiesFile, 'utf-8');
        const properties = JSON.parse(content);
        data.properties = properties;
        console.log(`   ✅ Found ${properties.length} properties`);
      } catch (error) {
        console.warn(`⚠️  Failed to load properties:`, error.message);
      }
    }
  }

  // Load listings from most recent source
  const listingsLatestFile = join(DATA_DIR, 'listings', 'listings-latest.json');
  if (existsSync(listingsLatestFile)) {
    try {
      console.log(`📂 Loading listings from ${listingsLatestFile}...`);
      const content = readFileSync(listingsLatestFile, 'utf-8');
      const listings = JSON.parse(content);
      data.listings = listings;
      console.log(`   ✅ Found ${listings.length} listings`);
    } catch (error) {
      console.warn(`⚠️  Failed to load listings:`, error.message);
    }
  }

  // Load rentals from most recent source
  const rentalsLatestFile = join(DATA_DIR, 'rentals', 'rentals-latest.json');
  if (existsSync(rentalsLatestFile)) {
    try {
      console.log(`📂 Loading rentals from ${rentalsLatestFile}...`);
      const content = readFileSync(rentalsLatestFile, 'utf-8');
      const rentals = JSON.parse(content);
      data.rentals = rentals;
      console.log(`   ✅ Found ${rentals.length} rentals`);
    } catch (error) {
      console.warn(`⚠️  Failed to load rentals:`, error.message);
    }
  }

  console.log('');
  console.log('📊 Data Summary:');
  console.log(`   Properties: ${data.properties.length}`);
  console.log(`   Listings: ${data.listings.length}`);
  console.log(`   Rentals: ${data.rentals.length}`);
  console.log(`   Total: ${data.properties.length + data.listings.length + data.rentals.length}`);
  console.log('');

  return data;
}

function deduplicateByIdKeepLatest(items, dateField = 'scrapedAt') {
  const grouped = new Map();

  // Group by ID
  for (const item of items) {
    if (!item.id) continue; // Skip items without ID

    const existing = grouped.get(item.id);
    if (!existing) {
      grouped.set(item.id, item);
    } else {
      // Keep the more recent one based on date field
      const existingDate = new Date(existing[dateField] || '1970-01-01');
      const currentDate = new Date(item[dateField] || '1970-01-01');

      if (currentDate > existingDate) {
        grouped.set(item.id, item);
      }
    }
  }

  return Array.from(grouped.values());
}

// Generate ID for records that don't have one
function generateRecordId(record, type) {
  if (record.id) return record.id;

  // Generate ID based on address and other unique fields
  const baseString = record.address || 'unknown';
  const uniqueFields = [];

  if (type === 'properties' || type === 'listings') {
    uniqueFields.push(record.soldPrice || record.askingPrice || 'unknown');
  } else if (type === 'rentals') {
    uniqueFields.push(record.monthlyRent || 'unknown');
  }

  uniqueFields.push(record.scrapedAt || new Date().toISOString());

  const idString = `${baseString}-${uniqueFields.join('-')}`;
  return idString.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 255);
}

// Transform data for Supabase
function transformForSupabase(data) {
  console.log('🔄 Transforming data for Supabase...');

  const transformed = {
    properties: data.properties.map(p => ({
      id: generateRecordId(p, 'properties'),
      address: p.address,
      property_type: p.propertyType,
      beds: p.beds,
      baths: p.baths,
      area_sqm: p.areaSqm,
      sold_date: p.soldDate,
      sold_price: p.soldPrice,
      asking_price: p.askingPrice,
      over_under_percent: p.overUnderPercent,
      latitude: p.latitude,
      longitude: p.longitude,
      eircode: p.eircode,
      dublin_postcode: p.dublinPostcode,
      price_per_sqm: p.pricePerSqm,
      source_url: p.sourceUrl,
      source_page: p.sourcePage,
      scraped_at: p.scrapedAt || new Date().toISOString(),
      nominatim_address: p.nominatimAddress,
      yield_estimate: p.yieldEstimate
    })),
    listings: data.listings.map(l => ({
      id: generateRecordId(l, 'listings'),
      address: l.address,
      property_type: l.propertyType,
      beds: l.beds,
      baths: l.baths,
      area_sqm: l.areaSqm,
      asking_price: l.askingPrice,
      price_per_sqm: l.pricePerSqm,
      latitude: l.latitude,
      longitude: l.longitude,
      eircode: l.eircode,
      dublin_postcode: l.dublinPostcode,
      ber_rating: l.berRating,
      first_seen_date: l.firstSeenDate || new Date().toISOString().split('T')[0],
      last_seen_date: l.lastSeenDate || new Date().toISOString().split('T')[0],
      days_on_market: l.daysOnMarket || 0,
      price_changes: l.priceChanges || 0,
      price_history: l.priceHistory || [],
      source_url: l.sourceUrl,
      scraped_at: l.scrapedAt || new Date().toISOString(),
      nominatim_address: l.nominatimAddress,
      yield_estimate: l.yieldEstimate
    })),
    rentals: data.rentals.map(r => ({
      id: generateRecordId(r, 'rentals'),
      address: r.address,
      property_type: r.propertyType,
      beds: r.beds,
      baths: r.baths,
      area_sqm: r.areaSqm,
      monthly_rent: r.monthlyRent,
      rent_per_sqm: r.rentPerSqm,
      furnishing: r.furnishing,
      lease_type: r.leaseType,
      latitude: r.latitude,
      longitude: r.longitude,
      eircode: r.eircode,
      dublin_postcode: r.dublinPostcode,
      ber_rating: r.berRating,
      first_seen_date: r.firstSeenDate || new Date().toISOString().split('T')[0],
      last_seen_date: r.lastSeenDate || new Date().toISOString().split('T')[0],
      days_on_market: r.daysOnMarket || 0,
      price_changes: r.priceChanges || 0,
      price_history: r.priceHistory || [],
      source_url: r.sourceUrl,
      scraped_at: r.scrapedAt || new Date().toISOString(),
      nominatim_address: r.nominatimAddress,
      yield_estimate: r.yieldEstimate
    }))
  };

  console.log('✅ Data transformation complete');
  return transformed;
}

// Main migration function
async function runMigration() {
  console.log('🚀 Initial Data Migration to Supabase');
  console.log('=====================================');
  console.log('');

  // Validate environment
  validateEnvironment();

  // Test database connection
  console.log('🔗 Testing database connection...');
  const connected = await db.testConnection();
  if (!connected) {
    console.error('❌ Cannot connect to Supabase. Check your credentials.');
    process.exit(1);
  }
  console.log('✅ Database connection successful');
  console.log('');

  // Load existing data
  const data = loadExistingData();

  // Transform for Supabase
  const transformedData = transformForSupabase(data);

  // Import data
  console.log('📤 Importing data to Supabase...');
  console.log('');

  let totalImported = 0;
  let totalFailed = 0;

  // Import properties
  if (transformedData.properties.length > 0) {
    console.log(`🏠 Importing ${transformedData.properties.length} sold properties...`);
    const result = await db.upsertSoldProperties(transformedData.properties);
    totalImported += result.inserted + result.updated;
    totalFailed += result.failed;
    console.log(`   ✅ ${result.inserted} new, ${result.updated} updated, ${result.failed} failed`);
  }

  // Import listings (skip existing check for initial migration)
  if (transformedData.listings.length > 0) {
    console.log(`🏢 Importing ${transformedData.listings.length} property listings...`);
    const result = await db.upsertListings(transformedData.listings, true); // skipExistingCheck = true
    totalImported += result.inserted + result.updated;
    totalFailed += result.failed;
    console.log(`   ✅ ${result.inserted} new, ${result.updated} updated, ${result.failed} failed`);
  }

  // Import rentals (skip existing check for initial migration)
  if (transformedData.rentals.length > 0) {
    console.log(`🏘️  Importing ${transformedData.rentals.length} rental listings...`);
    const result = await db.upsertRentals(transformedData.rentals, true); // skipExistingCheck = true
    totalImported += result.inserted + result.updated;
    totalFailed += result.failed;
    console.log(`   ✅ ${result.inserted} new, ${result.updated} updated, ${result.failed} failed`);
  }

  console.log('');
  console.log('🎉 Migration Complete!');
  console.log('====================');
  console.log(`📊 Total records imported: ${totalImported}`);

  if (totalFailed > 0) {
    console.log(`⚠️  Failed records: ${totalFailed} (check logs above)`);
  }

  console.log('');
  console.log('✅ Your dashboard will now query Supabase instead of JSON files!');
  console.log('✅ Future scrapes will automatically write to both JSON and Supabase.');
}

// Run the migration
runMigration().catch(error => {
  console.error('💥 Migration failed:', error);
  process.exit(1);
});
