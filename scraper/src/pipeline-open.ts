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
import { writeFileSync, existsSync, readFileSync } from 'fs';
import type { Listing } from './types';

// ============== Configuration ==============
const CONFIG = {
  baseUrl: 'https://www.daft.ie/property-for-sale/dublin?sort=publishDateDesc',
  nominatimUrl: 'http://localhost:8080/search',
  outputFile: './data/listings.json',
  delayMs: 2000,
  maxPages: 500, // For sale listings have fewer pages than sold
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
  let cleaned = cleanAddressForGeocode(addr);
  
  // Remove eircodes from the address - they confuse Nominatim
  // Eircodes are 7 characters like D01VF78, A94X32X
  cleaned = cleaned.replace(/,?\s*[A-Z]\d{2}\s?[A-Z0-9]{4}\s*$/i, '').trim();
  cleaned = cleaned.replace(/,?\s*[A-Z]\d{2}\s?[A-Z0-9]{4}\s*,/gi, ',').trim();
  
  const variations: string[] = [];
  const parts = cleaned.split(',').map(p => p.trim()).filter(p => p);
  
  // Full address with Ireland
  variations.push(cleaned + ', Ireland');
  
  // Try with Dublin county explicit
  if (!cleaned.toLowerCase().includes('county dublin')) {
    variations.push(cleaned + ', County Dublin, Ireland');
  }
  
  // Skip middle parts (keep first + last two)
  if (parts.length >= 4) {
    variations.push(`${parts[0]}, ${parts.slice(-2).join(', ')}, Ireland`);
  }
  
  // First part + second-to-last + Ireland
  if (parts.length >= 3) {
    variations.push(`${parts[0]}, ${parts[parts.length - 2]}, Ireland`);
    variations.push(`${parts[0]}, ${parts[parts.length - 2]}, County Dublin, Ireland`);
  }
  
  // Just first part + Ireland (if street-like)
  if (parts.length >= 1) {
    variations.push(`${parts[0]}, Ireland`);
  }
  
  // Try without house number (street name only)
  const withoutNumber = parts[0]?.replace(/^\d+[a-z]?\s+/i, '');
  if (withoutNumber && withoutNumber !== parts[0] && parts.length >= 2) {
    variations.push(`${withoutNumber}, ${parts[parts.length - 2]}, Ireland`);
    variations.push(`${withoutNumber}, ${parts[parts.length - 2]}, Dublin, Ireland`);
  }
  
  // Try removing directional suffixes (West, East, North, South, Upper, Lower)
  const withoutDirection = parts[0]?.replace(/\s+(West|East|North|South|Upper|Lower)$/i, '');
  if (withoutDirection && withoutDirection !== parts[0] && parts.length >= 2) {
    variations.push(`${withoutDirection}, ${parts[parts.length - 2]}, Ireland`);
    variations.push(`${withoutDirection}, ${parts[parts.length - 2]}, Dublin, Ireland`);
  }
  
  // ** Try removing house name prefixes **
  // House names: "Greentops Bray Road" -> try "Bray Road"
  if (parts[0]) {
    const firstPart = parts[0];
    const words = firstPart.split(' ');
    
    // Try removing first word if it's a potential house name (capitalized, no numbers)
    if (words.length >= 2 && /^[A-Z][a-z]+$/.test(words[0])) {
      const withoutFirst = words.slice(1).join(' ');
      if (withoutFirst.length > 3) {
        variations.push(`${withoutFirst}, ${parts.slice(1).join(', ')}, Ireland`);
        if (parts.length >= 2) {
          variations.push(`${withoutFirst}, ${parts[parts.length - 1]}, Ireland`);
        }
      }
    }
    
    // Try removing first two words if they look like "House Name" or "Name House"
    if (words.length >= 3) {
      const withoutFirstTwo = words.slice(2).join(' ');
      if (withoutFirstTwo.length > 3) {
        variations.push(`${withoutFirstTwo}, ${parts.slice(1).join(', ')}, Ireland`);
      }
    }
    
    // Try removing everything before a number (house names rarely have numbers)
    const numberIdx = words.findIndex(w => /^\d+[a-z]?$/.test(w));
    if (numberIdx > 0) {
      const fromNumber = words.slice(numberIdx).join(' ');
      variations.push(`${fromNumber}, ${parts.slice(1).join(', ')}, Ireland`);
      if (parts.length >= 2) {
        variations.push(`${fromNumber}, ${parts[parts.length - 1]}, Ireland`);
      }
    }
    
    // Try removing everything before common road/street words
    const roadIdx = words.findIndex(w => /^(Road|Street|Lane|Avenue|Drive|Park|Grove|Court|Close|Way|Place|Terrace|Square|Gardens|Crescent|Rise|View|Hill|Green|Lawn|Manor|Hall|Mews)$/i.test(w));
    if (roadIdx > 0) {
      const fromStreetName = words.slice(roadIdx - 1).join(' ');
      variations.push(`${fromStreetName}, ${parts.slice(1).join(', ')}, Ireland`);
    }
  }
  
  // Try skipping the first part entirely if it looks like just a house name
  if (parts.length >= 2) {
    variations.push(`${parts.slice(1).join(', ')}, Ireland`);
  }
  
  // ** NEW: Try area + Dublin combinations **
  // For "Apartment 21, Greeg Court, Dublin 1" -> try "Dublin 1, Ireland"
  // For "1 Carlton Mews, Shelbourne Avenue, Ballsbridge, Dublin 4" -> try "Ballsbridge, Dublin 4, Ireland"
  const dublinMatch = cleaned.match(/Dublin\s*\d+/i);
  if (dublinMatch && parts.length >= 2) {
    // Try second-to-last part + Dublin
    variations.push(`${parts[parts.length - 2]}, ${dublinMatch[0]}, Ireland`);
    // Try just area + Dublin (for places like Ballsbridge)
    for (const part of parts) {
      if (part !== dublinMatch[0] && !/^\d/.test(part) && !/^Apartment/i.test(part)) {
        variations.push(`${part}, ${dublinMatch[0]}, Ireland`);
        variations.push(`${part}, Dublin, Ireland`);
      }
    }
  }
  
  // ** NEW: Try street name without number **
  // "1 Carlton Mews" -> "Carlton Mews"
  if (parts[0] && /^\d+[a-z]?\s+/i.test(parts[0])) {
    const streetOnly = parts[0].replace(/^\d+[a-z]?\s+/i, '');
    if (streetOnly.length > 3) {
      variations.push(`${streetOnly}, ${parts.slice(1).join(', ')}, Ireland`);
      if (parts.length >= 2) {
        variations.push(`${streetOnly}, ${parts[parts.length - 1]}, Ireland`);
      }
    }
  }
  
  // ** NEW: Handle "HouseName, Number Street" pattern **
  // "Lincolnswood, 39 Kerrymount Rise, Foxrock" -> "39 Kerrymount Rise, Foxrock"
  if (parts.length >= 2 && /^\d+[a-z]?\s+/i.test(parts[1])) {
    // Second part starts with a number - likely the actual street address
    variations.push(`${parts.slice(1).join(', ')}, Ireland`);
    variations.push(`${parts[1]}, ${parts.slice(2).join(', ')}, Ireland`);
  }
  
  // ** NEW: Handle compound house names like "The X and Y" **
  // "The Glebe and Firbrook, Tay Lane" -> "Tay Lane"
  if (parts[0] && /\band\b/i.test(parts[0]) && parts.length >= 2) {
    variations.push(`${parts.slice(1).join(', ')}, Ireland`);
  }
  
  // ** NEW: Handle "X The Y, Street" development names **
  // "27 The Quarry, Carrickhill Road Upper" -> "Carrickhill Road Upper"
  if (parts.length >= 2 && /^\d+\s+The\s+/i.test(parts[0])) {
    variations.push(`${parts.slice(1).join(', ')}, Ireland`);
    // Also try: "Carrickhill Road, Portmarnock" (removing "Upper")
    const streetClean = parts[1]?.replace(/\s+(Upper|Lower|East|West|North|South)$/i, '');
    if (streetClean && streetClean !== parts[1]) {
      variations.push(`${streetClean}, ${parts.slice(2).join(', ')}, Ireland`);
    }
  }
  
  // ** NEW: Try just the last 2-3 parts (area + Dublin) **
  if (parts.length >= 3) {
    variations.push(`${parts.slice(-3).join(', ')}, Ireland`);
  }
  
  // Just the area names (last two parts)
  if (parts.length >= 2) {
    variations.push(`${parts.slice(-2).join(', ')}, Ireland`);
  }
  
  // Try replacing "Dublin X" with just "Dublin" in some variations
  const withGenericDublin = cleaned.replace(/Dublin\s*\d+/gi, 'Dublin');
  if (withGenericDublin !== cleaned) {
    variations.push(withGenericDublin + ', Ireland');
  }
  
  return [...new Set(variations)];
}

function extractEircode(displayName: string): string | null {
  const match = displayName.match(/[A-Z]\d{2}\s?[A-Z0-9]{4}/i);
  return match ? match[0].toUpperCase() : null;
}

function isInDublinBounds(lat: number, lng: number): boolean {
  return lat >= DUBLIN_BOUNDS.minLat && lat <= DUBLIN_BOUNDS.maxLat &&
         lng >= DUBLIN_BOUNDS.minLng && lng <= DUBLIN_BOUNDS.maxLng;
}

function isWrongCounty(displayName: string): boolean {
  for (const county of WRONG_COUNTIES) {
    if (displayName.includes(`County ${county}`) || displayName.includes(`, ${county},`)) {
      return true;
    }
  }
  return false;
}

function validateGeocodeResult(result: NominatimResult, originalAddress: string): {
  latitude: number;
  longitude: number;
  eircode: string | null;
  nominatimAddress: string;
} | null {
  const lat = parseFloat(result.lat);
  const lng = parseFloat(result.lon);
  const displayName = result.display_name || '';
  
  if (!isInDublinBounds(lat, lng)) {
    return null;
  }
  
  const isDublinArea = displayName.includes('Dublin') || 
                       displayName.includes('Fingal') ||
                       displayName.includes('Dún Laoghaire');
  if (!isDublinArea) {
    return null;
  }
  
  if (isWrongCounty(displayName)) {
    return null;
  }
  
  if (displayName === 'Dublin, County Dublin, Leinster, Éire / Ireland') {
    return null;
  }
  
  // Verify the result relates to the original address
  // Extract key words from original address (exclude common words)
  const commonWords = ['the', 'dublin', 'ireland', 'county', 'road', 'street', 'avenue', 'drive', 
                       'park', 'house', 'apartment', 'mews', 'court', 'close', 'lane', 'grove',
                       'place', 'terrace', 'square', 'gardens', 'crescent', 'rise', 'view'];
  const originalWords = originalAddress.toLowerCase()
    .replace(/[,\d]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .filter(w => !commonWords.includes(w));
  
  const displayLower = displayName.toLowerCase();
  
  // At least one significant word from original should appear in result
  // OR the result should mention the Dublin postal code from the original
  const dublinCodeMatch = originalAddress.match(/Dublin\s*(\d+)/i);
  const dublinCode = dublinCodeMatch ? `dublin ${dublinCodeMatch[1]}` : null;
  
  const hasMatch = originalWords.some(word => displayLower.includes(word)) ||
                   (dublinCode && displayLower.includes(dublinCode));
  
  // Be more lenient - if we're in Dublin bounds and it mentions Dublin, accept it
  // but only if we have very few original words (like just apartment names)
  if (!hasMatch && originalWords.length > 2) {
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
  // Try eircode first if present in address - very precise lookup!
  // Dublin eircodes: D01-D24, D6W, A94, A96 (Dún Laoghaire-Rathdown), K34, K36, K56, K67 (Fingal)
  const eircodeMatch = address.match(/(D0[1-9]|D1[0-8]|D20|D22|D24|D6W|A9[4-6]|K3[2-9]|K45|K56|K67)\s?([A-Z0-9]{4})/i);
  if (eircodeMatch) {
    const eircode = (eircodeMatch[1] + ' ' + eircodeMatch[2]).toUpperCase();
    try {
      const url = `${CONFIG.nominatimUrl}?q=${encodeURIComponent(eircode)}&format=json&countrycodes=ie&limit=3`;
      const response = await fetch(url);
      if (response.ok) {
        const results: NominatimResult[] = await response.json();
        for (const result of results) {
          // For eircode lookups, skip address validation - eircode is precise
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);
          const displayName = result.display_name || '';
          
          if (isInDublinBounds(lat, lng) && !isWrongCounty(displayName)) {
            return {
              latitude: lat,
              longitude: lng,
              eircode: eircode,
              nominatimAddress: displayName,
            };
          }
        }
      }
    } catch {
      // Fall through to address variations
    }
  }
  
  // Fall back to address variations
  const variations = getAddressVariations(address);
  
  for (const query of variations) {
    try {
      const url = `${CONFIG.nominatimUrl}?q=${encodeURIComponent(query)}&format=json&countrycodes=ie&limit=3`;
      const response = await fetch(url);
      if (!response.ok) continue;
      
      const results: NominatimResult[] = await response.json();
      
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

// ============== Main Pipeline ==============

async function runPipeline() {
  console.log('=== For Sale Listings Pipeline ===\n');
  console.log(`Target: ${CONFIG.baseUrl}\n`);
  
  // Parse command line args
  const args = process.argv.slice(2);
  const maxPagesArg = args.find(a => a.startsWith('--max'));
  const maxPages = maxPagesArg ? parseInt(args[args.indexOf(maxPagesArg) + 1]) : CONFIG.maxPages;
  
  // Start fresh (snapshot mode)
  const listings: Listing[] = [];
  
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
  
  // Launch browser
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  let currentPage = 1;
  let totalListings = 0;
  
  try {
    // Go to main page
    console.log('Going to page 1...');
    await page.goto(CONFIG.baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
    
    // Accept cookies
    try {
      const cookieBtn = page.locator('button:has-text("Accept All")');
      if (await cookieBtn.isVisible({ timeout: 3000 })) {
        await cookieBtn.click();
        console.log('Cookies accepted');
        await page.waitForTimeout(1000);
      }
    } catch {}
    
    // Main scraping loop
    while (currentPage <= maxPages) {
      console.log(`\n--- Page ${currentPage}/${maxPages} ---`);
      
      // Wait for listing cards
      try {
        await page.waitForSelector('[data-testid="results"]', { timeout: 15000 });
      } catch {
        console.log('No results found, might be end of listings');
        break;
      }
      
      // Build source URL
      const sourceUrl = currentPage === 1 
        ? CONFIG.baseUrl 
        : `${CONFIG.baseUrl}?pageSize=20&from=${(currentPage - 1) * 20}`;
      
      // Extract listing data from cards using proper data attributes
      const rawData = await page.evaluate(() => {
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
      
      console.log(`Found ${rawData.length} listings on page`);
      
      // Process each listing: geocode + clean
      let newCount = 0;
      for (const raw of rawData) {
        // Skip duplicates (by address)
        const exists = listings.some(l => l.address === raw.address);
        if (exists) continue;
        
        // Geocode
        const geo = await geocodeAddress(raw.address);
        
        // Build clean listing
        const askingPrice = parsePrice(raw.askingPrice);
        const areaSqm = raw.area ? parseFloat(raw.area) : null;
        
        const listing: Listing = {
          address: raw.address,
          askingPrice,
          beds: raw.beds ? parseInt(raw.beds) : null,
          baths: raw.baths ? parseInt(raw.baths) : null,
          areaSqm,
          propertyType: raw.propertyType || '',
          berRating: raw.berRating || null,
          sourceUrl: raw.sourceUrl,
          sourcePage: currentPage,
          latitude: geo?.latitude || null,
          longitude: geo?.longitude || null,
          eircode: geo?.eircode || null,
          nominatimAddress: geo?.nominatimAddress || null,
          pricePerSqm: (askingPrice && areaSqm) ? Math.round(askingPrice / areaSqm) : null,
          scrapedAt: new Date().toISOString(),
        };
        
        listings.push(listing);
        newCount++;
        totalListings++;
        
        const geoStatus = geo ? `✓ ${geo.eircode || 'geocoded'}` : '✗';
        console.log(`  + ${listing.address.substring(0, 40)}... ${geoStatus}`);
      }
      
      // Save after each page
      writeFileSync(CONFIG.outputFile, JSON.stringify(listings, null, 2));
      console.log(`Saved: ${listings.length} total (+${newCount} new)`);
      
      // Click Next button to go to next page (URL nav doesn't work reliably on Daft)
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
          
          // Wait for new content to load
          await page.waitForSelector('[data-testid="card-container"]', { timeout: 15000 });
        } else {
          console.log('\nNo more pages (Next button not found)');
          break;
        }
      } catch {
        console.log('\nReached last page');
        break;
      }
    }
    
    // Final stats
    const withCoords = listings.filter(l => l.latitude && l.longitude).length;
    const geocodeRate = listings.length > 0 ? Math.round(withCoords / listings.length * 100) : 0;
    
    console.log(`\n=== Pipeline Complete ===`);
    console.log(`Total listings: ${listings.length}`);
    console.log(`With coordinates: ${withCoords} (${geocodeRate}%)`);
    console.log(`Pages scraped: ${currentPage}`);
    console.log(`Output: ${CONFIG.outputFile}`);
    
  } catch (error) {
    console.error('Error:', error);
    console.log(`Progress saved: ${listings.length} listings`);
  } finally {
    await browser.close();
  }
}

// ============== Main Entry Point ==============
runPipeline().catch(console.error);

