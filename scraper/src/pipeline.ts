/**
 * Unified Pipeline: Scrape + Geocode + Clean
 * 
 * Uses Next button clicking for pagination (direct URL nav doesn't work reliably).
 * Geocodes each property with local Nominatim, cleans data.
 * 
 * Prerequisites:
 * - Docker running with Nominatim: docker start nominatim
 * 
 * Usage:
 * - npm run pipeline                  # Start/resume scraping
 * - npm run pipeline -- --start 100   # Start from specific page
 * - npm run pipeline -- --cleanup     # Fix bad geocodes in existing data
 */

import { chromium } from 'playwright';
import { writeFileSync, existsSync, readFileSync } from 'fs';

// ============== Configuration ==============
const CONFIG = {
  baseUrl: 'https://www.daft.ie/sold-properties/dublin',
  nominatimUrl: 'http://localhost:8080/search',
  outputFile: './data/properties.json',
  delayMs: 2000,
  maxPages: 10277,
};

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
interface Property {
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

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

// ============== Geocoding Functions ==============

function cleanAddressForGeocode(addr: string): string {
  return addr
    .replace(/,?\s*Dublin,\s*Dublin$/i, ', Dublin')
    .replace(/,?\s*Dublin\s*\d+,\s*Dublin\s*\d+/gi, ', Dublin')
    .replace(/,?\s*Dublin\s*\d+,\s*Dublin$/gi, ', Dublin')
    .replace(/^Apt\.?\s*\d+[\s,\-]*/i, '')
    .replace(/^Apartment\.?\s*\d+[\s,\-]*/i, '')
    .replace(/^Unit\.?\s*\d+[\s,\-]*/i, '')
    .replace(/,\s*,/g, ',')
    .trim();
}

function getAddressVariations(addr: string): string[] {
  const cleaned = cleanAddressForGeocode(addr);
  const variations: string[] = [];
  const parts = cleaned.split(',').map(p => p.trim()).filter(p => p);
  
  variations.push(cleaned + ', Ireland');
  
  if (parts.length >= 4) {
    variations.push(`${parts[0]}, ${parts.slice(-2).join(', ')}, Ireland`);
  }
  if (parts.length >= 3) {
    variations.push(`${parts[0]}, ${parts[parts.length - 2]}, Ireland`);
  }
  if (parts.length >= 1) {
    variations.push(`${parts[0]}, Ireland`);
  }
  
  const withoutNumber = parts[0]?.replace(/^\d+[a-z]?\s+/i, '');
  if (withoutNumber && withoutNumber !== parts[0] && parts.length >= 2) {
    variations.push(`${withoutNumber}, ${parts[parts.length - 2]}, Ireland`);
  }
  
  if (parts.length >= 2) {
    variations.push(`${parts.slice(-2).join(', ')}, Ireland`);
  }
  
  return [...new Set(variations)];
}

function extractEircode(displayName: string): string | null {
  const match = displayName.match(/[A-Z]\d{2}\s?[A-Z0-9]{4}/i);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Check if coordinates are within Dublin bounds
 */
function isInDublinBounds(lat: number, lng: number): boolean {
  return lat >= DUBLIN_BOUNDS.minLat && lat <= DUBLIN_BOUNDS.maxLat &&
         lng >= DUBLIN_BOUNDS.minLng && lng <= DUBLIN_BOUNDS.maxLng;
}

/**
 * Check if nominatim result is in a wrong county
 */
function isWrongCounty(displayName: string): boolean {
  for (const county of WRONG_COUNTIES) {
    if (displayName.includes(`County ${county}`) || displayName.includes(`, ${county},`)) {
      return true;
    }
  }
  return false;
}

/**
 * Extract Dublin areas mentioned in an address
 */
function extractAreasFromAddress(address: string): string[] {
  const areas: string[] = [];
  
  // Dublin postal codes
  const dublinMatch = address.match(/Dublin\s*(\d+)/gi);
  if (dublinMatch) {
    dublinMatch.forEach(m => areas.push(m.replace(/\s+/g, ' ')));
  }
  
  // Known Dublin areas
  KNOWN_DUBLIN_AREAS.forEach(area => {
    if (address.toLowerCase().includes(area.toLowerCase())) {
      areas.push(area);
    }
  });
  
  return areas;
}

/**
 * Validate a geocode result - must be in Dublin bounds and mention Dublin
 */
function validateGeocodeResult(result: NominatimResult, originalAddress: string): {
  latitude: number;
  longitude: number;
  eircode: string | null;
  nominatimAddress: string;
} | null {
  const lat = parseFloat(result.lat);
  const lng = parseFloat(result.lon);
  const displayName = result.display_name || '';
  
  // Must be in Dublin bounds
  if (!isInDublinBounds(lat, lng)) {
    return null;
  }
  
  // Must mention Dublin (or Fingal/Dún Laoghaire which are Dublin county)
  const isDublinArea = displayName.includes('Dublin') || 
                       displayName.includes('Fingal') ||
                       displayName.includes('Dún Laoghaire');
  if (!isDublinArea) {
    return null;
  }
  
  // Must not be in wrong county
  if (isWrongCounty(displayName)) {
    return null;
  }
  
  // Skip generic "Dublin, County Dublin, Leinster" results
  if (displayName === 'Dublin, County Dublin, Leinster, Éire / Ireland') {
    return null;
  }
  
  return {
    latitude: lat,
    longitude: lng,
    eircode: extractEircode(displayName),
    nominatimAddress: displayName,
  };
}

async function geocodeAddress(address: string): Promise<{
  latitude: number;
  longitude: number;
  eircode: string | null;
  nominatimAddress: string;
} | null> {
  const variations = getAddressVariations(address);
  
  for (const query of variations) {
    try {
      // Request multiple results to find best Dublin match
      const url = `${CONFIG.nominatimUrl}?q=${encodeURIComponent(query)}&format=json&countrycodes=ie&limit=3`;
      const response = await fetch(url);
      if (!response.ok) continue;
      
      const results: NominatimResult[] = await response.json();
      
      // Check each result for valid Dublin geocode
      for (const result of results) {
        const validated = validateGeocodeResult(result, address);
        if (validated) {
          return validated;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ============== Data Cleaning ==============

function parsePrice(priceStr: string): number {
  return parseInt(priceStr.replace(/,/g, '')) || 0;
}

function parseDate(dateStr: string): string {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

// ============== Resume Logic ==============

function getRecordedPages(properties: Property[]): Set<number> {
  const pages = new Set<number>();
  for (const prop of properties) {
    if (prop.sourcePage) {
      pages.add(prop.sourcePage);
    }
  }
  return pages;
}

function findLastPage(properties: Property[]): number {
  let maxPage = 0;
  for (const prop of properties) {
    if (prop.sourcePage && prop.sourcePage > maxPage) {
      maxPage = prop.sourcePage;
    }
  }
  return maxPage;
}

// ============== Main Pipeline ==============

async function runPipeline() {
  console.log('=== Property Pipeline: Scrape + Geocode + Clean ===\n');
  
  // Load existing data
  let properties: Property[] = [];
  if (existsSync(CONFIG.outputFile)) {
    try {
      properties = JSON.parse(readFileSync(CONFIG.outputFile, 'utf-8'));
      console.log(`Loaded ${properties.length} existing properties`);
    } catch {
      console.log('Starting fresh');
    }
  }
  
  // Get recorded pages for fast-forward
  const recordedPages = getRecordedPages(properties);
  const lastPage = findLastPage(properties);
  
  console.log(`Recorded pages: ${recordedPages.size}`);
  console.log(`Last recorded page: ${lastPage}`);
  console.log(`Target: ${CONFIG.maxPages} pages`);
  console.log(`Will fast-forward through recorded pages\n`);
  
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
  
  // Launch browser (headless doesn't work with Daft.ie)
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Always start from page 1 (can't navigate directly to pages > ~100)
  let currentPage = 1;
  
  try {
    // First: go to main page and accept cookies
    console.log('Going to page 1...');
    await page.goto(CONFIG.baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
    
    try {
      const cookieBtn = page.locator('button:has-text("Accept All")');
      if (await cookieBtn.isVisible({ timeout: 3000 })) {
        await cookieBtn.click();
        console.log('Cookies accepted');
        await page.waitForTimeout(1000);
      }
    } catch {}
    
    // Main loop - use Next button for navigation
    while (currentPage <= CONFIG.maxPages) {
      // Check if this page is already recorded
      if (recordedPages.has(currentPage)) {
        // Fast-forward: skip scraping, just click Next
        console.log(`Page ${currentPage} already recorded, skipping...`);
        
        // Wait for page to load before clicking Next
        await page.waitForSelector('[data-testid="card-container"]', { timeout: 15000 });
        
        // Click Next - scroll to bottom first to ensure button is in view
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(300);
        
        const nextBtn = page.locator('[data-testid="next-page-link"]');
        if (await nextBtn.isVisible({ timeout: 3000 })) {
          await nextBtn.click();
          currentPage++;
          await page.waitForTimeout(500); // Shorter delay for fast-forward
        } else {
          console.log('No more pages');
          break;
        }
        continue;
      }
      
      // This page needs scraping
      console.log(`\n--- Page ${currentPage}/${CONFIG.maxPages} ---`);
      
      // Wait for cards
      await page.waitForSelector('[data-testid="card-container"]', { timeout: 15000 });
      
      // Build source URL
      const sourceUrl = currentPage === 1 
        ? CONFIG.baseUrl 
        : `${CONFIG.baseUrl}?page=${currentPage}`;
      
      // Extract raw data
      const rawData = await page.evaluate((sourceUrl) => {
        const cards = document.querySelectorAll('[data-testid="card-container"]');
        const results: any[] = [];
        
        cards.forEach((card) => {
          const text = card.textContent || '';
          
          const dateMatch = text.match(/SOLD (\d{2}\/\d{2}\/\d{4})/);
          // Match prices that end with ,000 pattern (Irish prices always end in 000)
          const soldMatch = text.match(/Sold:\s*€([\d,]+,\d{3})/);
          const askingMatch = text.match(/Asking:\s*€([\d,]+,\d{3})/);
          
          if (!dateMatch || !soldMatch || !askingMatch) return;
          
          const dateIdx = text.indexOf(dateMatch[0]);
          const soldIdx = text.indexOf('Sold:');
          const address = text.substring(dateIdx + dateMatch[0].length, soldIdx).trim();
          
          if (!address || address.length < 10) return;
          
          const bedsMatch = text.match(/(\d+)\s*Bed/);
          const bathsMatch = text.match(/(\d+)\s*Bath/);
          const areaMatch = text.match(/([\d.]+)\s*m²/);
          const typeMatch = text.match(/(Semi-D|Detached|Apartment|Terrace|Bungalow|Duplex|Townhouse|End of Terrace|Site)/i);
          
          results.push({
            soldDate: dateMatch[1],
            address,
            soldPrice: soldMatch[1],
            askingPrice: askingMatch[1],
            beds: bedsMatch ? bedsMatch[1] : null,
            baths: bathsMatch ? bathsMatch[1] : null,
            area: areaMatch ? areaMatch[1] : null,
            propertyType: typeMatch ? typeMatch[1] : '',
            sourceUrl
          });
        });
        
        return results;
      }, sourceUrl);
      
      console.log(`Found ${rawData.length} properties`);
      
      // Process each: geocode + clean
      let newCount = 0;
      for (const raw of rawData) {
        // Skip duplicates
        const exists = properties.some(p => 
          p.address === raw.address && p.soldDate === parseDate(raw.soldDate)
        );
        if (exists) continue;
        
        // Geocode
        const geo = await geocodeAddress(raw.address);
        
        // Build clean property
        const soldPrice = parsePrice(raw.soldPrice);
        const askingPrice = parsePrice(raw.askingPrice);
        const areaSqm = raw.area ? parseFloat(raw.area) : null;
        
        const property: Property = {
          address: raw.address,
          soldDate: parseDate(raw.soldDate),
          soldPrice,
          askingPrice,
          overUnderPercent: askingPrice > 0 
            ? Math.round(((soldPrice - askingPrice) / askingPrice) * 10000) / 100 
            : 0,
          beds: raw.beds ? parseInt(raw.beds) : null,
          baths: raw.baths ? parseInt(raw.baths) : null,
          areaSqm,
          propertyType: raw.propertyType,
          sourceUrl: raw.sourceUrl,
          sourcePage: currentPage,
          latitude: geo?.latitude || null,
          longitude: geo?.longitude || null,
          eircode: geo?.eircode || null,
          nominatimAddress: geo?.nominatimAddress || null,
          pricePerSqm: (soldPrice && areaSqm) ? Math.round(soldPrice / areaSqm) : null,
          scrapedAt: new Date().toISOString(),
        };
        
        properties.push(property);
        newCount++;
        
        const geoStatus = geo ? `✓ ${geo.eircode || 'geocoded'}` : '✗';
        console.log(`  +${property.address.substring(0, 35)}... ${geoStatus}`);
      }
      
      // Save after each page
      writeFileSync(CONFIG.outputFile, JSON.stringify(properties, null, 2));
      console.log(`Saved: ${properties.length} total (+${newCount} new)`);
      
      // Click Next to go to next page
      try {
        // Scroll to bottom to ensure Next button is in view
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);
        
        const nextBtn = page.locator('[data-testid="next-page-link"]');
        if (await nextBtn.isVisible({ timeout: 3000 })) {
          await nextBtn.click();
          currentPage++;
          console.log(`Waiting ${CONFIG.delayMs}ms...`);
          await page.waitForTimeout(CONFIG.delayMs);
        } else {
          console.log('\nNo more pages (Next button not found)');
          break;
        }
      } catch {
        console.log('\nReached last page');
        break;
      }
    }
    
    console.log(`\n=== Pipeline Complete ===`);
    console.log(`Total: ${properties.length} properties`);
    console.log(`Last page: ${currentPage}`);
    
  } catch (error) {
    console.error('Error:', error);
    console.log(`Progress saved: ${properties.length} properties`);
  } finally {
    await browser.close();
  }
}

// ============== Cleanup Mode ==============

/**
 * Fix bad geocodes in existing data
 * - Re-geocodes properties outside Dublin bounds
 * - Re-geocodes properties with wrong county matches
 * - Re-geocodes properties missing coordinates
 */
async function runCleanup() {
  console.log('=== Geocode Cleanup Mode ===\n');
  
  // Load existing data
  if (!existsSync(CONFIG.outputFile)) {
    console.error('No data file found at', CONFIG.outputFile);
    process.exit(1);
  }
  
  const properties: Property[] = JSON.parse(readFileSync(CONFIG.outputFile, 'utf-8'));
  console.log(`Loaded ${properties.length} properties`);
  
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
  
  // Find properties needing fixes
  const needsFixing = properties.filter(p => {
    // Missing coordinates
    if (!p.latitude || !p.longitude) return true;
    
    // Outside Dublin bounds
    if (!isInDublinBounds(p.latitude, p.longitude)) return true;
    
    // Nominatim result doesn't mention Dublin
    if (p.nominatimAddress && !p.nominatimAddress.includes('Dublin') && 
        !p.nominatimAddress.includes('Fingal') && !p.nominatimAddress.includes('Dún Laoghaire')) {
      return true;
    }
    
    // Matched to wrong county
    if (p.nominatimAddress && isWrongCounty(p.nominatimAddress)) return true;
    
    // Generic Dublin result
    if (p.nominatimAddress === 'Dublin, County Dublin, Leinster, Éire / Ireland') return true;
    
    return false;
  });
  
  console.log(`Properties needing fix: ${needsFixing.length}`);
  
  if (needsFixing.length === 0) {
    console.log('All properties have valid geocodes!');
    return;
  }
  
  let fixed = 0;
  let cleared = 0;
  let processed = 0;
  
  for (const property of needsFixing) {
    processed++;
    
    if (processed % 100 === 0) {
      console.log(`Progress: ${processed}/${needsFixing.length} (fixed: ${fixed}, cleared: ${cleared})`);
      // Save checkpoint
      writeFileSync(CONFIG.outputFile, JSON.stringify(properties, null, 2));
    }
    
    // Try to re-geocode
    const geo = await geocodeAddress(property.address);
    
    if (geo) {
      property.latitude = geo.latitude;
      property.longitude = geo.longitude;
      property.eircode = geo.eircode;
      property.nominatimAddress = geo.nominatimAddress;
      fixed++;
      console.log(`✓ Fixed: ${property.address.substring(0, 50)}...`);
    } else {
      // Clear bad data
      property.latitude = null;
      property.longitude = null;
      property.nominatimAddress = null;
      cleared++;
      
      if (cleared <= 20) {
        console.log(`✗ Cleared: ${property.address.substring(0, 50)}...`);
      }
    }
  }
  
  // Final save
  writeFileSync(CONFIG.outputFile, JSON.stringify(properties, null, 2));
  
  // Report stats
  const withCoords = properties.filter(p => p.latitude && p.longitude).length;
  const inDublin = properties.filter(p => 
    p.latitude && p.longitude && isInDublinBounds(p.latitude, p.longitude)
  ).length;
  
  console.log(`\n=== Cleanup Complete ===`);
  console.log(`Processed: ${processed}`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Cleared: ${cleared}`);
  console.log(`Total with coords: ${withCoords}`);
  console.log(`In Dublin bounds: ${inDublin}`);
  console.log(`Coverage: ${Math.round(inDublin / properties.length * 100)}%`);
}

// ============== Main Entry Point ==============

const args = process.argv.slice(2);
if (args.includes('--cleanup')) {
  runCleanup().catch(console.error);
} else {
  runPipeline().catch(console.error);
}
