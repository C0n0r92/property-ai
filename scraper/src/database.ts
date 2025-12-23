/**
 * Database Writer Utility
 *
 * Handles writing scraped property data to Supabase.
 * Used by all scraper pipelines to store data in the database.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Polyfill Headers and fetch for Node.js < 18
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

if (typeof global.fetch === 'undefined') {
  global.fetch = fetch as any;
}

// Types matching our Supabase schema
interface SoldPropertyRecord {
  id: string;
  address: string;
  property_type?: string;
  beds?: number;
  baths?: number;
  area_sqm?: number;
  sold_date: string;
  sold_price: number;
  asking_price?: number;
  over_under_percent?: number;
  latitude?: number;
  longitude?: number;
  eircode?: string;
  dublin_postcode?: string;
  price_per_sqm?: number;
  source_url?: string;
  source_page?: number;
  scraped_at: string;
  nominatim_address?: string;
  yield_estimate?: any;
}

interface ListingRecord {
  id: string;
  address: string;
  property_type?: string;
  beds?: number;
  baths?: number;
  area_sqm?: number;
  asking_price: number;
  price_per_sqm?: number;
  latitude?: number;
  longitude?: number;
  eircode?: string;
  dublin_postcode?: string;
  ber_rating?: string;
  first_seen_date: string;
  last_seen_date: string;
  days_on_market?: number;
  price_changes?: number;
  price_history?: Array<{date: string, price: number}>;
  source_url?: string;
  scraped_at: string;
  nominatim_address?: string;
  yield_estimate?: any;
}

interface RentalRecord {
  id: string;
  address: string;
  property_type?: string;
  beds?: number;
  baths?: number;
  area_sqm?: number;
  monthly_rent: number;
  rent_per_sqm?: number;
  furnishing?: string;
  lease_type?: string;
  latitude?: number;
  longitude?: number;
  eircode?: string;
  dublin_postcode?: string;
  ber_rating?: string;
  first_seen_date: string;
  last_seen_date: string;
  days_on_market?: number;
  price_changes?: number;
  price_history?: Array<{date: string, rent: number}>;
  source_url?: string;
  scraped_at: string;
  nominatim_address?: string;
  yield_estimate?: any;
}

// Database configuration
class DatabaseWriter {
  private supabase: SupabaseClient;
  private batchSize = 500; // Supabase recommended batch size

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  /**
   * Upsert sold properties with conflict resolution
   */
  async upsertSoldProperties(properties: SoldPropertyRecord[]): Promise<{
    inserted: number;
    updated: number;
    failed: number;
    errors: string[];
  }> {
    if (!properties.length) {
      return { inserted: 0, updated: 0, failed: 0, errors: [] };
    }

    console.log(`📤 Upserting ${properties.length} sold properties...`);

    let inserted = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches
    for (let i = 0; i < properties.length; i += this.batchSize) {
      const batch = properties.slice(i, i + this.batchSize);
      console.log(`  Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(properties.length / this.batchSize)} (${batch.length} records)`);

      try {
        // Use upsert with conflict resolution on 'id'
        const { data, error } = await this.supabase
          .from('sold_properties')
          .upsert(batch, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .select('id');

        if (error) {
          console.error(`❌ Batch upsert failed:`, error);
          failed += batch.length;
          errors.push(`Batch ${Math.floor(i / this.batchSize) + 1}: ${error.message}`);
        } else {
          // Supabase doesn't return affected rows count, so we assume all succeeded
          // In practice, some may be inserts and some updates
          inserted += batch.length; // Conservative estimate
          console.log(`  ✅ Batch completed (${data?.length || 0} records processed)`);
        }
      } catch (err: any) {
        console.error(`💥 Batch error:`, err);
        failed += batch.length;
        errors.push(`Batch ${Math.floor(i / this.batchSize) + 1}: ${err.message}`);
      }
    }

    console.log(`📊 Sold properties upsert complete: ${inserted} processed, ${failed} failed`);
    return { inserted, updated, failed, errors };
  }

  /**
   * Upsert property listings with price history tracking
   * Set skipExistingCheck=true for initial migrations to avoid query issues
   */
  async upsertListings(listings: ListingRecord[], skipExistingCheck = false): Promise<{
    inserted: number;
    updated: number;
    failed: number;
    errors: string[];
  }> {
    if (!listings.length) {
      return { inserted: 0, updated: 0, failed: 0, errors: [] };
    }

    console.log(`📤 Upserting ${listings.length} property listings...`);

    let inserted = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches
    for (let i = 0; i < listings.length; i += this.batchSize) {
      const batch = listings.slice(i, i + this.batchSize);
      console.log(`  Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(listings.length / this.batchSize)} (${batch.length} records)`);

      try {
        let existingMap = new Map();

        if (!skipExistingCheck) {
          // For listings, we need to handle price history updates
          // First, check which listings already exist
          const ids = batch.map(l => l.id);
          const { data: existingListings, error: selectError } = await this.supabase
            .from('property_listings')
            .select('id, asking_price, price_history')
            .in('id', ids);

          if (selectError) {
            console.error(`❌ Failed to check existing listings:`, selectError);
            failed += batch.length;
            errors.push(`Select existing: ${selectError.message}`);
            continue;
          }

          existingMap = new Map(
            (existingListings || []).map(l => [l.id, l])
          );
        }

        // Prepare upsert data with updated price history
        const upsertData = batch.map(listing => {
          const existing = existingMap.get(listing.id);

          if (existing) {
            // Update existing listing
            const currentPrice = existing.asking_price;
            const newPrice = listing.asking_price;
            let priceHistory = existing.price_history || [];
            let priceChanges = listing.price_changes || 0;

            // Add to price history if price changed
            if (currentPrice !== newPrice) {
              priceHistory.push({
                date: new Date().toISOString().split('T')[0],
                price: newPrice
              });
              priceChanges += 1;
            }

            return {
              ...listing,
              price_history: priceHistory,
              price_changes: priceChanges,
              last_seen_date: new Date().toISOString().split('T')[0],
              days_on_market: existing.days_on_market || 0
            };
          } else {
            // New listing
            return {
              ...listing,
              first_seen_date: new Date().toISOString().split('T')[0],
              last_seen_date: new Date().toISOString().split('T')[0],
              price_history: [{
                date: new Date().toISOString().split('T')[0],
                price: listing.asking_price
              }],
              price_changes: 0,
              days_on_market: 0
            };
          }
        });

        // Perform upsert
        const { error: upsertError } = await this.supabase
          .from('property_listings')
          .upsert(upsertData, {
            onConflict: 'id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error(`❌ Batch upsert failed:`, upsertError);
          failed += batch.length;
          errors.push(`Batch ${Math.floor(i / this.batchSize) + 1}: ${upsertError.message}`);
        } else {
          // Count inserts vs updates
          const newListings = batch.filter(l => !existingMap.has(l.id));
          const updatedListings = batch.filter(l => existingMap.has(l.id));

          inserted += newListings.length;
          updated += updatedListings.length;
          console.log(`  ✅ Batch completed (${newListings.length} new, ${updatedListings.length} updated)`);
        }
      } catch (err: any) {
        console.error(`💥 Batch error:`, err);
        failed += batch.length;
        errors.push(`Batch ${Math.floor(i / this.batchSize) + 1}: ${err.message}`);
      }
    }

    console.log(`📊 Property listings upsert complete: ${inserted} inserted, ${updated} updated, ${failed} failed`);
    return { inserted, updated, failed, errors };
  }

  /**
   * Upsert rental listings with price history tracking
   * Set skipExistingCheck=true for initial migrations to avoid query issues
   */
  async upsertRentals(rentals: any[], skipExistingCheck = false): Promise<{
    inserted: number;
    updated: number;
    failed: number;
    errors: string[];
  }> {
    if (!rentals.length) {
      return { inserted: 0, updated: 0, failed: 0, errors: [] };
    }

    console.log(`📤 Upserting ${rentals.length} rental listings...`);

    // Transform rentals to proper format with IDs
    const transformedRentals: RentalRecord[] = rentals.map(rental => ({
      id: generateRecordId(rental, 'rentals'),
      address: rental.address,
      property_type: rental.propertyType,
      beds: rental.beds,
      baths: rental.baths,
      area_sqm: rental.areaSqm,
      monthly_rent: rental.monthlyRent,
      rent_per_sqm: rental.rentPerSqm,
      furnishing: rental.furnishing,
      lease_type: rental.leaseType,
      latitude: rental.latitude,
      longitude: rental.longitude,
      eircode: rental.eircode,
      dublin_postcode: rental.dublinPostcode,
      ber_rating: rental.berRating,
      first_seen_date: rental.firstSeenDate || new Date().toISOString().split('T')[0],
      last_seen_date: rental.lastSeenDate || new Date().toISOString().split('T')[0],
      days_on_market: rental.daysOnMarket || 0,
      price_changes: rental.priceChanges || 0,
      price_history: rental.priceHistory || [],
      source_url: rental.sourceUrl,
      scraped_at: rental.scrapedAt || new Date().toISOString(),
      nominatim_address: rental.nominatimAddress,
      yield_estimate: rental.yieldEstimate
    }));

    let inserted = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches
    for (let i = 0; i < transformedRentals.length; i += this.batchSize) {
      const batch = transformedRentals.slice(i, i + this.batchSize);
      console.log(`  Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(transformedRentals.length / this.batchSize)} (${batch.length} records)`);

      try {
        let existingMap = new Map();

        if (!skipExistingCheck) {
          // For rentals, we need to handle price history updates
          // First, check which rentals already exist
          const ids = batch.map(r => r.id);
          const { data: existingRentals, error: selectError } = await this.supabase
            .from('rental_listings')
            .select('id, monthly_rent, price_history')
            .in('id', ids);

          if (selectError) {
            console.error(`❌ Failed to check existing rentals:`, selectError);
            failed += batch.length;
            errors.push(`Select existing: ${selectError.message}`);
            continue;
          }

          existingMap = new Map(
            (existingRentals || []).map(r => [r.id, r])
          );
        }

        // Prepare upsert data with updated price history
        const upsertData = batch.map(rental => {
          const existing = existingMap.get(rental.id);

          if (existing) {
            // Update existing rental
            const currentRent = existing.monthly_rent;
            const newRent = rental.monthly_rent;
            let priceHistory = existing.price_history || [];
            let priceChanges = rental.price_changes || 0;

            // Add to price history if rent changed
            if (currentRent !== newRent) {
              priceHistory.push({
                date: new Date().toISOString().split('T')[0],
                rent: newRent
              });
              priceChanges += 1;
            }

            return {
              ...rental,
              price_history: priceHistory,
              price_changes: priceChanges,
              last_seen_date: new Date().toISOString().split('T')[0],
              days_on_market: existing.days_on_market || 0
            };
          } else {
            // New rental
            return {
              ...rental,
              first_seen_date: new Date().toISOString().split('T')[0],
              last_seen_date: new Date().toISOString().split('T')[0],
              price_history: [{
                date: new Date().toISOString().split('T')[0],
                rent: rental.monthly_rent
              }],
              price_changes: 0,
              days_on_market: 0
            };
          }
        });

        // Perform upsert
        const { error: upsertError } = await this.supabase
          .from('rental_listings')
          .upsert(upsertData, {
            onConflict: 'id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error(`❌ Batch upsert failed:`, upsertError);
          failed += batch.length;
          errors.push(`Batch ${Math.floor(i / this.batchSize) + 1}: ${upsertError.message}`);
        } else {
          // Count inserts vs updates
          const newRentals = batch.filter(r => !existingMap.has(r.id));
          const updatedRentals = batch.filter(r => existingMap.has(r.id));

          inserted += newRentals.length;
          updated += updatedRentals.length;
          console.log(`  ✅ Batch completed (${newRentals.length} new, ${updatedRentals.length} updated)`);
        }
      } catch (err: any) {
        console.error(`💥 Batch error:`, err);
        failed += batch.length;
        errors.push(`Batch ${Math.floor(i / this.batchSize) + 1}: ${err.message}`);
      }
    }

    console.log(`📊 Rental listings upsert complete: ${inserted} inserted, ${updated} updated, ${failed} failed`);
    return { inserted, updated, failed, errors };
  }

  /**
   * Log scraper run metrics
   */
  async logScraperRun(runData: {
    run_type: 'sold' | 'listings' | 'rentals' | 'consolidate';
    status: 'success' | 'failed';
    records_processed?: number;
    records_added?: number;
    records_updated?: number;
    records_failed?: number;
    error_message?: string;
    error_details?: any;
    started_at?: string;
    completed_at?: string;
  }): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('scraper_runs')
        .insert({
          run_type: runData.run_type,
          status: runData.status,
          records_processed: runData.records_processed || 0,
          records_added: runData.records_added || 0,
          records_updated: runData.records_updated || 0,
          records_failed: runData.records_failed || 0,
          error_message: runData.error_message,
          error_details: runData.error_details,
          started_at: runData.started_at,
          completed_at: runData.completed_at || new Date().toISOString()
        });

      if (error) {
        console.error('Failed to log scraper run:', error);
      }
    } catch (err) {
      console.error('Error logging scraper run:', err);
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('sold_properties')
        .select('count', { count: 'exact', head: true });

      return !error;
    } catch {
      return false;
    }
  }
}

// Generate ID for records that don't have one
function generateRecordId(record: any, type: string): string {
  if (record.id) return record.id;

  // Generate ID based on address and other unique fields
  const baseString = record.address || 'unknown';
  const uniqueFields = [];

  if (type === 'properties' || type === 'listings') {
    uniqueFields.push(record.soldPrice || record.askingPrice || 'unknown');
  } else if (type === 'rentals') {
    uniqueFields.push(record.monthlyRent || record.monthly_rent || 'unknown');
  }

  uniqueFields.push(record.scrapedAt || record.scraped_at || new Date().toISOString());

  const idString = `${baseString}-${uniqueFields.join('-')}`;
  return idString.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 255);
}

// Export singleton instance
export const db = new DatabaseWriter();
export default db;

// Export types for use in scrapers
export type { SoldPropertyRecord, ListingRecord, RentalRecord };
