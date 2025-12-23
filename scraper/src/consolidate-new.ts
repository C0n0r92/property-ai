/**
 * Data Consolidation Script
 * 
 * Merges all data files from their respective directories:
 *   - data/sold/*.json      → All historical sold properties
 *   - data/listings/*.json  → Latest listings snapshot  
 *   - data/rentals/*.json   → Latest rentals snapshot
 * 
 * Deduplicates sold properties and calculates yield estimates.
 * Outputs unified data.json for the dashboard.
 * 
 * Usage: npm run consolidate
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join } from 'path';

// ============== Configuration ==============
const DIRS = {
  sold: './data/sold',
  listings: './data/listings',
  rentals: './data/rentals',
  output: './data/consolidated',
};

// ============== Types ==============
interface Property {
  id?: string;
  address: string;
  soldDate: string;
  soldPrice: number;
  askingPrice: number;
  beds: number | null;
  baths?: number | null;
  areaSqm?: number | null;
  latitude: number | null;
  longitude: number | null;
  eircode: string | null;
  dublinPostcode?: string | null;
  yieldEstimate?: YieldEstimate | null;
  [key: string]: any;
}

interface Listing {
  address: string;
  askingPrice: number;
  beds: number | null;
  baths?: number | null;
  areaSqm?: number | null;
  latitude: number | null;
  longitude: number | null;
  eircode: string | null;
  dublinPostcode?: string | null;
  yieldEstimate?: YieldEstimate | null;
  // Price tracking fields
  firstSeenDate?: string;
  lastSeenDate?: string;
  daysOnMarket?: number;
  priceChanges?: number;
  priceHistory?: Array<{date: string, price: number}>;
  [key: string]: any;
}

interface Rental {
  address: string;
  monthlyRent: number;
  beds: number | null;
  baths?: number | null;
  areaSqm?: number | null;
  latitude: number | null;
  longitude: number | null;
  eircode: string | null;
  dublinPostcode: string | null;
  // Price tracking fields
  firstSeenDate?: string;
  lastSeenDate?: string;
  daysOnMarket?: number;
  priceChanges?: number;
  priceHistory?: Array<{date: string, price: number}>;
  [key: string]: any;
}

interface YieldEstimate {
  grossYield: number;
  monthlyRent: number;
  confidence: 'high' | 'medium' | 'low';
  dataPoints: number;
}

interface AreaStats {
  postcode: string;
  totalRentals: number;
  byBeds: Record<number, {
    count: number;
    medianRent: number;
    minRent: number;
    maxRent: number;
    rents: number[];
  }>;
}

// ============== Utility Functions ==============

function getTodayFileName(baseName: string = 'data'): string {
  const today = new Date().toISOString().split('T')[0];
  return `${baseName}-${today}.json`;
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function loadAllFromDir<T>(dir: string, label: string): T[] {
  if (!existsSync(dir)) {
    console.log(`  Directory not found: ${dir}`);
    return [];
  }
  
  const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  
  if (files.length === 0) {
    console.log(`  No JSON files in ${dir}`);
    return [];
  }
  
  console.log(`  Found ${files.length} file(s) in ${dir}`);
  
  const allItems: T[] = [];
  
  for (const file of files) {
    try {
      const filePath = join(dir, file);
      const content = readFileSync(filePath, 'utf-8');
      const data: T[] = JSON.parse(content);
      console.log(`    ${file}: ${data.length.toLocaleString()} records`);
      allItems.push(...data);
    } catch (e) {
      console.warn(`    Warning: Could not read ${file}:`, e);
    }
  }
  
  return allItems;
}

/**
 * Load only the most recent dated file from a directory
 * Used for listings/rentals which are snapshots, not historical accumulation
 */
function loadLatestFromDir<T>(dir: string, label: string): T[] {
  if (!existsSync(dir)) {
    console.log(`  Directory not found: ${dir}`);
    return [];
  }

  const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort();

  if (files.length === 0) {
    console.log(`  No JSON files in ${dir}`);
    return [];
  }

  // Find files with date patterns (YYYY-MM-DD)
  const datedFiles = files.filter(f => /\d{4}-\d{2}-\d{2}/.test(f));

  if (datedFiles.length > 0) {
    // Sort by date (newest first) and pick the most recent
    datedFiles.sort((a, b) => {
      const dateA = a.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || '';
      const dateB = b.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || '';
      return dateB.localeCompare(dateA);
    });

    const latestFile = datedFiles[0];
    console.log(`  Found ${files.length} file(s) in ${dir}`);
    console.log(`    Using latest: ${latestFile}`);

    try {
      const filePath = join(dir, latestFile);
      const content = readFileSync(filePath, 'utf-8');
      const data: T[] = JSON.parse(content);
      console.log(`    ${latestFile}: ${data.length.toLocaleString()} records`);
      return data;
    } catch (e) {
      console.warn(`    Warning: Could not read ${latestFile}:`, e);
      return [];
    }
  } else {
    // Fallback: if no dated files, use the most recent file
    const latestFile = files[files.length - 1];
    console.log(`  Found ${files.length} file(s) in ${dir} (no dated files)`);
    console.log(`    Using most recent: ${latestFile}`);

    try {
      const filePath = join(dir, latestFile);
      const content = readFileSync(filePath, 'utf-8');
      const data: T[] = JSON.parse(content);
      console.log(`    ${latestFile}: ${data.length.toLocaleString()} records`);
      return data;
    } catch (e) {
      console.warn(`    Warning: Could not read ${latestFile}:`, e);
      return [];
    }
  }
}

function generatePropertyId(address: string, soldDate: string, soldPrice: number): string {
  const normalised = address
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 60);
  return `${normalised}-${soldDate}-${soldPrice}`;
}

/**
 * Deduplicate listings/rentals by sourceUrl (or address), keeping most recent
 * and tracking price changes over time
 */
function deduplicateListingsRentals<T extends Listing | Rental>(
  items: T[],
  type: 'listings' | 'rentals'
): T[] {
  const grouped = new Map<string, T[]>();

  // Group by sourceUrl or fallback to address
  for (const item of items) {
    const key = (item as any).sourceUrl || item.address;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(item);
  }

  const deduplicated: T[] = [];

  for (const [key, group] of grouped) {
    // Sort by scrapedAt date (newest first)
    group.sort((a, b) => {
      const dateA = (a as any).scrapedAt || '';
      const dateB = (b as any).scrapedAt || '';
      return dateB.localeCompare(dateA);
    });

    const mostRecent = group[0];

    // Add price tracking metadata
    const priceField = type === 'listings' ? 'askingPrice' : 'monthlyRent';
    const prices = group.map(item => ({
      date: (item as any).scrapedAt || '',
      price: (item as any)[priceField]
    })).filter(p => p.price != null);

    // Sort price history by date
    prices.sort((a, b) => a.date.localeCompare(b.date));

    (mostRecent as any).firstSeenDate = prices[0]?.date || '';
    (mostRecent as any).lastSeenDate = prices[prices.length - 1]?.date || '';

    if (prices.length > 1) {
      const firstDate = new Date(prices[0].date);
      const lastDate = new Date(prices[prices.length - 1].date);
      (mostRecent as any).daysOnMarket = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

      // Count price changes (significant changes > 1%)
      let changes = 0;
      for (let i = 1; i < prices.length; i++) {
        const prevPrice = prices[i-1].price;
        const currPrice = prices[i].price;
        const changePercent = Math.abs((currPrice - prevPrice) / prevPrice) * 100;
        if (changePercent > 1) changes++;
      }
      (mostRecent as any).priceChanges = changes;
    } else {
      (mostRecent as any).daysOnMarket = 1;
      (mostRecent as any).priceChanges = 0;
    }

    (mostRecent as any).priceHistory = prices;

    deduplicated.push(mostRecent);
  }

  console.log(`  Deduplicated ${type}: ${items.length} → ${deduplicated.length} unique properties`);
  const withHistory = deduplicated.filter(item => ((item as any).priceHistory?.length || 0) > 1).length;
  if (withHistory > 0) {
    console.log(`  ${withHistory} ${type} have price history`);
  }

  return deduplicated;
}

function deduplicateProperties(properties: Property[]): Property[] {
  const seen = new Map<string, Property>();
  let duplicates = 0;
  
  for (const prop of properties) {
    // Generate ID if not present (backwards compatibility with old data)
    const id = prop.id || generatePropertyId(prop.address, prop.soldDate, prop.soldPrice);
    
    if (seen.has(id)) {
      duplicates++;
      // Keep the version with more data (prefer geocoded)
      const existing = seen.get(id)!;
      if (!existing.latitude && prop.latitude) {
        seen.set(id, prop);
      }
    } else {
      seen.set(id, { ...prop, id });
    }
  }
  
  console.log(`  Removed ${duplicates.toLocaleString()} duplicates`);
  return Array.from(seen.values());
}

function extractDublinPostcode(address: string): string | null {
  const match = address.match(/Dublin\s*(\d{1,2}W?)|D(\d{1,2}W?)\b/i);
  if (match) {
    const code = match[1] || match[2];
    return `D${code.toUpperCase()}`;
  }
  return null;
}

function median(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ============== Area Extraction (Improved) ==============

/**
 * Extract primary area from address using improved logic
 * Matches Dublin districts and named areas
 */
function extractArea(address: string): string {
  const parts = address.split(',').map(p => p.trim());
  
  // Look for Dublin district first (Dublin 1, Dublin 2, etc.)
  for (const part of parts) {
    if (/Dublin\s*\d+/i.test(part)) {
      const district = part.replace(/,?\s*Dublin$/i, '').trim();
      // Normalize Dublin 6w
      if (/Dublin\s*6w/i.test(district)) {
        return 'Dublin 6w';
      }
      return district;
    }
  }
  
  // Common Dublin areas to check (subset of DUBLIN_AREAS from dashboard)
  const commonAreas = [
    'Swords', 'Tallaght', 'Blackrock', 'Lucan', 'Dun Laoghaire', 'Dunlaoghaire', 'Malahide', 
    'Balbriggan', 'Blanchardstown', 'Clondalkin', 'Skerries', 'Howth',
    'Stillorgan', 'Booterstown', 'Sandycove', 'Monkstown', 'Dalkey',
    'Killiney', 'Rathfarnham', 'Dundrum', 'Rathmines', 'Ranelagh',
    'Donnybrook', 'Ballsbridge', 'Sandymount', 'Clontarf', 'Drumcondra',
    'Glasnevin', 'Finglas', 'Cabra', 'Phibsborough', 'Smithfield',
    'Inchicore', 'Crumlin', 'Terenure', 'Rathgar', 'Milltown',
    'Churchtown', 'Goatstown', 'Clonskeagh', 'Windy Arbour', 'Ballinteer',
    'Knocklyon', 'Templeogue', 'Firhouse', 'Ballycullen', 'Citywest',
    'Saggart', 'Palmerstown', 'Chapelizod', 'Castleknock', 'Clonsilla',
    'Mulhuddart', 'Ongar', 'Tyrrelstown', 'Clonee', 'Ashtown',
    'Carpenterstown', 'Coolmine', 'Porterstown', 'Rathborne', 'Waterville',
    'Lusk', 'Rush', 'Donabate', 'Portmarnock', 'Sutton', 'Baldoyle',
    'Raheny', 'Killester', 'Artane', 'Coolock', 'Donaghmede',
    'Ballymun', 'Santry', 'Beaumont', 'Whitehall', 'Northwood',
    'Fairview', 'East Wall', 'Ringsend', 'Irishtown', 'Harolds Cross',
    'Drimnagh', 'Walkinstown', 'Perrystown', 'Kimmage',
    'Ballyfermot', 'Cherry Orchard', 'Mount Merrion'
  ];
  
  // Check for named areas (case-insensitive, whole word match)
  const normalizedAddress = address.toLowerCase();
  for (const area of commonAreas) {
    const pattern = new RegExp(`\\b${area.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (pattern.test(normalizedAddress)) {
      // Check if it's followed by a Dublin district
      const areaIndex = normalizedAddress.indexOf(area.toLowerCase());
      const afterArea = normalizedAddress.substring(areaIndex + area.length);
      const districtMatch = afterArea.match(/dublin\s*(\d+)/i);
      if (districtMatch) {
        return `Dublin ${districtMatch[1]}`;
      }
      return area;
    }
  }
  
  // Fallback to second-to-last part (but filter out generic terms)
  if (parts.length >= 2) {
    const candidate = parts[parts.length - 2].replace(/Dublin\s*\d*/i, '').trim();
    // Skip generic terms
    const genericTerms = ['co', 'co.', 'county', 'dublin', ''];
    if (candidate && !genericTerms.includes(candidate.toLowerCase())) {
      return candidate;
    }
  }
  
  // Try third-to-last part if second-to-last was generic
  if (parts.length >= 3) {
    const candidate = parts[parts.length - 3].replace(/Dublin\s*\d*/i, '').trim();
    const genericTerms = ['co', 'co.', 'county', 'dublin', ''];
    if (candidate && !genericTerms.includes(candidate.toLowerCase())) {
      return candidate;
    }
  }
  
  return 'Dublin';
}

interface PropertyAreaStats {
  name: string;
  count: number;
  medianPrice: number;
  avgPricePerSqm: number;
  pctOverAsking: number;
  change6m: number;
}

/**
 * Generate area statistics for sold properties
 */
function generateAreaStats(properties: Property[]): PropertyAreaStats[] {
  const areaMap = new Map<string, Property[]>();
  
  // Group by area
  properties.forEach(p => {
    const area = extractArea(p.address);
    if (!areaMap.has(area)) {
      areaMap.set(area, []);
    }
    areaMap.get(area)!.push(p);
  });
  
  // Calculate stats per area
  const stats: PropertyAreaStats[] = [];
  
  areaMap.forEach((props, name) => {
    if (props.length < 5) return; // Skip areas with few properties
    
    const prices = props.map(p => p.soldPrice).sort((a, b) => a - b);
    const medianPrice = prices[Math.floor(prices.length / 2)];
    
    // Calculate price per sqm
    const withSqm = props.filter(p => p.areaSqm && p.areaSqm > 0);
    const avgPricePerSqm = withSqm.length > 0
      ? Math.round(withSqm.reduce((sum, p) => sum + (p.soldPrice / (p.areaSqm || 1)), 0) / withSqm.length)
      : 0;
    
    // Calculate over asking percentage
    const overAsking = props.filter(p => {
      const overUnder = p.askingPrice > 0 
        ? ((p.soldPrice - p.askingPrice) / p.askingPrice) * 100 
        : 0;
      return overUnder > 0;
    });
    const pctOverAsking = Math.round((overAsking.length / props.length) * 100);
    
    // Calculate 6-month change
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const recent = props.filter(p => new Date(p.soldDate) >= sixMonthsAgo);
    const older = props.filter(p => {
      const d = new Date(p.soldDate);
      return d < sixMonthsAgo && d >= new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() - 6, 1);
    });
    
    let change6m = 0;
    if (recent.length > 3 && older.length > 3) {
      const recentMedian = recent.map(p => p.soldPrice).sort((a, b) => a - b)[Math.floor(recent.length / 2)];
      const olderMedian = older.map(p => p.soldPrice).sort((a, b) => a - b)[Math.floor(older.length / 2)];
      change6m = Math.round(((recentMedian - olderMedian) / olderMedian) * 1000) / 10;
    }
    
    stats.push({
      name,
      count: props.length,
      medianPrice,
      avgPricePerSqm,
      pctOverAsking,
      change6m,
    });
  });
  
  return stats.sort((a, b) => b.count - a.count);
}

// ============== Yield Estimation ==============

function buildAreaStats(rentals: Rental[]): Map<string, AreaStats> {
  const stats = new Map<string, AreaStats>();
  
  for (const rental of rentals) {
    const postcode = rental.dublinPostcode || extractDublinPostcode(rental.address);
    if (!postcode || !rental.monthlyRent) continue;
    
    if (!stats.has(postcode)) {
      stats.set(postcode, { postcode, totalRentals: 0, byBeds: {} });
    }
    
    const area = stats.get(postcode)!;
    area.totalRentals++;
    
    if (rental.beds && rental.beds > 0) {
      if (!area.byBeds[rental.beds]) {
        area.byBeds[rental.beds] = { 
          count: 0, 
          medianRent: 0, 
          minRent: Infinity, 
          maxRent: 0,
          rents: []
        };
      }
      const bedStats = area.byBeds[rental.beds];
      bedStats.count++;
      bedStats.rents.push(rental.monthlyRent);
      bedStats.minRent = Math.min(bedStats.minRent, rental.monthlyRent);
      bedStats.maxRent = Math.max(bedStats.maxRent, rental.monthlyRent);
    }
  }
  
  // Calculate medians
  for (const area of stats.values()) {
    for (const bedStats of Object.values(area.byBeds)) {
      if (bedStats.rents.length > 0) {
        bedStats.medianRent = Math.round(median(bedStats.rents));
      }
    }
  }
  
  return stats;
}

function estimateYield(
  price: number,
  beds: number | null,
  postcode: string | null,
  areaStats: Map<string, AreaStats>
): YieldEstimate | null {
  if (!price || price <= 0 || !postcode || !beds || beds <= 0) return null;
  
  const areaData = areaStats.get(postcode);
  if (!areaData) return null;
  
  const bedData = areaData.byBeds[beds];
  if (!bedData || bedData.count < 2) return null;
  
  const monthlyRent = bedData.medianRent;
  const grossYield = Math.round((monthlyRent * 12 / price) * 10000) / 100;
  
  let confidence: 'high' | 'medium' | 'low';
  if (bedData.count >= 10) {
    confidence = 'high';
  } else if (bedData.count >= 5) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }
  
  return { 
    grossYield, 
    monthlyRent, 
    confidence,
    dataPoints: bedData.count
  };
}

// ============== Main Consolidation ==============

async function consolidate() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║               DATA CONSOLIDATION                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  // Load data (different strategies for different data types)
  console.log('📂 Loading sold properties...');
  const allProperties = loadAllFromDir<Property>(DIRS.sold, 'sold'); // All historical files

  console.log('\n📂 Loading listings...');
  const allListingsRaw = loadAllFromDir<Listing>(DIRS.listings, 'listings'); // All dated files for price tracking
  const allListings = deduplicateListingsRentals(allListingsRaw, 'listings'); // Deduplicate with price history

  console.log('\n📂 Loading rentals...');
  const allRentalsRaw = loadAllFromDir<Rental>(DIRS.rentals, 'rentals'); // All dated files for price tracking
  const allRentals = deduplicateListingsRentals(allRentalsRaw, 'rentals'); // Deduplicate with price history
  
  // Deduplicate properties
  console.log('\n🔄 Deduplicating sold properties...');
  console.log(`  Input: ${allProperties.length.toLocaleString()} total records`);
  const properties = deduplicateProperties(allProperties);
  console.log(`  Output: ${properties.length.toLocaleString()} unique properties`);
  
  // Add Dublin postcode to all records
  console.log('\n📍 Extracting Dublin postcodes...');
  let postcodeCount = 0;
  for (const prop of properties) {
    prop.dublinPostcode = prop.dublinPostcode || extractDublinPostcode(prop.address);
    if (prop.dublinPostcode) postcodeCount++;
  }
  for (const listing of allListings) {
    listing.dublinPostcode = listing.dublinPostcode || extractDublinPostcode(listing.address);
  }
  console.log(`  ${postcodeCount.toLocaleString()} properties with postcodes`);
  
  // Build rental stats for yield calculation
  console.log('\n📊 Building area rental statistics...');
  const areaStats = buildAreaStats(allRentals);
  console.log(`  ${areaStats.size} postcodes with rental data`);
  
  // Calculate yields for properties
  console.log('\n💰 Calculating yields for sold properties...');
  let propertiesWithYield = 0;
  for (const prop of properties) {
    const yieldData = estimateYield(
      prop.soldPrice, 
      prop.beds, 
      prop.dublinPostcode || null, 
      areaStats
    );
    prop.yieldEstimate = yieldData;
    if (yieldData) propertiesWithYield++;
  }
  console.log(`  ${propertiesWithYield.toLocaleString()} properties with yield estimates`);
  
  // Calculate yields for listings
  console.log('\n💰 Calculating yields for listings...');
  let listingsWithYield = 0;
  for (const listing of allListings) {
    const yieldData = estimateYield(
      listing.askingPrice, 
      listing.beds, 
      listing.dublinPostcode || null, 
      areaStats
    );
    listing.yieldEstimate = yieldData;
    if (yieldData) listingsWithYield++;
  }
  console.log(`  ${listingsWithYield.toLocaleString()} listings with yield estimates`);
  
  // Sort properties by sold date (newest first)
  properties.sort((a, b) => b.soldDate.localeCompare(a.soldDate));
  
  // Generate area statistics
  console.log('\n🗺️  Generating area statistics...');
  const propertyAreaStats = generateAreaStats(properties);
  console.log(`  ${propertyAreaStats.length} areas with 5+ properties`);
  
  // Show top areas and mapping quality
  const topAreas = propertyAreaStats.slice(0, 20);
  console.log('\n  Top 20 areas by sales count:');
  topAreas.forEach((area, i) => {
    console.log(`    ${(i + 1).toString().padStart(2)}. ${area.name.padEnd(25)} ${area.count.toString().padStart(5)} sales`);
  });
  
  // Check mapping quality
  const genericDublin = propertyAreaStats.find(a => a.name === 'Dublin');
  const coArea = propertyAreaStats.find(a => a.name === 'Co' || a.name === 'Co.');
  const totalMapped = propertyAreaStats.reduce((sum, a) => sum + a.count, 0);
  const unmapped = properties.length - totalMapped;
  
  console.log('\n  Area mapping quality:');
  console.log(`    Total properties: ${properties.length.toLocaleString()}`);
  console.log(`    Mapped to areas: ${totalMapped.toLocaleString()} (${Math.round(totalMapped / properties.length * 100)}%)`);
  if (genericDublin) {
    console.log(`    ⚠️  Generic "Dublin": ${genericDublin.count.toLocaleString()} (${Math.round(genericDublin.count / properties.length * 100)}%)`);
  }
  if (coArea) {
    console.log(`    ⚠️  "Co" area: ${coArea.count.toLocaleString()} (needs fixing)`);
  }
  if (unmapped > 0) {
    console.log(`    ⚠️  Unmapped (< 5 properties): ${unmapped.toLocaleString()}`);
  }
  
  // Build output
  const output = {
    properties,
    listings: allListings,
    rentals: allRentals,
    stats: {
      generated: new Date().toISOString(),
      generationTimeMs: Date.now() - startTime,
      propertiesCount: properties.length,
      listingsCount: allListings.length,
      rentalsCount: allRentals.length,
      geocodedProperties: properties.filter(p => p.latitude && p.longitude).length,
      geocodedListings: allListings.filter(l => l.latitude && l.longitude).length,
      yieldCoverage: {
        properties: properties.length > 0 
          ? Math.round(propertiesWithYield / properties.length * 100) 
          : 0,
        listings: allListings.length > 0 
          ? Math.round(listingsWithYield / allListings.length * 100) 
          : 0,
      },
      areaStats: Object.fromEntries(
        Array.from(areaStats.entries()).map(([postcode, stats]) => [
          postcode,
          {
            totalRentals: stats.totalRentals,
            bedrooms: Object.fromEntries(
              Object.entries(stats.byBeds).map(([beds, data]) => [
                beds,
                { count: data.count, medianRent: data.medianRent }
              ])
            )
          }
        ])
      ),
      propertyAreaStats: propertyAreaStats.map(area => ({
        name: area.name,
        count: area.count,
        medianPrice: area.medianPrice,
        avgPricePerSqm: area.avgPricePerSqm,
        pctOverAsking: area.pctOverAsking,
        change6m: area.change6m,
      })),
    },
  };
  
  // Write output to multiple locations with dated filenames
  ensureDir(DIRS.output);
  const datedFileName = getTodayFileName();

  const consolidatedDatedFile = join(DIRS.output, datedFileName);
  const dataDatedFile = join('./data', datedFileName);

  const jsonOutput = JSON.stringify(output, null, 2);

  // Write dated files for version control
  writeFileSync(consolidatedDatedFile, jsonOutput);
  console.log(`✓ Written to: ${consolidatedDatedFile}`);

  ensureDir('./data');
  writeFileSync(dataDatedFile, jsonOutput);
  console.log(`✓ Written to: ${dataDatedFile}`);

  // Create/update "latest" copies for compatibility
  const consolidatedLatest = join(DIRS.output, 'data.json');
  const dataLatest = join('./data', 'data.json');

  // Simply overwrite the latest files (simpler than symlinks)
  writeFileSync(consolidatedLatest, jsonOutput);
  writeFileSync(dataLatest, jsonOutput);
  console.log(`✓ Updated latest files: data.json`);

  // Try to write to dashboard public folder (dated + latest)
  if (existsSync(join('..', 'dashboard', 'public'))) {
    try {
      const dashboardDatedPath = join('..', 'dashboard', 'public', datedFileName);
      const dashboardLatestPath = join('..', 'dashboard', 'public', 'data.json');

      writeFileSync(dashboardDatedPath, jsonOutput);
      console.log(`✓ Written to: ${dashboardDatedPath}`);

      // Update latest file in dashboard
      writeFileSync(dashboardLatestPath, jsonOutput);
      console.log(`✓ Updated: ../dashboard/public/data.json`);
    } catch (e) {
      console.warn(`⚠ Could not write to dashboard public folder: ${e}`);
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n' + '═'.repeat(60));
  console.log('✅ CONSOLIDATION COMPLETE');
  console.log('═'.repeat(60));
  console.log(`
📦 Output files written:
   - ${consolidatedDatedFile} (dated)
   - ${dataDatedFile} (dated)
   - data.json → ${datedFileName} (symlink)
⏱️  Time: ${elapsed}s

📊 Summary:
   Sold Properties: ${properties.length.toLocaleString().padStart(8)} (${output.stats.yieldCoverage.properties}% with yields)
   Listings:        ${allListings.length.toLocaleString().padStart(8)} (${output.stats.yieldCoverage.listings}% with yields)
   Rentals:         ${allRentals.length.toLocaleString().padStart(8)}

🗺️  Geocoding:
   Properties: ${output.stats.geocodedProperties.toLocaleString()} / ${properties.length.toLocaleString()} (${Math.round(output.stats.geocodedProperties / properties.length * 100)}%)
   Listings:   ${output.stats.geocodedListings.toLocaleString()} / ${allListings.length.toLocaleString()} (${allListings.length > 0 ? Math.round(output.stats.geocodedListings / allListings.length * 100) : 0}%)
`);
}

// Run
consolidate().catch(console.error);
