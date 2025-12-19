/**
 * For Sale Listings Pipeline: Scrape + Geocode
 * 
 * Scrapes active "For Sale" listings from Daft.ie Dublin.
 * Uses Nominatim for geocoding with Dublin bounds validation.
 * Outputs to listings.json (snapshot mode - fresh each run).
 * 
 * Prerequisites:
 * - Docker running with Nominatim: docker start nominatim
 * 
 * Usage:
 * - npm run pipeline-open                  # Scrape all listings
 * - npm run pipeline-open -- --max 10      # Limit to 10 pages (testing)
 */

import { chromium } from 'playwright';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { Listing } from './types';
import { geocodeAddress } from './geocode.js';
import { acceptCookiesAndPopups, navigateToNextPage, createBrowserContextOptions, BaseDaftScraper } from './scraper-utils.js';

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

// ============== Configuration ==============
const CONFIG = {
  baseUrl: 'https://www.daft.ie/property-for-sale/dublin?sort=publishDateDesc',
  nominatimUrl: 'http://localhost:8080/search',
  outputDir: './data/listings',
  delayMs: 5000, // Increased delay to avoid detection
  maxPages: 500, // For sale listings have fewer pages than sold
};

// ============== Utility Functions ==============

function getTodayFileName(): string {
  const today = new Date().toISOString().split('T')[0];
  return `listings-${today}.json`;
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// Dublin bounding box for geocode validation
const DUBLIN_BOUNDS = {
  minLat: 53.10,
  maxLat: 53.65,
  minLng: -6.60,
  maxLng: -5.95
};

// Counties that should NOT appear in Dublin data
const WRONG_COUNTIES = [
  'Kerry', 'Limerick', 'Cork', 'Galway', 'Clare', 'Mayo', 
  'Tipperary', 'Waterford', 'Wexford', 'Kilkenny', 'Carlow',
  'Laois', 'Offaly', 'Westmeath', 'Longford', 'Roscommon',
  'Sligo', 'Leitrim', 'Donegal', 'Cavan', 'Monaghan',
  'Louth', 'Meath', 'Kildare', 'Wicklow'
];

// Known Dublin areas for better geocode matching
const KNOWN_DUBLIN_AREAS = [
  'Malahide', 'Swords', 'Howth', 'Clontarf', 'Raheny', 'Sutton', 'Baldoyle',
  'Portmarnock', 'Donabate', 'Skerries', 'Balbriggan', 'Rush', 'Lusk',
  'Blackrock', 'Dun Laoghaire', 'Dalkey', 'Killiney', 'Sandycove', 'Monkstown',
  'Stillorgan', 'Foxrock', 'Cabinteely', 'Shankill', 'Ballybrack', 'Kilternan',
  'Rathmines', 'Ranelagh', 'Rathgar', 'Terenure', 'Rathfarnham', 'Dundrum',
  'Churchtown', 'Ballinteer', 'Sandyford', 'Stepaside', 'Leopardstown',
  'Drumcondra', 'Glasnevin', 'Phibsborough', 'Cabra', 'Finglas', 'Ballymun',
  'Santry', 'Beaumont', 'Coolock', 'Kilbarrack', 'Donnycarney', 'Artane',
  'Clondalkin', 'Lucan', 'Palmerstown', 'Ballyfermot', 'Inchicore', 'Crumlin',
  'Drimnagh', 'Walkinstown', 'Tallaght', 'Templeogue', 'Firhouse', 'Knocklyon',
  'Ringsend', 'Sandymount', 'Ballsbridge', 'Donnybrook', 'Booterstown',
  'Stoneybatter', 'Smithfield', 'IFSC', 'Docklands', 'Grand Canal',
  'Castleknock', 'Blanchardstown', 'Mulhuddart', 'Ongar', 'Tyrrelstown',
  'Robswall', 'Kinsealy', 'Feltrim', 'Balgriffin', 'Belmayne'
];

// ============== Types ==============


function cleanAddressForGeocode(addr: string): string {
  return addr
    .replace(/,?\s*Dublin,\s*Dublin$/i, ', Dublin')

// ============== Data Parsing ==============

function parsePrice(priceStr: string): number {
  // Handle various price formats: "€450,000", "450000", "€1.2m"
  const cleaned = priceStr.replace(/[€,\s]/g, '');

  // Handle millions (e.g., "1.2m" or "1.2M")
  const millionMatch = cleaned.match(/([\d.]+)m/i);
  if (millionMatch) {
    return Math.round(parseFloat(millionMatch[1]) * 1_000_000);
  }

  return parseInt(cleaned) || 0;
}

// ============== For Sale Scraper Class ==============

class ForSaleScraper extends BaseDaftScraper<Listing> {
  private processedAddresses = new Set<string>();

  constructor(baseUrl: string) {
    super(baseUrl);
  }

  protected async collectDataFromPage(pageNum: number): Promise<any[]> {
    const sourceUrl = pageNum === 1
      ? CONFIG.baseUrl
      : `${CONFIG.baseUrl}?pageSize=20&from=${(pageNum - 1) * 20}`;

    const rawData = await this.page.evaluate(() => {
      const results: any[] = [];
      const processedUrls = new Set<string>();

      // Structure: <a href="..."><div data-testid="card-container">...</div></a>
      // So we find the links first, then get the card-container inside
      const links = document.querySelectorAll('a[href*="/for-sale/"]');

      links.forEach((linkEl) => {
        try {
          const href = linkEl.getAttribute('href') || '';

          // Get the card container inside the link
          const card = linkEl.querySelector('[data-testid="card-container"]') || linkEl;

          // Must match property listing URL pattern
          const urlMatch = href.match(/\/for-sale\/([a-z0-9-]+)\/(\d+)/i);
          if (!urlMatch) return;

          // Skip if already processed this listing
          if (processedUrls.has(href)) return;
          processedUrls.add(href);

          // Get address from data-tracking="srp_address"
          const addressEl = card.querySelector('[data-tracking="srp_address"]');
          let address = addressEl?.textContent?.trim() || '';

          // Fallback to URL-based address if not found
          if (!address) {
            const addressSlug = urlMatch[1];
            address = addressSlug
              .split('-')
              .map((word: string) => {
                if (/^\d+$/.test(word)) return word;
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
              })
              .join(' ')
              .replace(/^(End Of Terrace House|Semi Detached House|Detached House|Terraced House|Apartment|Property|House|Bungalow|Duplex|Townhouse|Site|Studio)\s+/i, '')
              .trim();
          }

          // Clean up "Co Dublin" -> "Dublin" for better geocoding
          address = address.replace(/\bCo\b,?\s*Dublin/gi, 'Dublin');

          // List of Dublin areas to add commas before (comprehensive)
          const dublinAreas = [
            'Raheny', 'Clontarf', 'Sutton', 'Howth', 'Malahide', 'Swords', 'Blackrock',
            'Stillorgan', 'Dundrum', 'Tallaght', 'Clondalkin', 'Lucan', 'Castleknock',
            'Blanchardstown', 'Drumcondra', 'Glasnevin', 'Rathmines', 'Ranelagh',
            'Sandymount', 'Foxrock', 'Dun Laoghaire', 'Dalkey', 'Killiney', 'Portmarnock',
            'Skerries', 'Rush', 'Donabate', 'Balbriggan', 'Kilternan', 'Stepaside',
            'Sandyford', 'Churchtown', 'Terenure', 'Rathfarnham', 'Crumlin', 'Inchicore',
            'Kilmainham', 'Ballyfermot', 'Firhouse', 'Templeogue', 'Cabra', 'Phibsborough',
            'Santry', 'Beaumont', 'Coolock', 'Artane', 'Finglas', 'Ballymun', 'Ballsbridge',
            'Donnybrook', 'Ringsend', 'Irishtown', 'Booterstown', 'Monkstown', 'Leopardstown',
            'Clonsilla', 'Clonskeagh', 'Rathgar', 'Harold\'s Cross', 'Ballinteer', 'Knocklyon',
            'Ashtown', 'Cabinteely', 'Shankill', 'Ballybrack', 'Baldoyle', 'Kinsealy',
            'Balgriffin', 'Belmayne', 'Clongriffin', 'Donnycarney', 'Kilbarrack', 'Drimnagh',
            'Walkinstown', 'Palmerstown', 'Mulhuddart', 'Ongar', 'Tyrrelstown', 'Lusk',
            'Merrion', 'Dollymount', 'D6w', 'Chapelizod', 'Islandbridge', 'Marino'
          ];

          // For each known area, add a comma before it if not already preceded by comma
          for (const area of dublinAreas) {
            // Match area name that's not at start and not already after a comma
            const regex = new RegExp(`([^,])\\s+(${area})(?=\\s|$|,)`, 'gi');
            address = address.replace(regex, '$1, $2');
          }

          // Add comma before "Dublin X" pattern if not already there
          address = address.replace(/([^,])\s+(Dublin\s*\d*)(?:\s|$)/gi, '$1, $2');

          // Clean up double commas and extra spaces
          address = address.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').replace(/,\s*$/,'').trim();

          if (!address || address.length < 5) return;

          // Get price from data-tracking="srp_price" or fallback to card text
          let priceEl = card.querySelector('[data-tracking="srp_price"]');
          let priceText = priceEl?.textContent?.trim() || '';

          // Fallback: look for price in any element or card text
          if (!priceText) {
            const cardText = card.textContent || '';
            const priceMatch = cardText.match(/€([\d,]+)/);
            priceText = priceMatch ? `€${priceMatch[1]}` : '';
          }

          const priceMatch = priceText.match(/€([\d,]+)/);
          if (!priceMatch) return;

          // Get metadata from data-tracking="srp_meta" or fallback to card text
          let metaEl = card.querySelector('[data-tracking="srp_meta"]');
          let metaText = metaEl?.textContent || '';

          // Fallback: use full card text for metadata extraction
          if (!metaText) {
            metaText = card.textContent || '';
          }

          // Parse metadata: "3 Bed · 1 Bath · 90 m² · End of Terrace"
          const bedsMatch = metaText.match(/(\d+)\s*Bed/i);
          const bathsMatch = metaText.match(/(\d+)\s*Bath/i);
          const areaMatch = metaText.match(/([\d.]+)\s*m²/);
          const typeMatch = metaText.match(/(Semi-D|Detached|Apartment|Terrace|Bungalow|Duplex|Townhouse|End of Terrace|Site|Studio)/i);

          // BER rating might be in a separate element or in the card
          const berEl = card.querySelector('[class*="BER"], [class*="ber"]');
          let berRating = berEl?.textContent?.match(/([A-G]\d?)/i)?.[1] || null;
          if (!berRating) {
            const cardText = card.textContent || '';
            const berMatch = cardText.match(/BER[:\s]*([A-G]\d?)/i);
            berRating = berMatch ? berMatch[1] : null;
          }

          // Clean up sourceUrl - avoid double prefix
          const cleanUrl = href.startsWith('http') ? href : `https://www.daft.ie${href}`;

          results.push({
            address,
            askingPrice: priceMatch[1],
            beds: bedsMatch ? bedsMatch[1] : null,
            baths: bathsMatch ? bathsMatch[1] : null,
            area: areaMatch ? areaMatch[1] : null,
            propertyType: typeMatch ? typeMatch[1] : '',
            berRating: berRating ? berRating.toUpperCase() : null,
            sourceUrl: cleanUrl,
          });
        } catch (e) {
          // Skip problematic cards
        }
      });

      return results;
    }, sourceUrl);

    return rawData;
  }

  protected async processItem(rawItem: any): Promise<Listing | null> {
    // Skip duplicates (by address)
    if (this.processedAddresses.has(rawItem.address)) return null;

    // Geocode with retry
    const geo = await retryWithBackoff(
      () => geocodeAddress(rawItem.address),
      2,
      500,
      `Geocoding ${rawItem.address.substring(0, 30)}...`
    ).catch(() => null);

    // Build clean listing
    const askingPrice = parsePrice(rawItem.askingPrice);
    const areaSqm = rawItem.area ? parseFloat(rawItem.area) : null;

    const listing: Listing = {
      address: rawItem.address,
      askingPrice,
      beds: rawItem.beds ? parseInt(rawItem.beds) : null,
      baths: rawItem.baths ? parseInt(rawItem.baths) : null,
      areaSqm,
      propertyType: rawItem.propertyType || '',
      berRating: rawItem.berRating || null,
      sourceUrl: rawItem.sourceUrl,
      sourcePage: this.currentPage,
      latitude: geo?.latitude || null,
      longitude: geo?.longitude || null,
      eircode: geo?.eircode || null,
      nominatimAddress: geo?.nominatimAddress || null,
      pricePerSqm: (askingPrice && areaSqm) ? Math.round(askingPrice / areaSqm) : null,
      scrapedAt: new Date().toISOString(),
    };

    this.processedAddresses.add(rawItem.address);

    const geoStatus = geo ? `✓ ${geo.eircode || 'geocoded'}` : '✗';
    console.log(`  + ${listing.address.substring(0, 40)}... ${geoStatus}`);

    return listing;
  }

  async run(maxPages?: number): Promise<Listing[]> {
    await this.initializeBrowser();
    await this.navigateToInitialPage();

    const listings = await this.runScrapingLoop(maxPages || CONFIG.maxPages);

    await this.cleanup();
    return listings;
  }
}

// ============== Main Pipeline ==============

async function runPipeline() {
  console.log('=== For Sale Listings Pipeline ===\n');
  console.log(`Target: ${CONFIG.baseUrl}\n`);

  // Parse command line args
  const args = process.argv.slice(2);
  const maxPagesArg = args.find(a => a.startsWith('--max'));
  const maxPages = maxPagesArg ? parseInt(args[args.indexOf(maxPagesArg) + 1]) : CONFIG.maxPages;

  // Check Nominatim
  console.log('Checking Nominatim...');
  try {
    const testResponse = await fetch(`${CONFIG.nominatimUrl}?q=Dublin&format=json&limit=1`);
    if (!testResponse.ok) throw new Error('Nominatim not responding');
    console.log('✓ Nominatim is ready\n');
  } catch {
    console.error('✗ Nominatim not running. Start with: docker start nominatim');
    process.exit(1);
  }

  // Use the new ForSaleScraper class
  const scraper = new ForSaleScraper(CONFIG.baseUrl);

  try {
    const listings = await scraper.run(maxPages);

    // Save final results
    ensureDir(CONFIG.outputDir);
    const outputFile = join(CONFIG.outputDir, getTodayFileName());
    writeFileSync(outputFile, JSON.stringify(listings, null, 2));

    // Final stats
    const withCoords = listings.filter(l => l.latitude && l.longitude).length;
    const geocodeRate = listings.length > 0 ? Math.round(withCoords / listings.length * 100) : 0;

    console.log(`\n=== Pipeline Complete ===`);
    console.log(`Total listings: ${listings.length}`);
    console.log(`With coordinates: ${withCoords} (${geocodeRate}%)`);
    console.log(`Output: ${CONFIG.outputDir}/${getTodayFileName()}`);
  } catch (error) {
    console.error('Error during scraping:', error);
  }
}

// ============== Main Entry Point ==============
runPipeline().catch(console.error);
}
