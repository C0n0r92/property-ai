/**
 * Listing History Tracker
 *
 * Tracks price and status changes for property listings over time.
 * Records every change to the listing_history table for analytics.
 *
 * Usage:
 * - Called by pipeline-open.ts and pipeline-myhome.ts during scraping
 * - Compares current listing state with database
 * - Inserts history records for any changes detected
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

// Types
export interface ListingState {
  id: string;
  address: string;
  askingPrice: number;
  status: 'for_sale' | 'sale_agreed' | 'sold' | 'withdrawn';
  source: 'daft' | 'myhome';
  latitude?: number;
  longitude?: number;
  propertyType?: string;
  beds?: number;
  baths?: number;
  firstSeenAt?: Date;
  lastSeenAt?: Date;
}

export interface HistoryRecord {
  listing_id: string;
  source: string;
  scraped_at: string;
  asking_price: number;
  status: string;
  change_type: string;
  previous_price?: number;
  price_change_amount?: number;
  price_change_percent?: number;
  days_on_market?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  property_type?: string;
  beds?: number;
  baths?: number;
}

export type ChangeType =
  | 'new'
  | 'price_reduction'
  | 'price_increase'
  | 'sale_agreed'
  | 'sold'
  | 'relisted'
  | 'withdrawn'
  | 'status_change';

interface ExistingListing {
  id: string;
  asking_price: number;
  status: string;
  first_seen_at: string;
  last_seen_at: string;
  source: string;
}

class HistoryTracker {
  private supabase: SupabaseClient;
  private batchSize = 100;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Process a batch of listings and track changes
   */
  async trackListings(
    currentListings: ListingState[],
    source: 'daft' | 'myhome' = 'daft'
  ): Promise<{
    newListings: number;
    priceChanges: number;
    statusChanges: number;
    historyRecords: number;
    errors: string[];
  }> {
    const stats = {
      newListings: 0,
      priceChanges: 0,
      statusChanges: 0,
      historyRecords: 0,
      errors: [] as string[],
    };

    if (!currentListings.length) {
      return stats;
    }

    console.log(`📊 Tracking ${currentListings.length} listings from ${source}...`);

    // Get existing listings from database
    const listingIds = currentListings.map((l) => l.id);
    const existingMap = await this.fetchExistingListings(listingIds, source);

    // Process each listing and collect history records
    const historyRecords: HistoryRecord[] = [];
    const listingUpdates: any[] = [];
    const now = new Date().toISOString();

    for (const listing of currentListings) {
      const existing = existingMap.get(listing.id);

      if (!existing) {
        // New listing
        stats.newListings++;
        historyRecords.push(this.createHistoryRecord(listing, 'new', null, now));
        listingUpdates.push({
          id: listing.id,
          first_seen_at: now,
          last_seen_at: now,
          status: listing.status,
          source: source,
        });
      } else {
        // Existing listing - check for changes
        const changes = this.detectChanges(listing, existing);

        if (changes.length > 0) {
          for (const change of changes) {
            if (change === 'price_reduction' || change === 'price_increase') {
              stats.priceChanges++;
            } else {
              stats.statusChanges++;
            }
            historyRecords.push(
              this.createHistoryRecord(listing, change, existing, now)
            );
          }
        }

        // Always update last_seen_at
        const daysOnMarket = this.calculateDaysOnMarket(
          existing.first_seen_at,
          now
        );
        listingUpdates.push({
          id: listing.id,
          last_seen_at: now,
          asking_price: listing.askingPrice,
          status: listing.status,
          days_on_market: daysOnMarket,
        });
      }
    }

    // Batch insert history records
    if (historyRecords.length > 0) {
      const insertResult = await this.insertHistoryBatch(historyRecords);
      stats.historyRecords = insertResult.inserted;
      stats.errors.push(...insertResult.errors);
    }

    // Batch update listings
    if (listingUpdates.length > 0) {
      await this.updateListingsBatch(listingUpdates, source);
    }

    // Detect withdrawn listings (in DB but not in current scrape)
    const withdrawnResult = await this.detectWithdrawnListings(
      listingIds,
      source,
      now
    );
    stats.statusChanges += withdrawnResult.count;
    stats.historyRecords += withdrawnResult.historyCount;

    console.log(
      `✅ History tracking complete: ${stats.newListings} new, ` +
        `${stats.priceChanges} price changes, ${stats.statusChanges} status changes`
    );

    return stats;
  }

  /**
   * Fetch existing listings from database
   */
  private async fetchExistingListings(
    ids: string[],
    source: string
  ): Promise<Map<string, ExistingListing>> {
    const map = new Map<string, ExistingListing>();

    // Process in batches to avoid query size limits
    for (let i = 0; i < ids.length; i += this.batchSize) {
      const batch = ids.slice(i, i + this.batchSize);

      const { data, error } = await this.supabase
        .from('property_listings')
        .select('id, asking_price, status, first_seen_at, last_seen_at, source')
        .in('id', batch)
        .eq('source', source);

      if (error) {
        console.error(`❌ Error fetching existing listings:`, error);
        continue;
      }

      for (const listing of data || []) {
        map.set(listing.id, listing);
      }
    }

    return map;
  }

  /**
   * Detect what changed between current and existing listing
   */
  private detectChanges(
    current: ListingState,
    existing: ExistingListing
  ): ChangeType[] {
    const changes: ChangeType[] = [];

    // Price change
    if (current.askingPrice !== existing.asking_price) {
      if (current.askingPrice < existing.asking_price) {
        changes.push('price_reduction');
      } else {
        changes.push('price_increase');
      }
    }

    // Status change
    if (current.status !== existing.status) {
      if (current.status === 'sale_agreed') {
        changes.push('sale_agreed');
      } else if (current.status === 'sold') {
        changes.push('sold');
      } else if (
        existing.status === 'sale_agreed' &&
        current.status === 'for_sale'
      ) {
        changes.push('relisted');
      } else {
        changes.push('status_change');
      }
    }

    return changes;
  }

  /**
   * Create a history record for a change
   */
  private createHistoryRecord(
    listing: ListingState,
    changeType: ChangeType,
    existing: ExistingListing | null,
    scrapedAt: string
  ): HistoryRecord {
    const record: HistoryRecord = {
      listing_id: listing.id,
      source: listing.source,
      scraped_at: scrapedAt,
      asking_price: listing.askingPrice,
      status: listing.status,
      change_type: changeType,
      address: listing.address,
      latitude: listing.latitude,
      longitude: listing.longitude,
      property_type: listing.propertyType,
      beds: listing.beds,
      baths: listing.baths,
    };

    // Add price change details if applicable
    if (
      existing &&
      (changeType === 'price_reduction' || changeType === 'price_increase')
    ) {
      record.previous_price = existing.asking_price;
      record.price_change_amount = listing.askingPrice - existing.asking_price;
      record.price_change_percent = Number(
        (
          ((listing.askingPrice - existing.asking_price) /
            existing.asking_price) *
          100
        ).toFixed(2)
      );
    }

    // Add days on market
    if (existing?.first_seen_at) {
      record.days_on_market = this.calculateDaysOnMarket(
        existing.first_seen_at,
        scrapedAt
      );
    }

    return record;
  }

  /**
   * Calculate days on market
   */
  private calculateDaysOnMarket(firstSeen: string, now: string): number {
    const first = new Date(firstSeen);
    const current = new Date(now);
    const diffTime = Math.abs(current.getTime() - first.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Batch insert history records
   */
  private async insertHistoryBatch(
    records: HistoryRecord[]
  ): Promise<{ inserted: number; errors: string[] }> {
    let inserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i += this.batchSize) {
      const batch = records.slice(i, i + this.batchSize);

      const { error } = await this.supabase
        .from('listing_history')
        .insert(batch);

      if (error) {
        console.error(`❌ Error inserting history batch:`, error);
        errors.push(error.message);
      } else {
        inserted += batch.length;
      }
    }

    return { inserted, errors };
  }

  /**
   * Batch update listings with new state
   */
  private async updateListingsBatch(
    updates: any[],
    source: string
  ): Promise<void> {
    for (let i = 0; i < updates.length; i += this.batchSize) {
      const batch = updates.slice(i, i + this.batchSize);

      for (const update of batch) {
        const { error } = await this.supabase
          .from('property_listings')
          .upsert(
            {
              ...update,
              source,
            },
            { onConflict: 'id' }
          );

        if (error) {
          console.error(`❌ Error updating listing ${update.id}:`, error);
        }
      }
    }
  }

  /**
   * Detect listings that were withdrawn (not in current scrape)
   */
  private async detectWithdrawnListings(
    currentIds: string[],
    source: string,
    now: string
  ): Promise<{ count: number; historyCount: number }> {
    // Find listings that were active recently but not in current scrape
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // Consider withdrawn if not seen in 7 days

    const { data: recentListings, error } = await this.supabase
      .from('property_listings')
      .select('id, asking_price, address, latitude, longitude, property_type, beds, baths, first_seen_at')
      .eq('source', source)
      .eq('status', 'for_sale')
      .gte('last_seen_at', cutoffDate.toISOString())
      .not('id', 'in', `(${currentIds.slice(0, 1000).join(',')})`);  // Supabase limit

    if (error || !recentListings?.length) {
      return { count: 0, historyCount: 0 };
    }

    // Filter to listings not in current scrape
    const currentIdSet = new Set(currentIds);
    const withdrawn = recentListings.filter((l) => !currentIdSet.has(l.id));

    if (withdrawn.length === 0) {
      return { count: 0, historyCount: 0 };
    }

    console.log(`📉 Detected ${withdrawn.length} potentially withdrawn listings`);

    // Create history records for withdrawn listings
    const historyRecords: HistoryRecord[] = withdrawn.map((listing) => ({
      listing_id: listing.id,
      source,
      scraped_at: now,
      asking_price: listing.asking_price,
      status: 'withdrawn',
      change_type: 'withdrawn',
      address: listing.address,
      latitude: listing.latitude,
      longitude: listing.longitude,
      property_type: listing.property_type,
      beds: listing.beds,
      baths: listing.baths,
      days_on_market: this.calculateDaysOnMarket(listing.first_seen_at, now),
    }));

    const { inserted, errors } = await this.insertHistoryBatch(historyRecords);

    // Update listing status to withdrawn
    for (const listing of withdrawn) {
      await this.supabase
        .from('property_listings')
        .update({ status: 'withdrawn', last_seen_at: now })
        .eq('id', listing.id);
    }

    return { count: withdrawn.length, historyCount: inserted };
  }

  /**
   * Get price history for a specific listing
   */
  async getListingHistory(listingId: string): Promise<HistoryRecord[]> {
    const { data, error } = await this.supabase
      .from('listing_history')
      .select('*')
      .eq('listing_id', listingId)
      .order('scraped_at', { ascending: true });

    if (error) {
      console.error(`❌ Error fetching listing history:`, error);
      return [];
    }

    return data || [];
  }

  /**
   * Get recent price reductions across all listings
   */
  async getRecentPriceReductions(
    days: number = 7,
    limit: number = 100
  ): Promise<HistoryRecord[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('listing_history')
      .select('*')
      .eq('change_type', 'price_reduction')
      .gte('scraped_at', cutoffDate.toISOString())
      .order('scraped_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error(`❌ Error fetching price reductions:`, error);
      return [];
    }

    return data || [];
  }

  /**
   * Get listings that went sale agreed recently
   */
  async getRecentSaleAgreed(
    days: number = 30,
    limit: number = 100
  ): Promise<HistoryRecord[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('listing_history')
      .select('*')
      .eq('change_type', 'sale_agreed')
      .gte('scraped_at', cutoffDate.toISOString())
      .order('scraped_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error(`❌ Error fetching sale agreed:`, error);
      return [];
    }

    return data || [];
  }

  /**
   * Calculate average time to sale agreed by area
   */
  async getAverageTimeToSaleAgreed(
    dublinPostcode?: string
  ): Promise<{ postcode: string; avgDays: number; count: number }[]> {
    // This would require a more complex query - using raw SQL
    const query = `
      SELECT
        COALESCE(
          SUBSTRING(address FROM 'Dublin (\\d+)'),
          'Unknown'
        ) as postcode,
        AVG(days_on_market) as avg_days,
        COUNT(*) as count
      FROM listing_history
      WHERE change_type = 'sale_agreed'
        AND days_on_market IS NOT NULL
        ${dublinPostcode ? `AND address ILIKE '%Dublin ${dublinPostcode}%'` : ''}
      GROUP BY postcode
      HAVING COUNT(*) >= 5
      ORDER BY avg_days ASC
    `;

    // Note: This would need to be run via Supabase RPC function
    // For now, return empty array - implement via stored procedure
    return [];
  }
}

// Export singleton instance
export const historyTracker = new HistoryTracker();
export default historyTracker;
