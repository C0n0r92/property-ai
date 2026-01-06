#!/usr/bin/env node

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Load env and polyfills
dotenv.config();

if (typeof Headers === 'undefined') {
  global.Headers = fetch.Headers || class Headers {
    constructor(init) { this._headers = new Map(); if (init) Object.entries(init).forEach(([k, v]) => this._headers.set(k.toLowerCase(), v)); }
    get(k) { return this._headers.get(k.toLowerCase()) || null; }
    set(k, v) { this._headers.set(k.toLowerCase(), v); }
  };
}

if (typeof global.fetch === 'undefined') {
  global.fetch = fetch;
}

async function checkCounts() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  console.log('Checking database record counts...\n');

  try {
    const [sold, listings, rentals, consolidated] = await Promise.all([
      supabase.from('sold_properties').select('id', { count: 'exact', head: true }),
      supabase.from('property_listings').select('id', { count: 'exact', head: true }),
      supabase.from('rental_listings').select('id', { count: 'exact', head: true }),
      supabase.from('consolidated_properties').select('id', { count: 'exact', head: true })
    ]);

    console.log('📊 Database Record Counts:');
    console.log(`  Sold properties: ${sold.count?.toLocaleString() || 0}`);
    console.log(`  Property listings: ${listings.count?.toLocaleString() || 0}`);
    console.log(`  Rental listings: ${rentals.count?.toLocaleString() || 0}`);
    console.log(`  Consolidated properties: ${consolidated.count?.toLocaleString() || 0}`);

    const total = (sold.count || 0) + (listings.count || 0) + (rentals.count || 0);
    console.log(`  Total expected in consolidated: ${total.toLocaleString()}`);

    if (consolidated.count && consolidated.count < 1000) {
      console.log('\n⚠️  WARNING: Consolidated count is very low. There may be an issue with the consolidation function.');
    }

  } catch (error) {
    console.error('Error checking counts:', error);
  }
}

checkCounts();






