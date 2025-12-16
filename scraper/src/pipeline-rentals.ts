/**
 * Rental Listings Pipeline
 * 
 * Scrapes active rental listings from Daft.ie Dublin
 * Extracts: monthly rent, beds, baths, property type, BER, area
 * Geocodes using local Nominatim
 * 
 * Usage: npm run scrape:rentals
 *        npm run scrape:rentals -- --max 50
 */

import { chromium, Page } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';

// ============== Types ==============

interface RentalListing {
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
const OUTPUT_FILE = './data/rentals.json';
const DELAY_MS = 2000;

// Parse command line args
const args = process.argv.slice(2);
const maxIndex = args.indexOf('--max');
const MAX_LISTINGS = maxIndex !== -1 ? parseInt(args[maxIndex + 1]) : Infinity;

// ============== Geocoding ==============

async function checkNominatim(): Promise<boolean> {
  try {
    const response = await fetch(`${NOMINATIM_URL}/status`);
    return response.ok;
  } catch {
    return false;
  }
}

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

function cleanAddressForGeocoding(address: string): string {
  let cleaned = address
    .replace(/([AD]\d{2}\s?[A-Z0-9]{4})/gi, '')
    .replace(/,\s*,/g, ',')
    .replace(/,\s*$/g, '')
    .replace(/^\s*,/g, '')
    .trim();
  
  if (!cleaned.toLowerCase().includes('dublin')) {
    cleaned += ', Dublin, Ireland';
  } else if (!cleaned.toLowerCase().includes('ireland')) {
    cleaned += ', Ireland';
  }
  
  return cleaned;
}

function getAddressVariations(address: string): string[] {
  const variations: string[] = [];
  const cleaned = cleanAddressForGeocoding(address);
  
  variations.push(cleaned);
  
  // Try without house number/name at start
  const withoutPrefix = cleaned.replace(/^[\d\w\s]+,\s*/, '');
  if (withoutPrefix !== cleaned) {
    variations.push(withoutPrefix);
  }
  
  // Try with just area + Dublin
  const parts = cleaned.split(',').map(p => p.trim());
  if (parts.length >= 3) {
    const dublinPart = parts.find(p => p.toLowerCase().includes('dublin'));
    const areaPart = parts[parts.length - 3];
    if (dublinPart && areaPart) {
      variations.push(`${areaPart}, ${dublinPart}, Ireland`);
    }
  }
  
  return [...new Set(variations)];
}

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number; display: string } | null> {
  const variations = getAddressVariations(address);
  
  for (const variation of variations) {
    try {
      const url = `${NOMINATIM_URL}/search?q=${encodeURIComponent(variation)}&format=json&limit=1&countrycodes=ie`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        
        // Validate it's in Dublin area
        if (lat >= 53.2 && lat <= 53.5 && lon >= -6.5 && lon <= -6.0) {
          return { lat, lon, display: result.display_name };
        }
      }
    } catch (error) {
      // Continue to next variation
    }
    
    await new Promise(r => setTimeout(r, 100));
  }
  
  return null;
}

// ============== Scraping ==============

async function extractListingsFromPage(page: Page, pageNum: number): Promise<RentalListing[]> {
  return await page.evaluate((pageNumber) => {
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
            sourcePage: pageNumber,
            latitude: null,
            longitude: null,
            eircode: null,
            nominatimAddress: null,
            rentPerSqm: null,
            rentPerBed: null,
            dublinPostcode: null,
            scrapedAt: new Date().toISOString(),
          });
        }
      } catch (e) {
        // Skip problematic cards
      }
    });
    
    return listings;
  }, pageNum);
}

async function scrapeRentals(): Promise<void> {
  console.log('=== Rental Listings Pipeline ===\n');
  console.log(`Target: ${BASE_URL}`);
  if (MAX_LISTINGS !== Infinity) {
    console.log(`Max listings: ${MAX_LISTINGS}`);
  }
  
  // Check Nominatim
  console.log('\nChecking Nominatim...');
  const nominatimReady = await checkNominatim();
  if (!nominatimReady) {
    console.error('❌ Nominatim not available at', NOMINATIM_URL);
    console.error('   Start it with: docker run -p 8080:8080 mediagis/nominatim:4.4');
    process.exit(1);
  }
  console.log('✓ Nominatim is ready\n');
  
  // Load existing data
  let allListings: RentalListing[] = [];
  if (existsSync(OUTPUT_FILE)) {
    try {
      allListings = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'));
      console.log(`Loaded ${allListings.length} existing rentals`);
    } catch {
      allListings = [];
    }
  }
  
  const existingUrls = new Set(allListings.map(l => l.sourceUrl));
  
  // Launch browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  const page = await context.newPage();
  
  let pageNum = 1;
  let newListings = 0;
  let consecutiveEmpty = 0;
  
  try {
    while (newListings < MAX_LISTINGS) {
      const url = pageNum === 1 ? BASE_URL : `${BASE_URL}&pageNo=${pageNum}`;
      console.log(`Going to page ${pageNum}...`);
      
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1500);
      
      const pageListings = await extractListingsFromPage(page, pageNum);
      
      if (pageListings.length === 0) {
        consecutiveEmpty++;
        if (consecutiveEmpty >= 3) {
          console.log('No more listings found');
          break;
        }
      } else {
        consecutiveEmpty = 0;
      }
      
      // Process new listings
      for (const listing of pageListings) {
        if (existingUrls.has(listing.sourceUrl)) continue;
        if (newListings >= MAX_LISTINGS) break;
        
        // Extract eircode and postcode
        listing.eircode = extractEircode(listing.address);
        listing.dublinPostcode = extractDublinPostcode(listing.address);
        
        // Geocode
        const geo = await geocodeAddress(listing.address);
        if (geo) {
          listing.latitude = geo.lat;
          listing.longitude = geo.lon;
          listing.nominatimAddress = geo.display;
        }
        
        // Calculate per-unit metrics
        if (listing.areaSqm && listing.areaSqm > 0) {
          listing.rentPerSqm = Math.round((listing.monthlyRent / listing.areaSqm) * 100) / 100;
        }
        if (listing.beds && listing.beds > 0) {
          listing.rentPerBed = Math.round(listing.monthlyRent / listing.beds);
        }
        
        allListings.push(listing);
        existingUrls.add(listing.sourceUrl);
        newListings++;
        
        const geoStatus = geo ? '✓' : '✗';
        console.log(`  [${geoStatus}] €${listing.monthlyRent}/mo - ${listing.beds || '?'}bed - ${listing.address.substring(0, 50)}...`);
      }
      
      // Save progress
      writeFileSync(OUTPUT_FILE, JSON.stringify(allListings, null, 2));
      
      // Check for next page
      const hasNextPage = await page.$('[data-testid="next-page-link"]');
      if (!hasNextPage) {
        console.log('Reached last page');
        break;
      }
      
      pageNum++;
      await page.waitForTimeout(DELAY_MS);
    }
  } finally {
    await browser.close();
  }
  
  // Generate summary
  const geocoded = allListings.filter(l => l.latitude).length;
  const geocodeRate = ((geocoded / allListings.length) * 100).toFixed(1);
  
  console.log('\n=== Summary ===');
  console.log(`Total rentals: ${allListings.length}`);
  console.log(`New this run: ${newListings}`);
  console.log(`Geocoded: ${geocoded} (${geocodeRate}%)`);
  console.log(`Output: ${OUTPUT_FILE}`);
  
  // Generate area summary
  generateAreaSummary(allListings);
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

