/**
 * Incremental Sold Properties Pipeline
 *
 * Creates dated JSON files for each scrape run.
 * Stops when it catches up with existing data.
 * Never modifies previous files.
 * Writes data to both JSON files and Supabase.
 *
 * Output: data/sold/sold-YYYY-MM-DD.json + Supabase
 *
 * Usage:
 *   npm run scrape:sold              # Incremental (default)
 *   npm run scrape:sold:full         # Full re-scrape (creates new dated file)
 */

import { chromium } from 'playwright';
import { writeFileSync, existsSync, readFileSync, readdirSync, mkdirSync } from 'fs';
import { join } from 'path';
import { geocodeAddress } from './geocode.js';
import { acceptCookiesAndPopups, navigateToNextPage, createBrowserContextOptions, BaseDaftScraper } from './scraper-utils.js';
import { db, SoldPropertyRecord } from './database.js';

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
      
      // Don't retry on certain errors
      if (error.message === 'CAUGHT_UP') {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
        console.warn(`⚠ ${operation} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`✗ ${operation} failed after ${maxRetries} attempts`);
      }
    }
  }
  
  throw lastError || new Error(`${operation} failed after ${maxRetries} attempts`);
}

// ============== Configuration ==============
const CONFIG = {
  baseUrl: 'https://www.daft.ie/sold-properties/dublin?sort=publishDateDesc',
  nominatimUrl: 'http://localhost:8080/search',
  outputDir: './data/sold',
  delayMs: 5000, // Increased delay to avoid detection
  maxPages: 10277,
  // Stop after this many consecutive duplicates (3 pages worth)
  duplicateThreshold: 60,
  // Also stop if we haven't found new properties in this many pages
  pagesWithoutNewProperties: 10,
};

// ============== Types ==============
interface Property {
  id: string;  // Unique identifier for deduplication
  address: string;
  soldDate: string;
  soldPrice: number;
  askingPrice: number;
  overUnderPercent: number;
  beds: number | null;
  baths: number | null;
  areaSqm: number | null;
  propertyType: string;
  sourceUrl: string;
  sourcePage: number;
  latitude: number | null;
  longitude: number | null;
  eircode: string | null;
  nominatimAddress: string | null;
  pricePerSqm: number | null;
  scrapedAt: string;
}

// ============== Utility Functions ==============

function generatePropertyId(address: string, soldDate: string, soldPrice: number): string {
  const normalised = address
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 60);
  return `${normalised}-${soldDate}-${soldPrice}`;
}

function getTodayFileName(): string {
  const today = new Date().toISOString().split('T')[0];
  return `sold-${today}.json`;
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Load all existing property IDs from all files in the sold/ directory
 * This is used to detect duplicates and know when to stop
 */
function loadAllExistingIds(): Set<string> {
  const ids = new Set<string>();
  
  ensureDir(CONFIG.outputDir);
  const files = readdirSync(CONFIG.outputDir).filter(f => f.endsWith('.json'));
  
  console.log(`Loading existing data from ${files.length} files...`);
  
  for (const file of files) {
    try {
      const data: Property[] = JSON.parse(
        readFileSync(join(CONFIG.outputDir, file), 'utf-8')
      );
      for (const prop of data) {
        if (prop.id) {
          ids.add(prop.id);
        } else {
          // Backwards compatibility: generate ID for old records
          ids.add(generatePropertyId(prop.address, prop.soldDate, prop.soldPrice));
        }
      }
    } catch (e) {
      console.warn(`  Warning: Could not read ${file}`);
    }
  }
  
  console.log(`Loaded ${ids.size.toLocaleString()} existing property IDs\n`);
  return ids;
}

/**
 * Load properties from today's file if it exists (for resuming)
 */
function loadTodaysProgress(): Property[] {
  const todayFile = join(CONFIG.outputDir, getTodayFileName());
  if (existsSync(todayFile)) {
    try {
      return JSON.parse(readFileSync(todayFile, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
}


// ============== Sold Scraper Class ==============

class SoldScraper extends BaseDaftScraper<Property> {
  private existingIds: Set<string>;
  private newProperties: Property[] = [];
  private consecutiveDuplicates = 0;
  private totalNew = 0;
  private isFullMode: boolean;
  private pagesWithoutNewProperties = 0;
  private newPropertiesThisPage = 0;

  constructor(baseUrl: string, existingIds: Set<string>, isFullMode: boolean) {
    super(baseUrl);
    this.existingIds = existingIds;
    this.isFullMode = isFullMode;
  }

  protected async runScrapingLoop(maxPages: number = Infinity, maxListings?: number): Promise<Property[]> {
    const allData: Property[] = [];
    let totalListings = 0;

    while (this.currentPage <= maxPages && (maxListings === undefined || totalListings < maxListings)) {
      console.log(`\n--- Page ${this.currentPage}/${maxPages === Infinity ? '∞' : maxPages} ---`);

      this.newPropertiesThisPage = 0;

      // Step 1: Collect all data from current page
      const pageData = await this.collectDataFromPage(this.currentPage);
      console.log(`Found ${pageData.length} items on page ${this.currentPage}`);

      // Process each item
      for (const item of pageData) {
        if (maxListings !== undefined && totalListings >= maxListings) break;

        const processedItem = await this.processItem(item);
        if (processedItem) {
          allData.push(processedItem);
          totalListings++;
          this.newPropertiesThisPage++;
        }
      }

      console.log(`Page ${this.currentPage}: ${this.newPropertiesThisPage} new properties found`);

      // Check if we should stop due to no new properties
      if (this.newPropertiesThisPage === 0) {
        this.pagesWithoutNewProperties++;
        console.log(`Pages without new properties: ${this.pagesWithoutNewProperties}/${CONFIG.pagesWithoutNewProperties}`);
        if (!this.isFullMode && this.pagesWithoutNewProperties >= CONFIG.pagesWithoutNewProperties) {
          console.log(`\n✓ No new properties found in ${this.pagesWithoutNewProperties} consecutive pages.`);
          console.log('Stopping incremental scrape.\n');
          throw new Error('CAUGHT_UP');
        }
      } else {
        this.pagesWithoutNewProperties = 0; // Reset counter when we find new properties
      }

      // Step 2: Scroll to bottom to ensure pagination button is visible
      await this.scrollToBottom();

      // Step 3: Check if there's a next page and navigate
      const hasNextPage = await this.navigateToNextPage();
      if (!hasNextPage) {
        console.log('Reached last page');
        break;
      }

      this.currentPage++;
    }

    return allData;
  }

  protected async collectDataFromPage(pageNum: number): Promise<any[]> {
    const sourceUrl = pageNum === 1
      ? CONFIG.baseUrl
      : `${CONFIG.baseUrl}?page=${pageNum}`;

    console.log(`🔍 Extracting data from page ${pageNum}...`);

    const rawData = await this.page.evaluate((sourceUrl) => {
      const cards = document.querySelectorAll('[data-testid="card-container"]');
      const results: any[] = [];

      console.log(`Found ${cards.length} card containers on page`);

      cards.forEach((card, index) => {
        const text = card.textContent || '';
        const html = card.innerHTML || '';

        // Try multiple extraction strategies

        // Strategy 1: Original SOLD format
        let extracted = extractFromSoldFormat(text, sourceUrl);
        if (extracted) {
          results.push(extracted);
          return;
        }

        // Strategy 2: Look for any price patterns
        const priceMatches = text.match(/€([\d,]+)/g);
        if (priceMatches && priceMatches.length >= 1) {
          extracted = extractFromPriceFormat(text, priceMatches, sourceUrl);
          if (extracted) {
            results.push(extracted);
            return;
          }
        }

        // Strategy 3: Extract whatever data we can find
        extracted = extractBasicInfo(text, html, sourceUrl);
        if (extracted && extracted.address && extracted.soldPrice) {
          results.push(extracted);
          return;
        }

        // Debug: Log what we couldn't extract
        if (index < 3) { // Only log first few cards to avoid spam
          console.log(`Card ${index + 1} content: ${text.substring(0, 100)}...`);
        }
      });

      return results;

      // Helper functions for different extraction strategies
      function extractFromSoldFormat(text: string, sourceUrl: string) {
        const dateMatch = text.match(/SOLD (\d{2}\/\d{2}\/\d{4})/);
        const soldMatch = text.match(/Sold:\s*€([\d,]+)/);
        const askingMatch = text.match(/Asking:\s*€([\d,]+)/);

        if (!dateMatch || !soldMatch) return null;

        const dateIdx = text.indexOf(dateMatch[0]);
        const soldIdx = text.indexOf('Sold:');
        const address = text.substring(dateIdx + dateMatch[0].length, soldIdx).trim();

        if (!address || address.length < 5) return null;

        return {
          soldDate: dateMatch[1],
          address,
          soldPrice: soldMatch[1].replace(/,/g, ''),
          askingPrice: askingMatch ? askingMatch[1].replace(/,/g, '') : soldMatch[1].replace(/,/g, ''),
          beds: extractNumber(text, /(\d+)\s*Bed/),
          baths: extractNumber(text, /(\d+)\s*Bath/),
          area: extractNumber(text, /([\d.]+)\s*m²/),
          propertyType: extractPropertyType(text),
          sourceUrl
        };
      }

      function extractFromPriceFormat(text: string, priceMatches: string[], sourceUrl: string) {
        const prices = priceMatches.map(p => p.replace('€', '').replace(/,/g, ''));

        // Look for address-like text
        const addressMatch = text.match(/([A-Z][^€\d]{10,}?)(?:\d{4}|\d{2}\/\d{2}|Sold|Asking|$)/);
        const address = addressMatch ? addressMatch[1].trim() : null;

        if (!address || address.length < 5) return null;

        return {
          soldDate: new Date().toISOString().split('T')[0], // Use today's date as fallback
          address,
          soldPrice: prices[0],
          askingPrice: prices.length > 1 ? prices[1] : prices[0],
          beds: extractNumber(text, /(\d+)\s*bed/),
          baths: extractNumber(text, /(\d+)\s*bath/),
          area: extractNumber(text, /([\d.]+)\s*m²/),
          propertyType: extractPropertyType(text),
          sourceUrl
        };
      }

      function extractBasicInfo(text: string, html: string, sourceUrl: string) {
        // Extract any address-like string
        const addressPatterns = [
          /([A-Z][^€\d]{15,50}?)(?:\d{4}|€|\d{2}\/\d{2}|$)/,
          /([^€\d]{20,80}?)(?:\d{4}|€|$)/
        ];

        let address = null;
        for (const pattern of addressPatterns) {
          const match = text.match(pattern);
          if (match && match[1] && match[1].length > 10) {
            address = match[1].trim();
            break;
          }
        }

        // Extract any price
        const priceMatch = text.match(/€([\d,]+)/);
        const price = priceMatch ? priceMatch[1].replace(/,/g, '') : null;

        if (address && price) {
          return {
            soldDate: new Date().toISOString().split('T')[0],
            address,
            soldPrice: price,
            askingPrice: price,
            beds: extractNumber(text, /(\d+)\s*bed/i),
            baths: extractNumber(text, /(\d+)\s*bath/i),
            area: extractNumber(text, /([\d.]+)\s*m²/),
            propertyType: extractPropertyType(text),
            sourceUrl
          };
        }

        return null;
      }

      function extractNumber(text: string, pattern: RegExp) {
        const match = text.match(pattern);
        return match ? match[1] : null;
      }

      function extractPropertyType(text: string) {
        const types = ['Semi-D', 'Detached', 'Apartment', 'Terrace', 'Bungalow', 'Duplex', 'Townhouse', 'End of Terrace', 'Site'];
        for (const type of types) {
          if (text.toLowerCase().includes(type.toLowerCase())) {
            return type;
          }
        }
        return '';
      }
    }, sourceUrl);

    console.log(`📊 Extracted ${rawData.length} properties from page ${pageNum}`);
    return rawData;
  }

  protected async processItem(rawItem: any): Promise<Property | null> {
    // Parse data
    const dateParts = rawItem.soldDate.split('/');
    const soldDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // DD/MM/YYYY -> YYYY-MM-DD
    const soldPrice = parseInt(rawItem.soldPrice.replace(/,/g, '')) || 0;
    const askingPrice = parseInt(rawItem.askingPrice.replace(/,/g, '')) || 0;

    // Generate unique ID
    const id = generatePropertyId(rawItem.address, soldDate, soldPrice);

    // Check for duplicate
    if (this.existingIds.has(id)) {
      this.consecutiveDuplicates++;

      // Log duplicate detection progress
      if (this.consecutiveDuplicates % 10 === 0) {
        console.log(`  → ${this.consecutiveDuplicates}/${CONFIG.duplicateThreshold} consecutive duplicates found`);
      }

      // Stop condition for incremental mode
      if (!this.isFullMode && this.consecutiveDuplicates >= CONFIG.duplicateThreshold) {
        console.log(`\n✓ Caught up! Found ${this.consecutiveDuplicates} consecutive duplicates.`);
        console.log('No new properties found recently - stopping incremental scrape.\n');
        throw new Error('CAUGHT_UP'); // Use error to break out of nested loops
      }
      return null;
    }

    // Reset duplicate counter on new property
    this.consecutiveDuplicates = 0;

    console.log(`  + NEW: ${rawItem.address.substring(0, 40)}...`);

    // Geocode with retry
    const geo = await retryWithBackoff(
      () => geocodeAddress(rawItem.address),
      2,
      500,
      `Geocoding ${rawItem.address.substring(0, 30)}...`
    ).catch(() => null); // Don't fail entire scrape on geocoding errors

    const areaSqm = rawItem.area ? parseFloat(rawItem.area) : null;

    const property: Property = {
      id,
      address: rawItem.address,
      soldDate,
      soldPrice,
      askingPrice,
      overUnderPercent: askingPrice > 0
        ? Math.round(((soldPrice - askingPrice) / askingPrice) * 10000) / 100
        : 0,
      beds: rawItem.beds ? parseInt(rawItem.beds) : null,
      baths: rawItem.baths ? parseInt(rawItem.baths) : null,
      areaSqm,
      propertyType: rawItem.propertyType,
      sourceUrl: rawItem.sourceUrl,
      sourcePage: this.currentPage,
      latitude: geo?.latitude || null,
      longitude: geo?.longitude || null,
      eircode: geo?.eircode || null,
      nominatimAddress: geo?.nominatimAddress || null,
      pricePerSqm: (soldPrice && areaSqm) ? Math.round(soldPrice / areaSqm) : null,
      scrapedAt: new Date().toISOString(),
    };

    this.existingIds.add(id);
    this.newProperties.push(property);
    this.totalNew++;

    const geoStatus = geo ? `✓ ${geo.eircode || 'geo'}` : '✗';
    console.log(`  + ${property.address.substring(0, 40)}... ${geoStatus}`);

    return property;
  }

  async run(): Promise<Property[]> {
    await this.initializeBrowser();
    await this.navigateToInitialPage();

    try {
      const properties = await this.runScrapingLoop(CONFIG.maxPages);
      return this.newProperties;
    } catch (e: any) {
      if (e.message === 'CAUGHT_UP') {
        return this.newProperties;
      }
      throw e;
    }
  }

  getNewProperties(): Property[] {
    return this.newProperties;
  }
}

// ============== Main Pipeline ==============

async function runIncrementalPipeline() {
  const isFullMode = process.argv.includes('--full');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          INCREMENTAL SOLD PROPERTIES PIPELINE              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`Mode: ${isFullMode ? 'FULL SCRAPE' : 'INCREMENTAL'}`);
  console.log(`Output: ${CONFIG.outputDir}/${getTodayFileName()}\n`);

  // Load all existing IDs for duplicate detection
  const existingIds = isFullMode ? new Set<string>() : loadAllExistingIds();

  // Load today's progress if resuming
  let todaysProperties = loadTodaysProgress();
  if (todaysProperties.length > 0) {
    console.log(`Resuming: ${todaysProperties.length} properties already scraped today\n`);
    // Add today's IDs to existing set
    for (const prop of todaysProperties) {
      existingIds.add(prop.id);
    }
  }

  // Geocoding is now handled by LocationIQ API or local Nominatim
  console.log('✓ Using LocationIQ geocoding (no Nominatim required)\n');

  // Use the new SoldScraper class
  const scraper = new SoldScraper(CONFIG.baseUrl, existingIds, isFullMode);

  try {
    await scraper.run();

    // Get new properties from scraper
    const newProperties = scraper.getNewProperties();

    // Combine with today's existing progress
    const allTodaysProperties = [...todaysProperties, ...newProperties];

    // Save final results (both JSON and Supabase)
    await saveProperties(allTodaysProperties);

    // Final summary
    console.log('═'.repeat(60));
    console.log('SCRAPE COMPLETE');
    console.log('═'.repeat(60));
    console.log(`New properties this run: ${newProperties.length}`);
    console.log(`Total in today's file:   ${allTodaysProperties.length}`);
    console.log(`Output: ${CONFIG.outputDir}/${getTodayFileName()}`);
    console.log(`\nRun 'npm run consolidate' to merge all data.`);

  } catch (e: any) {
    if (e.message === 'CAUGHT_UP') {
      // This is expected - save what we have
      const newProperties = scraper.getNewProperties();
      const allTodaysProperties = [...todaysProperties, ...newProperties];

      // Save final results (both JSON and Supabase)
      await saveProperties(allTodaysProperties);

      console.log('═'.repeat(60));
      console.log('SCRAPE COMPLETE (CAUGHT UP)');
      console.log('═'.repeat(60));
      console.log(`New properties this run: ${newProperties.length}`);
      console.log(`Total in today's file:   ${allTodaysProperties.length}`);
      console.log(`Output: ${CONFIG.outputDir}/${getTodayFileName()}`);
      console.log(`\nRun 'npm run consolidate' to merge all data.`);
    } else {
      console.error('Error during scraping:', e);
    }
  }
}

/**
 * Save properties to both JSON file and Supabase database
 */
async function saveProperties(properties: any[]): Promise<void> {
  if (properties.length === 0) {
    console.log('No properties to save');
    return;
  }

  const filePath = join(CONFIG.outputDir, getTodayFileName());

  // Save to JSON file (existing behavior)
  ensureDir(CONFIG.outputDir);
  writeFileSync(filePath, JSON.stringify(properties, null, 2));
  console.log(`✅ Saved ${properties.length} properties to JSON: ${filePath}`);

  // Transform for Supabase
  const supabaseRecords: SoldPropertyRecord[] = properties.map(p => ({
    id: p.id,
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
    scraped_at: p.scrapedAt,
    nominatim_address: p.nominatimAddress,
    yield_estimate: p.yieldEstimate
  }));

  // Save to Supabase
  try {
    const result = await db.upsertSoldProperties(supabaseRecords);
    console.log(`✅ Saved ${result.inserted + result.updated} properties to Supabase (${result.inserted} new, ${result.updated} updated)`);

    if (result.failed > 0) {
      console.warn(`⚠️  ${result.failed} properties failed to save to Supabase`);
    }
  } catch (error) {
    console.error('❌ Failed to save to Supabase:', error);
    // Don't fail the whole process - JSON backup is still saved
  }
}

// Run
runIncrementalPipeline().catch(console.error);

