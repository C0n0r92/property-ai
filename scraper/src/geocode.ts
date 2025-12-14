/**
 * Geocoding script using local Nominatim instance
 * 
 * Prerequisites:
 * - Docker running with Nominatim container on port 8080
 * - docker run -d -e PBF_URL=https://download.geofabrik.de/europe/ireland-and-northern-ireland-latest.osm.pbf -p 8080:8080 --name nominatim mediagis/nominatim:4.4
 */

import * as fs from 'fs';
import * as path from 'path';

const NOMINATIM_URL = 'http://localhost:8080/search';
const INPUT_FILE = './data/properties-1.json';
const OUTPUT_FILE = './data/properties-geocoded.json';
const BATCH_SIZE = 10; // Concurrent requests
const SAVE_EVERY = 500; // Save progress every N properties
const RETRY_NOT_FOUND = process.argv.includes('--retry'); // Retry not_found addresses
const REPROCESS_ALL = process.argv.includes('--reprocess-all'); // Reprocess everything

interface RawProperty {
  soldDate?: string;
  address?: string;
  soldPrice?: string;
  askingPrice?: string;
  overUnder?: string;
  beds?: string;
  baths?: string;
  area?: string;
  propertyType?: string;
  sourceUrl?: string;
  latitude?: number;
  longitude?: number;
  eircode?: string;
  nominatimAddress?: string; // Full address from Nominatim response
  geocodeStatus?: 'success' | 'not_found' | 'error';
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

/**
 * Clean address for better geocoding results
 */
function cleanAddress(addr: string): string {
  return addr
    // Remove duplicate Dublin suffixes
    .replace(/,?\s*Dublin,\s*Dublin$/i, ', Dublin')
    .replace(/,?\s*Dublin\s*\d+,\s*Dublin\s*\d+/gi, ', Dublin')
    .replace(/,?\s*Dublin\s*\d+,\s*Dublin$/gi, ', Dublin')
    // Remove apartment/unit prefixes that confuse geocoder
    .replace(/^Apt\.?\s*\d+[\s,\-]*/i, '')
    .replace(/^Apartment\.?\s*\d+[\s,\-]*/i, '')
    .replace(/^Unit\.?\s*\d+[\s,\-]*/i, '')
    .replace(/^No\.?\s*\d+[\s,\-]*/i, '')
    // Clean up multiple commas
    .replace(/,\s*,/g, ',')
    .trim();
}

/**
 * Generate fallback address variations to try
 * For "1 Ballygossan Park, Golf Links Road, Skerries, Dublin":
 * 1. Full: "1 Ballygossan Park, Golf Links Road, Skerries, Dublin, Ireland"
 * 2. Skip middle: "1 Ballygossan Park, Skerries, Dublin, Ireland" 
 * 3. First + area: "1 Ballygossan Park, Skerries, Ireland"
 * 4. Just first part: "1 Ballygossan Park, Ireland"
 * 5. Without number: "Ballygossan Park, Skerries, Ireland"
 * 6. Area only: "Skerries, Dublin, Ireland"
 */
function getAddressVariations(addr: string): string[] {
  const cleaned = cleanAddress(addr);
  const variations: string[] = [];
  const parts = cleaned.split(',').map(p => p.trim()).filter(p => p);
  
  // 1. Try full cleaned address + Ireland
  variations.push(cleaned + ', Ireland');
  
  // 2. If 4+ parts, skip middle parts: "1 Ballygossan Park, Skerries, Dublin"
  if (parts.length >= 4) {
    const firstPart = parts[0];
    const lastTwoParts = parts.slice(-2).join(', ');
    variations.push(`${firstPart}, ${lastTwoParts}, Ireland`);
  }
  
  // 3. First part + second-to-last (area): "1 Ballygossan Park, Skerries"
  if (parts.length >= 3) {
    const firstPart = parts[0];
    const area = parts[parts.length - 2]; // e.g., "Skerries"
    variations.push(`${firstPart}, ${area}, Ireland`);
  }
  
  // 4. Just first part + Ireland: "1 Ballygossan Park, Ireland"
  if (parts.length >= 1) {
    variations.push(`${parts[0]}, Ireland`);
  }
  
  // 5. Without house number + area: "Ballygossan Park, Skerries"
  const withoutNumber = parts[0].replace(/^\d+[a-z]?\s+/i, '');
  if (withoutNumber !== parts[0] && parts.length >= 2) {
    const area = parts[parts.length - 2];
    variations.push(`${withoutNumber}, ${area}, Ireland`);
    // Also try: "Ballygossan Park, Skerries, Dublin"
    if (parts.length >= 3) {
      const lastTwoParts = parts.slice(-2).join(', ');
      variations.push(`${withoutNumber}, ${lastTwoParts}, Ireland`);
    }
  }
  
  // 6. Just area + county: "Skerries, Dublin"
  if (parts.length >= 2) {
    const lastTwoParts = parts.slice(-2).join(', ');
    variations.push(`${lastTwoParts}, Ireland`);
  }
  
  return [...new Set(variations)]; // Remove duplicates
}

/**
 * Extract Eircode from Nominatim display_name
 * Eircode format: 3 chars (routing key) + space + 4 chars (e.g., D02 C671, K34 YH92)
 */
function extractEircode(displayName: string): string | undefined {
  // Eircode pattern: Letter + 2 digits + space + 4 alphanumeric
  const match = displayName.match(/[A-Z]\d{2}\s[A-Z0-9]{4}/);
  return match ? match[0] : undefined;
}

interface GeocodeResult {
  lat: number;
  lng: number;
  eircode?: string;
  nominatimAddress: string; // Full display_name from Nominatim
  matchedQuery: string;     // Which query variation worked
}

/**
 * Try a single geocode query
 */
async function tryGeocode(query: string): Promise<GeocodeResult | null> {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&countrycodes=ie&limit=1`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const results: NominatimResult[] = await response.json();
    
    if (results && results.length > 0) {
      const eircode = extractEircode(results[0].display_name);
      return {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon),
        eircode,
        nominatimAddress: results[0].display_name,
        matchedQuery: query
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Query local Nominatim instance with fallback variations
 */
async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const variations = getAddressVariations(address);
  
  for (const variation of variations) {
    const result = await tryGeocode(variation);
    if (result) {
      return result;
    }
  }
  
  return null;
}

/**
 * Process a batch of properties concurrently
 */
async function processBatch(properties: RawProperty[], startIdx: number): Promise<void> {
  const promises = properties.map(async (prop, i) => {
    const globalIdx = startIdx + i;
    
    // Skip if already geocoded
    if (prop.geocodeStatus === 'success' || prop.geocodeStatus === 'not_found') {
      return;
    }
    
    if (!prop.address) {
      prop.geocodeStatus = 'error';
      return;
    }
    
    const result = await geocodeAddress(prop.address);
    
    if (result) {
      prop.latitude = result.lat;
      prop.longitude = result.lng;
      prop.eircode = result.eircode;
      prop.nominatimAddress = result.nominatimAddress;
      prop.geocodeStatus = 'success';
      const eircodeInfo = result.eircode ? ` [${result.eircode}]` : '';
      console.log(`[${globalIdx + 1}] ✓ ${prop.address.substring(0, 40)}...${eircodeInfo}`);
    } else {
      prop.geocodeStatus = 'not_found';
      console.log(`[${globalIdx + 1}] ✗ ${prop.address.substring(0, 50)}...`);
    }
  });
  
  await Promise.all(promises);
}

/**
 * Check if Nominatim is ready
 */
async function waitForNominatim(maxAttempts = 30): Promise<boolean> {
  console.log('Checking if Nominatim is ready...');
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${NOMINATIM_URL}?q=Dublin&format=json&limit=1`);
      if (response.ok) {
        const results = await response.json();
        if (results && results.length > 0) {
          console.log('✓ Nominatim is ready!');
          return true;
        }
      }
    } catch {
      // Not ready yet
    }
    
    console.log(`Waiting for Nominatim... (attempt ${i + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
  }
  
  return false;
}

/**
 * Main geocoding function
 */
async function main() {
  console.log('=== Property Geocoding with Local Nominatim ===');
  const mode = REPROCESS_ALL ? 'REPROCESS ALL (capture nominatimAddress)' 
    : RETRY_NOT_FOUND ? 'RETRY not_found addresses' 
    : 'Normal (skip already processed)';
  console.log(`Mode: ${mode}\n`);
  
  // Check if Nominatim is ready
  const ready = await waitForNominatim();
  if (!ready) {
    console.error('Nominatim is not ready. Make sure the Docker container is running:');
    console.error('docker run -d -e PBF_URL=https://download.geofabrik.de/europe/ireland-and-northern-ireland-latest.osm.pbf -p 8080:8080 --name nominatim mediagis/nominatim:4.4');
    process.exit(1);
  }
  
  // Load properties
  console.log(`\nLoading properties from ${INPUT_FILE}...`);
  
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }
  
  let properties: RawProperty[];
  
  // Try to resume from existing output file
  if (fs.existsSync(OUTPUT_FILE)) {
    console.log(`Found existing output file, resuming...`);
    properties = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
  } else {
    properties = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  }
  
  console.log(`Loaded ${properties.length} properties`);
  
  // If reprocess-all mode, reset ALL to reprocess them
  if (REPROCESS_ALL) {
    console.log('\n🔄 REPROCESS ALL: Resetting all addresses to capture nominatimAddress...');
    let resetCount = 0;
    for (const prop of properties) {
      if (prop.geocodeStatus) {
        prop.geocodeStatus = undefined;
        prop.latitude = undefined;
        prop.longitude = undefined;
        prop.eircode = undefined;
        prop.nominatimAddress = undefined;
        resetCount++;
      }
    }
    console.log(`Reset ${resetCount} addresses for reprocessing\n`);
  }
  // If retry mode, reset not_found to retry them
  else if (RETRY_NOT_FOUND) {
    console.log('\n🔄 RETRY MODE: Resetting not_found addresses to retry with fallbacks...');
    let resetCount = 0;
    for (const prop of properties) {
      if (prop.geocodeStatus === 'not_found') {
        prop.geocodeStatus = undefined;
        resetCount++;
      }
    }
    console.log(`Reset ${resetCount} not_found addresses for retry\n`);
  }
  
  // Count already geocoded
  const alreadyGeocoded = properties.filter(p => p.geocodeStatus === 'success' || p.geocodeStatus === 'not_found').length;
  const toGeocode = properties.length - alreadyGeocoded;
  
  console.log(`Already geocoded: ${alreadyGeocoded}`);
  console.log(`To geocode: ${toGeocode}\n`);
  
  if (toGeocode === 0) {
    console.log('All properties already geocoded!');
    return;
  }
  
  // Process in batches
  let processed = 0;
  const startTime = Date.now();
  
  for (let i = 0; i < properties.length; i += BATCH_SIZE) {
    const batch = properties.slice(i, i + BATCH_SIZE);
    await processBatch(batch, i);
    
    processed += batch.length;
    
    // Save progress periodically
    if (processed % SAVE_EVERY === 0 || i + BATCH_SIZE >= properties.length) {
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(properties, null, 2));
      
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processed / elapsed;
      const remaining = (properties.length - processed) / rate;
      
      console.log(`\n--- Progress: ${processed}/${properties.length} (${(processed/properties.length*100).toFixed(1)}%) ---`);
      console.log(`Rate: ${rate.toFixed(1)} props/sec | ETA: ${(remaining/60).toFixed(1)} min\n`);
    }
  }
  
  // Final save
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(properties, null, 2));
  
  // Summary
  const successCount = properties.filter(p => p.geocodeStatus === 'success').length;
  const notFoundCount = properties.filter(p => p.geocodeStatus === 'not_found').length;
  const errorCount = properties.filter(p => p.geocodeStatus === 'error').length;
  const eircodeCount = properties.filter(p => p.eircode).length;
  
  console.log('\n=== Geocoding Complete ===');
  console.log(`Total: ${properties.length}`);
  console.log(`Success: ${successCount} (${(successCount/properties.length*100).toFixed(1)}%)`);
  console.log(`With Eircode: ${eircodeCount} (${(eircodeCount/properties.length*100).toFixed(1)}%)`);
  console.log(`Not Found: ${notFoundCount} (${(notFoundCount/properties.length*100).toFixed(1)}%)`);
  console.log(`Errors: ${errorCount}`);
  console.log(`\nOutput saved to: ${OUTPUT_FILE}`);
}

main().catch(console.error);

