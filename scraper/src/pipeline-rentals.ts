/**
 * Rental Listings Pipeline
 *
 * Scrapes active rental listings from Daft.ie Dublin
 * Extracts: monthly rent, beds, baths, property type, BER, area
 * Geocodes using LocationIQ API or local Nominatim
 *
 * Usage: npm run scrape:rentals
 *        npm run scrape:rentals -- --max 50
 */

import { chromium, Page } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { geocodeAddress } from './geocode.js';
import { acceptCookiesAndPopups, navigateToNextPage, createBrowserContextOptions, BaseDaftScraper } from './scraper-utils.js';
import { db, RentalRecord } from './database.js';

// ============== Retry Utility ==============

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
  operation: string = 'operation'
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(`⚠ ${operation} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`✗ ${operation} failed after ${maxRetries} attempts`);
      }
    }
  }
  
  throw lastError || new Error(`${operation} failed after ${maxRetries} attempts`);
}

// ============== Types ==============

interface RentalListing {
  id: string;
  address: string;
  monthlyRent: number;
  beds: number | null;
  baths: number | null;
  areaSqm: number | null;
  propertyType: string;
  berRating: string | null;
  furnishing: string | null;
  sourceUrl: string;
  sourcePage: number;
  latitude: number | null;
  longitude: number | null;
  eircode: string | null;
  nominatimAddress: string | null;
  rentPerSqm: number | null;
  rentPerBed: number | null;
  dublinPostcode: string | null;
  scrapedAt: string;
}

// ============== Config ==============

const BASE_URL = 'https://www.daft.ie/property-for-rent/dublin?sort=publishDateDesc';
const NOMINATIM_URL = 'http://localhost:8080';
const OUTPUT_DIR = './data/rentals';
const DELAY_MS = 5000; // Increased delay to avoid detection

// ============== Utility Functions ==============

function getTodayFileName(): string {
  const today = new Date().toISOString().split('T')[0];
  return `rentals-${today}.json`;
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// Parse command line args
const args = process.argv.slice(2);
const maxIndex = args.indexOf('--max');
const MAX_LISTINGS = maxIndex !== -1 ? parseInt(args[maxIndex + 1]) : Infinity;

// ============== Geocoding ==============

function extractEircode(address: string): string | null {
  const match = address.match(/([AD]\d{2}\s?[A-Z0-9]{4})/i);
  return match ? match[1].toUpperCase().replace(/\s/g, ' ') : null;
}

function extractDublinPostcode(address: string): string | null {
  const match = address.match(/Dublin\s*(\d{1,2}W?)|D(\d{1,2}W?)/i);
  if (match) {
    const code = match[1] || match[2];
    return `D${code.toUpperCase()}`;
  }
  return null;
}


// ============== Scraping ==============

// ============== Rental Scraper Class ==============

class RentalScraper extends BaseDaftScraper<RentalListing> {
  private existingUrls = new Set<string>();
  private newListings = 0;

  constructor(baseUrl: string) {
    super(baseUrl);
  }

  protected async collectDataFromPage(pageNum: number): Promise<any[]> {
    return await this.page.evaluate((pageNumber) => {
      const listings: any[] = [];
      const cards = document.querySelectorAll('[data-testid="card-container"]');

      cards.forEach(card => {
        try {
          // Get address
          const addressEl = card.querySelector('[data-tracking="srp_address"]');
          const address = addressEl?.textContent?.trim() || '';

          // Get price (monthly rent)
          const priceEl = card.querySelector('[data-tracking="srp_price"]');
          const priceText = priceEl?.textContent?.trim() || '';
          const rentMatch = priceText.match(/€([\d,]+)/);
          const monthlyRent = rentMatch ? parseInt(rentMatch[1].replace(/,/g, '')) : 0;

          // Get link
          const linkEl = card.querySelector('a[href*="/for-rent/"]') as HTMLAnchorElement;
          const sourceUrl = linkEl?.href || '';

          // Get metadata
          const metaEl = card.querySelector('[data-tracking="srp_meta"]');
          const metaText = metaEl?.textContent?.trim() || '';

          // Parse beds/baths
          const bedsMatch = metaText.match(/(\d+)\s*Bed/i);
          const bathsMatch = metaText.match(/(\d+)\s*Bath/i);
          const beds = bedsMatch ? parseInt(bedsMatch[1]) : null;
          const baths = bathsMatch ? parseInt(bathsMatch[1]) : null;

          // Parse area
          const areaMatch = metaText.match(/([\d.]+)\s*m²/i);
          const areaSqm = areaMatch ? parseFloat(areaMatch[1]) : null;

          // Property type
          let propertyType = 'Unknown';
          if (metaText.toLowerCase().includes('apartment')) propertyType = 'Apartment';
          else if (metaText.toLowerCase().includes('house')) propertyType = 'House';
          else if (metaText.toLowerCase().includes('studio')) propertyType = 'Studio';
          else if (metaText.toLowerCase().includes('flat')) propertyType = 'Flat';

          // BER Rating
          const berMatch = metaText.match(/BER:\s*([A-G]\d?)/i);
          const berRating = berMatch ? berMatch[1].toUpperCase() : null;

          // Furnishing
          let furnishing = null;
          if (metaText.toLowerCase().includes('unfurnished')) furnishing = 'Unfurnished';
          else if (metaText.toLowerCase().includes('furnished')) furnishing = 'Furnished';

          if (address && monthlyRent > 0) {
            listings.push({
              address,
              monthlyRent,
              beds,
              baths,
              areaSqm,
              propertyType,
              berRating,
              furnishing,
              sourceUrl,
              pageNumber,
            });
          }
        } catch (e) {
          // Skip problematic cards
        }
      });

      return listings;
    }, pageNum);
  }

  protected async processItem(rawItem: any): Promise<RentalListing | null> {
    // Check for duplicates
    if (this.existingUrls.has(rawItem.sourceUrl)) return null;

    // Extract eircode and postcode
    const eircode = extractEircode(rawItem.address);
    const dublinPostcode = extractDublinPostcode(rawItem.address);

    // Geocode with retry
    const geo = await retryWithBackoff(
      () => geocodeAddress(rawItem.address),
      2,
      500,
      `Geocoding ${rawItem.address.substring(0, 30)}...`
    ).catch(() => null);

    // Calculate per-unit metrics
    let rentPerSqm: number | null = null;
    if (rawItem.areaSqm && rawItem.areaSqm > 0) {
      rentPerSqm = Math.round((rawItem.monthlyRent / rawItem.areaSqm) * 100) / 100;
    }

    let rentPerBed: number | null = null;
    if (rawItem.beds && rawItem.beds > 0) {
      rentPerBed = Math.round(rawItem.monthlyRent / rawItem.beds);
    }

    // Generate unique ID for this rental
    const idString = `${rawItem.address}-${rawItem.monthlyRent}-${rawItem.scrapedAt || new Date().toISOString()}`;
    const id = idString.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 255);

    const listing: RentalListing = {
      id,
      address: rawItem.address,
      monthlyRent: rawItem.monthlyRent,
      beds: rawItem.beds,
      baths: rawItem.baths,
      areaSqm: rawItem.areaSqm,
      propertyType: rawItem.propertyType,
      berRating: rawItem.berRating,
      furnishing: rawItem.furnishing,
      sourceUrl: rawItem.sourceUrl,
      sourcePage: rawItem.pageNumber,
      latitude: geo?.latitude || null,
      longitude: geo?.longitude || null,
      eircode,
      nominatimAddress: geo?.nominatimAddress || null,
      rentPerSqm,
      rentPerBed,
      dublinPostcode,
      scrapedAt: new Date().toISOString(),
    };

    this.existingUrls.add(rawItem.sourceUrl);
    this.newListings++;

    const geoStatus = geo ? '✓' : '✗';
    console.log(`  [${geoStatus}] €${listing.monthlyRent}/mo - ${listing.beds || '?'}bed - ${listing.address.substring(0, 50)}...`);

    return listing;
  }

  async run(maxListings?: number): Promise<RentalListing[]> {
    await this.initializeBrowser();
    await this.navigateToInitialPage();

    const listings = await this.runScrapingLoop(Infinity, maxListings);

    await this.cleanup();
    return listings;
  }
}

async function scrapeRentals(): Promise<void> {
  console.log('=== Rental Listings Pipeline ===\n');
  console.log(`Target: ${BASE_URL}`);
  if (MAX_LISTINGS !== Infinity) {
    console.log(`Max listings: ${MAX_LISTINGS}`);
  }

  // Geocoding is now handled by LocationIQ API or local Nominatim
  console.log('✓ Using LocationIQ geocoding (no Nominatim required)\n');

  // Use the new RentalScraper class
  const scraper = new RentalScraper(BASE_URL);

  try {
    const allListings = await scraper.run(MAX_LISTINGS);

    // Save final results (both JSON and Supabase)
    await saveRentals(allListings);

    // Generate summary
    const geocoded = allListings.filter(l => l.latitude).length;
    const geocodeRate = ((geocoded / allListings.length) * 100).toFixed(1);

    console.log('\n=== Summary ===');
    console.log(`Total rentals: ${allListings.length}`);
    console.log(`Geocoded: ${geocoded} (${geocodeRate}%)`);
    console.log(`Output: ${OUTPUT_DIR}/${getTodayFileName()}`);

    // Generate area summary
    generateAreaSummary(allListings);

  } catch (error) {
    console.error('Error during scraping:', error);
  }
}

/**
 * Save rentals to both JSON file and Supabase database
 */
async function saveRentals(rentals: RentalListing[]): Promise<void> {
  if (rentals.length === 0) {
    console.log('No rentals to save');
    return;
  }

  const filePath = join(OUTPUT_DIR, getTodayFileName());

  // Save to JSON file (existing behavior)
  ensureDir(OUTPUT_DIR);
  writeFileSync(filePath, JSON.stringify(rentals, null, 2));
  console.log(`✅ Saved ${rentals.length} rentals to JSON: ${filePath}`);

  // Transform for Supabase
  // Debug: check what we're receiving
  console.log('First rental object:', rentals[0]);

  const supabaseRecords: RentalRecord[] = rentals.map(r => ({
    id: r.id,
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
    first_seen_date: r.firstSeenDate,
    last_seen_date: r.lastSeenDate,
    days_on_market: r.daysOnMarket,
    price_changes: r.priceChanges,
    price_history: r.priceHistory,
    source_url: r.sourceUrl,
    scraped_at: r.scrapedAt,
    nominatim_address: r.nominatimAddress,
    yield_estimate: r.yieldEstimate
  }));

  // Save to Supabase
  try {
    const result = await db.upsertRentals(supabaseRecords);
    console.log(`✅ Saved ${result.inserted + result.updated} rentals to Supabase (${result.inserted} new, ${result.updated} updated)`);

    if (result.failed > 0) {
      console.warn(`⚠️  ${result.failed} rentals failed to save to Supabase`);
    }
  } catch (error) {
    console.error('❌ Failed to save to Supabase:', error);
    // Don't fail the whole process - JSON backup is still saved
  }
}

function generateAreaSummary(listings: RentalListing[]): void {
  const byPostcode: Record<string, { count: number; totalRent: number; rents: number[] }> = {};
  
  for (const listing of listings) {
    const postcode = listing.dublinPostcode || 'Unknown';
    if (!byPostcode[postcode]) {
      byPostcode[postcode] = { count: 0, totalRent: 0, rents: [] };
    }
    byPostcode[postcode].count++;
    byPostcode[postcode].totalRent += listing.monthlyRent;
    byPostcode[postcode].rents.push(listing.monthlyRent);
  }
  
  const summary: Record<string, any> = {};
  for (const [postcode, data] of Object.entries(byPostcode)) {
    const sorted = data.rents.sort((a, b) => a - b);
    summary[postcode] = {
      count: data.count,
      avgRent: Math.round(data.totalRent / data.count),
      medianRent: sorted[Math.floor(sorted.length / 2)],
      minRent: sorted[0],
      maxRent: sorted[sorted.length - 1],
    };
  }
  
  writeFileSync('./data/rental-summary.json', JSON.stringify(summary, null, 2));
}

// Run
scrapeRentals().catch(console.error);

