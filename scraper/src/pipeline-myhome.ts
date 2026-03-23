/**
 * MyHome.ie Listings Pipeline
 *
 * Scrapes active "For Sale" listings from MyHome.ie for Dublin.
 * Uses Playwright for browser automation with anti-detection measures.
 * Complements Daft.ie scraper for comprehensive market coverage.
 *
 * Usage:
 * - npm run scrape:myhome               # Scrape all MyHome listings
 * - npm run scrape:myhome -- --max 10   # Limit to 10 pages
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { geocodeAddress } from './geocode.js';
import { db, ListingRecord } from './database.js';
import { historyTracker, ListingState } from './history-tracker.js';
import { createBrowserContextOptions } from './scraper-utils.js';

dotenv.config();

// Types
interface MyHomeListing {
  id: string;
  address: string;
  askingPrice: number;
  beds: number | null;
  baths: number | null;
  areaSqm: number | null;
  propertyType: string;
  berRating: string | null;
  sourceUrl: string;
  sourcePage: number;
  latitude: number | null;
  longitude: number | null;
  eircode: string | null;
  dublinPostcode: string | null;
  pricePerSqm: number | null;
  nominatimAddress: string | null;
  scrapedAt: string;
}

// Configuration
const CONFIG = {
  baseUrl: 'https://www.myhome.ie/residential/dublin/property-for-sale?page=1',
  outputDir: './data/myhome-listings',
  delayMs: 5000,
  maxPages: 300,
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

// Utility functions
function generateListingId(address: string, askingPrice: number): string {
  const normalised = address
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 60);
  return `myhome-${normalised}-${askingPrice}`;
}

function getTodayFileName(): string {
  const today = new Date().toISOString().split('T')[0];
  return `myhome-listings-${today}.json`;
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function parsePrice(priceStr: string): number {
  const cleaned = priceStr.replace(/[€,\s]/g, '');
  const millionMatch = cleaned.match(/([\d.]+)m/i);
  if (millionMatch) {
    return Math.round(parseFloat(millionMatch[1]) * 1_000_000);
  }
  return parseInt(cleaned) || 0;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
        const delayTime = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(
          `⚠ ${operation} failed (attempt ${attempt}/${maxRetries}), retrying in ${delayTime}ms...`
        );
        await delay(delayTime);
      }
    }
  }

  throw lastError || new Error(`${operation} failed after ${maxRetries} attempts`);
}

class MyHomeScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private processedAddresses = new Set<string>();

  async initialize(): Promise<void> {
    console.log('🚀 Initializing browser...');

    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const contextOptions = createBrowserContextOptions();
    this.context = await this.browser.newContext({
      ...contextOptions,
      userAgent: CONFIG.userAgent,
    });

    this.page = await this.context.newPage();

    // Anti-detection
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });
  }

  async acceptCookies(): Promise<void> {
    if (!this.page) return;

    const cookieSelectors = [
      'button:has-text("Accept All")',
      'button:has-text("Accept")',
      'button[id*="accept"]',
      'button[class*="accept"]',
      '[data-testid="cookie-accept"]',
    ];

    for (const selector of cookieSelectors) {
      try {
        const btn = await this.page.$(selector);
        if (btn) {
          await btn.click();
          console.log('✓ Accepted cookies');
          await delay(1000);
          return;
        }
      } catch {
        // Try next selector
      }
    }
  }

  async navigateToPage(pageNum: number): Promise<boolean> {
    if (!this.page) return false;

    const url = `https://www.myhome.ie/residential/dublin/property-for-sale?page=${pageNum}`;
    console.log(`📄 Navigating to page ${pageNum}...`);

    try {
      await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await delay(2000);

      // Check if we have listings on the page
      const listings = await this.page.$$('[class*="PropertyCard"], [class*="property-card"], [data-testid="property-card"]');
      if (listings.length === 0) {
        // Try alternative selectors
        const altListings = await this.page.$$('a[href*="/residential/"]');
        return altListings.length > 5; // At least some property links
      }
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to navigate to page ${pageNum}:`, error.message);
      return false;
    }
  }

  async extractListingsFromPage(pageNum: number): Promise<any[]> {
    if (!this.page) return [];

    // Scroll to load lazy content
    await this.scrollPage();

    const rawListings = await this.page.evaluate(() => {
      const results: any[] = [];
      const processedUrls = new Set<string>();

      // Find all property links
      const propertyLinks = document.querySelectorAll('a[href*="/residential/"]');

      propertyLinks.forEach((link) => {
        try {
          const href = link.getAttribute('href') || '';

          // Must be a property detail link
          if (!href.includes('/residential/') || href.includes('/property-for-sale') || href.includes('?')) {
            return;
          }

          if (processedUrls.has(href)) return;
          processedUrls.add(href);

          // Get the parent card element
          const card = link.closest('[class*="PropertyCard"], [class*="property-card"], article, div[class*="listing"]') || link;

          // Extract address
          let address = '';
          const addressEl = card.querySelector('h2, h3, [class*="address"], [class*="title"]');
          if (addressEl) {
            address = addressEl.textContent?.trim() || '';
          }

          if (!address || address.length < 5) return;

          // Extract price
          let priceText = '';
          const priceEl = card.querySelector('[class*="price"], [class*="Price"]');
          if (priceEl) {
            priceText = priceEl.textContent?.trim() || '';
          }

          const priceMatch = priceText.match(/€([\d,]+)/);
          if (!priceMatch) return;

          // Extract metadata
          const cardText = card.textContent || '';
          const bedsMatch = cardText.match(/(\d+)\s*(?:Bed|bed)/);
          const bathsMatch = cardText.match(/(\d+)\s*(?:Bath|bath)/);
          const areaMatch = cardText.match(/([\d.]+)\s*(?:m²|sq\.?\s*m)/);
          const berMatch = cardText.match(/BER[:\s]*([A-G]\d?)/i);
          const typeMatch = cardText.match(/(Semi-D|Detached|Apartment|Terrace|Bungalow|Duplex|Townhouse|End of Terrace)/i);

          results.push({
            address: address.replace(/\s+/g, ' ').trim(),
            askingPrice: priceMatch[1],
            beds: bedsMatch ? bedsMatch[1] : null,
            baths: bathsMatch ? bathsMatch[1] : null,
            area: areaMatch ? areaMatch[1] : null,
            propertyType: typeMatch ? typeMatch[1] : '',
            berRating: berMatch ? berMatch[1].toUpperCase() : null,
            sourceUrl: href.startsWith('http') ? href : `https://www.myhome.ie${href}`,
          });
        } catch (e) {
          // Skip problematic cards
        }
      });

      return results;
    });

    return rawListings;
  }

  async scrollPage(): Promise<void> {
    if (!this.page) return;

    await this.page.evaluate(async () => {
      const scrollStep = 300;
      const scrollDelay = 100;
      let scrollTop = 0;
      const maxScroll = document.body.scrollHeight;

      while (scrollTop < maxScroll) {
        window.scrollBy(0, scrollStep);
        scrollTop += scrollStep;
        await new Promise((r) => setTimeout(r, scrollDelay));
      }

      // Scroll back up
      window.scrollTo(0, 0);
    });

    await delay(1000);
  }

  async processListing(rawListing: any, pageNum: number): Promise<MyHomeListing | null> {
    if (this.processedAddresses.has(rawListing.address)) {
      return null;
    }

    // Geocode address
    const geo = await retryWithBackoff(
      () => geocodeAddress(rawListing.address),
      2,
      500,
      `Geocoding ${rawListing.address.substring(0, 30)}...`
    ).catch(() => null);

    const askingPrice = parsePrice(rawListing.askingPrice);
    const areaSqm = rawListing.area ? parseFloat(rawListing.area) : null;
    const id = generateListingId(rawListing.address, askingPrice);

    // Extract Dublin postcode
    const postcodeMatch = rawListing.address.match(/Dublin\s*(\d+)/i);
    const dublinPostcode = postcodeMatch ? `D${postcodeMatch[1]}` : null;

    const listing: MyHomeListing = {
      id,
      address: rawListing.address,
      askingPrice,
      beds: rawListing.beds ? parseInt(rawListing.beds) : null,
      baths: rawListing.baths ? parseInt(rawListing.baths) : null,
      areaSqm,
      propertyType: rawListing.propertyType || '',
      berRating: rawListing.berRating,
      sourceUrl: rawListing.sourceUrl,
      sourcePage: pageNum,
      latitude: geo?.latitude || null,
      longitude: geo?.longitude || null,
      eircode: geo?.eircode || null,
      dublinPostcode,
      pricePerSqm: askingPrice && areaSqm ? Math.round(askingPrice / areaSqm) : null,
      nominatimAddress: geo?.nominatimAddress || null,
      scrapedAt: new Date().toISOString(),
    };

    this.processedAddresses.add(rawListing.address);

    const geoStatus = geo ? `✓ ${geo.eircode || 'geocoded'}` : '✗';
    console.log(`  + ${listing.address.substring(0, 40)}... ${geoStatus}`);

    return listing;
  }

  async run(maxPages?: number): Promise<MyHomeListing[]> {
    await this.initialize();

    if (!this.page) {
      throw new Error('Failed to initialize browser');
    }

    const listings: MyHomeListing[] = [];
    const pagesToScrape = maxPages || CONFIG.maxPages;

    // Navigate to first page
    await this.navigateToPage(1);
    await this.acceptCookies();

    for (let pageNum = 1; pageNum <= pagesToScrape; pageNum++) {
      console.log(`\n=== Page ${pageNum}/${pagesToScrape} ===`);

      if (pageNum > 1) {
        const success = await this.navigateToPage(pageNum);
        if (!success) {
          console.log('No more pages available');
          break;
        }
      }

      const rawListings = await this.extractListingsFromPage(pageNum);
      console.log(`Found ${rawListings.length} raw listings`);

      if (rawListings.length === 0) {
        console.log('No listings found on page, stopping');
        break;
      }

      for (const raw of rawListings) {
        const listing = await this.processListing(raw, pageNum);
        if (listing) {
          listings.push(listing);
        }
      }

      console.log(`Page ${pageNum}: ${listings.length} total listings collected`);

      // Delay between pages
      await delay(CONFIG.delayMs);
    }

    await this.cleanup();
    return listings;
  }

  async cleanup(): Promise<void> {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    console.log('✓ Browser cleanup complete');
  }
}

async function saveListings(listings: MyHomeListing[]): Promise<void> {
  if (listings.length === 0) {
    console.log('No listings to save');
    return;
  }

  const filePath = join(CONFIG.outputDir, getTodayFileName());

  // Save to JSON file
  ensureDir(CONFIG.outputDir);
  writeFileSync(filePath, JSON.stringify(listings, null, 2));
  console.log(`✅ Saved ${listings.length} listings to JSON: ${filePath}`);

  // Track listing history
  try {
    const listingStates: ListingState[] = listings.map((l) => ({
      id: l.id,
      address: l.address,
      askingPrice: l.askingPrice,
      status: 'for_sale' as const,
      source: 'myhome' as const,
      latitude: l.latitude || undefined,
      longitude: l.longitude || undefined,
      propertyType: l.propertyType || undefined,
      beds: l.beds || undefined,
      baths: l.baths || undefined,
    }));

    const historyResult = await historyTracker.trackListings(listingStates, 'myhome');
    console.log(
      `📊 History tracking: ${historyResult.newListings} new, ${historyResult.priceChanges} price changes, ${historyResult.statusChanges} status changes`
    );
  } catch (error) {
    console.error('⚠️ History tracking failed:', error);
  }

  // Transform and save to Supabase
  const supabaseRecords: ListingRecord[] = listings.map((l) => ({
    id: l.id,
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
    first_seen_date: new Date().toISOString().split('T')[0],
    last_seen_date: new Date().toISOString().split('T')[0],
    days_on_market: 0,
    price_changes: 0,
    price_history: [],
    source_url: l.sourceUrl,
    scraped_at: l.scrapedAt,
    nominatim_address: l.nominatimAddress,
    yield_estimate: null,
  }));

  try {
    const result = await db.upsertListings(supabaseRecords);
    console.log(
      `✅ Saved ${result.inserted + result.updated} listings to Supabase (${result.inserted} new, ${result.updated} updated)`
    );

    if (result.failed > 0) {
      console.warn(`⚠️  ${result.failed} listings failed to save to Supabase`);
    }
  } catch (error) {
    console.error('❌ Failed to save to Supabase:', error);
  }
}

async function runPipeline(): Promise<void> {
  console.log('=== MyHome.ie Listings Pipeline ===\n');
  console.log(`Target: ${CONFIG.baseUrl}\n`);

  const args = process.argv.slice(2);
  const maxPagesArg = args.find((a) => a.startsWith('--max'));
  const maxPages = maxPagesArg
    ? parseInt(args[args.indexOf(maxPagesArg) + 1])
    : CONFIG.maxPages;

  const scraper = new MyHomeScraper();

  try {
    const listings = await scraper.run(maxPages);
    await saveListings(listings);

    const withCoords = listings.filter((l) => l.latitude && l.longitude).length;
    const geocodeRate =
      listings.length > 0 ? Math.round((withCoords / listings.length) * 100) : 0;

    console.log(`\n=== Pipeline Complete ===`);
    console.log(`Total listings: ${listings.length}`);
    console.log(`With coordinates: ${withCoords} (${geocodeRate}%)`);
    console.log(`Output: ${CONFIG.outputDir}/${getTodayFileName()}`);
  } catch (error) {
    console.error('Error during scraping:', error);
    await scraper.cleanup();
  }
}

console.log('Starting MyHome.ie scraper...');
runPipeline().catch(console.error);

export { MyHomeScraper };
