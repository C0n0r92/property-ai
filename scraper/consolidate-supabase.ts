#!/usr/bin/env tsx

/**
 * Consolidate Supabase data into the consolidated_properties table
 *
 * This script runs the consolidate_property_data() function in Supabase
 * to combine sold properties, listings, and rentals with yield calculations.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

// Polyfill Headers for Node.js < 18
if (typeof Headers === 'undefined') {
  global.Headers = fetch.Headers || class Headers {
    constructor(init?: Record<string, string>) {
      this._headers = new Map();
      if (init) {
        Object.entries(init).forEach(([key, value]) => {
          this._headers.set(key.toLowerCase(), value);
        });
      }
    }
    private _headers: Map<string, string>;
    append(name: string, value: string) {
      this._headers.set(name.toLowerCase(), value);
    }
    delete(name: string) {
      this._headers.delete(name.toLowerCase());
    }
    get(name: string) {
      return this._headers.get(name.toLowerCase()) || null;
    }
    has(name: string) {
      return this._headers.has(name.toLowerCase());
    }
    set(name: string, value: string) {
      this._headers.set(name.toLowerCase(), value);
    }
    forEach(callback: (value: string, key: string) => void) {
      this._headers.forEach((value, key) => callback(value, key));
    }
  };
}

// Polyfill fetch for Node.js < 18
if (typeof global.fetch === 'undefined') {
  global.fetch = fetch as any;
}

// Load environment variables
dotenv.config();

async function consolidateSupabaseData() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           SUPABASE DATA CONSOLIDATION                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('📊 Running data consolidation...');

    // Call the consolidation function
    const { data, error } = await supabase.rpc('consolidate_property_data');

    if (error) {
      console.error('❌ Consolidation failed:', error);
      process.exit(1);
    }

    console.log('✅ Data consolidation completed successfully');

    // Get consolidation stats
    console.log('\n📈 Getting consolidation statistics...');

    const { data: stats, error: statsError } = await supabase
      .from('consolidated_properties')
      .select('is_listing, is_rental, yield_estimate')
      .limit(10000); // Sample for stats

    if (!statsError && stats) {
      const total = stats.length;
      const soldProperties = stats.filter(p => !p.is_listing && !p.is_rental).length;
      const listings = stats.filter(p => p.is_listing).length;
      const rentals = stats.filter(p => p.is_rental).length;
      const withYield = stats.filter(p => p.yield_estimate !== null).length;

      console.log(`📊 Consolidation Results:`);
      console.log(`  Total consolidated properties: ${total}`);
      console.log(`  Sold properties: ${soldProperties}`);
      console.log(`  Property listings: ${listings}`);
      console.log(`  Rental listings: ${rentals}`);
      console.log(`  Properties with yield estimates: ${withYield} (${((withYield/total)*100).toFixed(1)}%)`);

      const avgYield = stats
        .filter(p => p.yield_estimate !== null)
        .reduce((sum, p) => sum + (p.yield_estimate || 0), 0) / withYield;

      if (withYield > 0) {
        console.log(`  Average yield: ${avgYield.toFixed(2)}%`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`\n⏱️  Total time: ${duration}ms`);

    console.log('\n✅ Consolidation complete! Dashboard will now show consolidated data.');

  } catch (error) {
    console.error('❌ Unexpected error during consolidation:', error);
    process.exit(1);
  }
}

// Run the consolidation
consolidateSupabaseData().catch(console.error);
