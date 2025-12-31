import { Property, MarketStats, AreaStats, Listing, ListingStats, RentalListing, RentalStats } from '@/types/property';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createClient } from '@/lib/supabase/server';
import { extractPrimaryArea } from '@/lib/areas';

// ============== Unified Data Cache ==============

interface ConsolidatedData {
  properties: Property[];
  listings: Listing[];
  rentals: RentalListing[];
  stats: {
    generated: string;
    propertiesCount: number;
    listingsCount: number;
    rentalsCount: number;
    yieldCoverage: { properties: number; listings: number };
  };
}

let dataCache: ConsolidatedData | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Load consolidated data from JSON files with caching
 */
async function loadData(): Promise<ConsolidatedData> {
  const now = Date.now();

  if (dataCache && (now - cacheTime) < CACHE_TTL) {
    return dataCache;
  }

  // First try to load from consolidated data.json file (highest priority)
  try {
    console.log('Loading consolidated data from JSON file...');
    // Try multiple paths for data.json (production: public folder, dev: scraper folder)
    const possiblePaths = [
      join(process.cwd(), 'public', 'data.json'),  // Production (deployed dashboard)
      join(process.cwd(), '..', 'scraper', 'data', 'data.json'),  // Development (monorepo)
      join(process.cwd(), '..', 'scraper', 'data', 'consolidated', 'data.json'),  // Consolidated directory
    ];

    for (const consolidatedPath of possiblePaths) {
      if (existsSync(consolidatedPath)) {
        const data = readFileSync(consolidatedPath, 'utf-8');
        dataCache = JSON.parse(data);
        cacheTime = now;
        console.log(`Loaded consolidated data from ${consolidatedPath}: ${dataCache!.properties.length} properties, ${dataCache!.listings.length} listings, ${dataCache!.rentals.length} rentals`);
        return dataCache!;
      }
    }
  } catch (jsonError) {
    console.warn('Error loading JSON consolidated data, falling back to database:', jsonError);
  }

  // Fallback: Load from database (individual tables)
  try {
    console.log('Falling back to database for consolidated data...');

    const [properties, listings, rentals] = await Promise.all([
      loadProperties(),
      loadListings(),
      loadRentals()
    ]);

    const consolidatedData: ConsolidatedData = {
      properties,
      listings,
      rentals,
      stats: {
        generated: new Date().toISOString(),
        propertiesCount: properties.length,
        listingsCount: listings.length,
        rentalsCount: rentals.length,
        yieldCoverage: { properties: 0, listings: 0 }
      }
    };

    dataCache = consolidatedData;
    cacheTime = now;

    console.log(`Loaded data from database: ${properties.length} properties, ${listings.length} listings, ${rentals.length} rentals`);
    return consolidatedData;

  } catch (error) {
    console.error('Error loading data from database:', error);
  }

  // Final fallback - empty data
  console.log('No data available, returning empty dataset');
  return {
    properties: [],
    listings: [],
    rentals: [],
    stats: {
      generated: new Date().toISOString(),
      propertiesCount: 0,
      listingsCount: 0,
      rentalsCount: 0,
      yieldCoverage: { properties: 0, listings: 0 }
    }
  };
}

/**
 * Fallback: Load from separate JSON files
 */
function loadFromSeparateFiles(): ConsolidatedData {
  const properties: Property[] = [];
  const listings: Listing[] = [];
  const rentals: RentalListing[] = [];
  
  try {
    const propsPath = join(process.cwd(), '..', 'scraper', 'data', 'properties.json');
    if (existsSync(propsPath)) {
      const data = JSON.parse(readFileSync(propsPath, 'utf-8'));
      properties.push(...data);
    }
  } catch (e) { console.error('Error loading properties:', e); }
  
  try {
    const listingsPath = join(process.cwd(), '..', 'scraper', 'data', 'listings.json');
    if (existsSync(listingsPath)) {
      const data = JSON.parse(readFileSync(listingsPath, 'utf-8'));
      listings.push(...data);
    }
  } catch (e) { console.error('Error loading listings:', e); }
  
  try {
    const rentalsPath = join(process.cwd(), '..', 'scraper', 'data', 'rentals.json');
    if (existsSync(rentalsPath)) {
      const data = JSON.parse(readFileSync(rentalsPath, 'utf-8'));
      rentals.push(...data);
    }
  } catch (e) { console.error('Error loading rentals:', e); }
  
  dataCache = {
    properties,
    listings,
    rentals,
    stats: {
      generated: new Date().toISOString(),
      propertiesCount: properties.length,
      listingsCount: listings.length,
      rentalsCount: rentals.length,
      yieldCoverage: { properties: 0, listings: 0 },
    },
  };
  cacheTime = Date.now();
  
  return dataCache;
}

/**
 * Load properties from local JSON files first, fallback to database
 */
export async function loadProperties(): Promise<Property[]> {
  // First try to load from local JSON file (server-side file system access)
  try {
    console.log('🔍 Loading properties from local JSON file...');
    const possiblePaths = [
      join(process.cwd(), 'public', 'data.json'),  // Production (deployed dashboard)
      join(process.cwd(), '..', 'scraper', 'data', 'data.json'),  // Development (monorepo)
      join(process.cwd(), '..', 'scraper', 'data', 'consolidated', 'data.json'),  // Consolidated directory
    ];

    for (const consolidatedPath of possiblePaths) {
      if (existsSync(consolidatedPath)) {
        const data = readFileSync(consolidatedPath, 'utf-8');
        const consolidatedData = JSON.parse(data);
        if (consolidatedData.properties && consolidatedData.properties.length > 0) {
          console.log(`✅ Loaded ${consolidatedData.properties.length} properties from consolidated JSON`);

          // Transform and filter the data
          const transformedProperties: Property[] = consolidatedData.properties.map((p: any, index: number) => ({
            id: p.id || `json-${index}`,
            address: p.address,
            propertyType: p.propertyType || p.property_type,
            beds: p.beds,
            baths: p.baths,
            areaSqm: p.areaSqm || p.area_sqm,
            soldDate: p.soldDate || p.sold_date,
            soldPrice: p.soldPrice || p.sold_price,
            askingPrice: p.askingPrice || p.asking_price,
            overUnderPercent: p.overUnderPercent || p.over_under_percent || (p.askingPrice && p.soldPrice ? ((p.soldPrice - p.askingPrice) / p.askingPrice) * 100 : 0),
            latitude: p.latitude,
            longitude: p.longitude,
            eircode: p.eircode || p.eircode,
            dublinPostcode: p.dublinPostcode || p.dublin_postcode,
            pricePerSqm: p.pricePerSqm || p.price_per_sqm,
            sourceUrl: p.sourceUrl || p.source_url,
            sourcePage: p.sourcePage || p.source_page,
            scrapedAt: p.scrapedAt || p.scraped_at,
            nominatimAddress: p.nominatimAddress || p.nominatim_address,
            yieldEstimate: p.yieldEstimate || p.yield_estimate
          }));

          // Apply filtering
          const filtered = transformedProperties.filter(p => {
            const year = parseInt(p.soldDate?.split('-')[0] || '0');
            return year >= 2015 && year <= 2025 && p.soldPrice >= 10000 && p.soldPrice <= 50000000;
          });

          console.log(`Filtered to ${filtered.length} properties after applying filters`);
          return filtered;
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load from local JSON, falling back to database:', error);
  }

  // Fallback to database
  console.log('🔄 Falling back to database for properties...');
  try {
    const supabase = await createClient();

    // Query sold properties from Supabase with filtering applied at database level
    const { data: properties, error } = await supabase
      .from('sold_properties')
      .select('*')
      .gte('sold_date', '2015-01-01')
      .lte('sold_date', '2025-12-31')
      .gte('sold_price', 10000)
      .lte('sold_price', 50000000)
      .order('sold_date', { ascending: false });

    if (error) {
      console.warn('Failed to load properties from Supabase:', error.message);
      throw error;
    }

    if (properties && properties.length > 0) {
      console.log(`Loaded ${properties.length} properties from database`);

      // Transform Supabase data to match our Property interface
      const transformedProperties: Property[] = properties.map(p => ({
        id: p.id,
        address: p.address,
        propertyType: p.property_type,
        beds: p.beds,
        baths: p.baths,
        areaSqm: p.area_sqm,
        soldDate: p.sold_date,
        soldPrice: p.sold_price,
        askingPrice: p.asking_price,
        overUnderPercent: p.over_under_percent || (p.asking_price && p.sold_price ? ((p.sold_price - p.asking_price) / p.asking_price) * 100 : 0),
        latitude: p.latitude,
        longitude: p.longitude,
        eircode: p.eircode,
        dublinPostcode: p.dublin_postcode,
        pricePerSqm: p.price_per_sqm,
        sourceUrl: p.source_url,
        sourcePage: p.source_page,
        scrapedAt: p.scraped_at,
        nominatimAddress: p.nominatim_address,
        yieldEstimate: p.yield_estimate
      }));

      return transformedProperties;
    }
  } catch (error) {
    console.warn('Database load failed, falling back to consolidated data:', error);
  }

  // Final fallback to consolidated data
  console.log('📦 Using consolidated data as final fallback...');
  const consolidatedData = await loadData();
  return consolidatedData.properties;
}

/**
 * Load listings from local JSON files first, fallback to database
 */
export async function loadListings(): Promise<Listing[]> {
  // First try to load from local JSON file (server-side file system access)
  try {
    console.log('🔍 Loading listings from local JSON file...');
    const possiblePaths = [
      join(process.cwd(), 'public', 'data.json'),  // Production (deployed dashboard)
      join(process.cwd(), '..', 'scraper', 'data', 'data.json'),  // Development (monorepo)
      join(process.cwd(), '..', 'scraper', 'data', 'consolidated', 'data.json'),  // Consolidated directory
    ];

    for (const consolidatedPath of possiblePaths) {
      if (existsSync(consolidatedPath)) {
        const data = readFileSync(consolidatedPath, 'utf-8');
        const consolidatedData = JSON.parse(data);
        if (consolidatedData.listings && consolidatedData.listings.length > 0) {
          console.log(`✅ Loaded ${consolidatedData.listings.length} listings from consolidated JSON`);

          // Transform JSON data to match our Listing interface
          const transformedListings: Listing[] = consolidatedData.listings.map((l: any, index: number) => ({
            id: l.id || `json-${index}`,
            address: l.address,
            propertyType: l.propertyType || l.property_type,
            beds: l.beds,
            baths: l.baths,
            areaSqm: l.areaSqm || l.area_sqm,
            askingPrice: l.askingPrice || l.asking_price,
            latitude: l.latitude,
            longitude: l.longitude,
            eircode: l.eircode,
            dublinPostcode: l.dublinPostcode || l.dublin_postcode,
            berRating: l.berRating || l.ber_rating,
            pricePerSqm: l.pricePerSqm || l.price_per_sqm,
            sourceUrl: l.sourceUrl || l.source_url,
            sourcePage: l.sourcePage || l.source_page,
            scrapedAt: l.scrapedAt || l.scraped_at,
            nominatimAddress: l.nominatimAddress || l.nominatim_address,
            yieldEstimate: l.yieldEstimate || l.yield_estimate,
            priceHistory: l.priceHistory || l.price_history || []
          }));

          // Apply filtering
          const filtered = transformedListings.filter(l =>
            l.askingPrice >= 10000 && l.askingPrice <= 100000000
          );

          console.log(`Filtered to ${filtered.length} listings after applying filters`);
          return filtered;
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load from local JSON, falling back to database:', error);
  }

  // Fallback to database
  console.log('🔄 Falling back to database for listings...');
  try {
    const supabase = await createClient();

    // Query property listings from Supabase with filtering applied at database level
    const { data: listings, error } = await supabase
      .from('property_listings')
      .select('*')
      .gte('asking_price', 10000)
      .lte('asking_price', 100000000)
      .order('last_seen_date', { ascending: false });

    if (error) {
      console.warn('Failed to load listings from Supabase:', error.message);
      throw error;
    }

    if (listings && listings.length > 0) {
      console.log(`Loaded ${listings.length} listings from database`);

      // Transform Supabase data to match our Listing interface
      const transformedListings: Listing[] = listings.map(l => ({
        id: l.id,
        address: l.address,
        propertyType: l.property_type,
        beds: l.beds,
        baths: l.baths,
        areaSqm: l.area_sqm,
        askingPrice: l.asking_price,
        pricePerSqm: l.price_per_sqm,
        latitude: l.latitude,
        longitude: l.longitude,
        eircode: l.eircode,
        dublinPostcode: l.dublin_postcode,
        berRating: l.ber_rating,
        sourceUrl: l.source_url,
        sourcePage: l.source_page,
        scrapedAt: l.scraped_at,
        nominatimAddress: l.nominatim_address,
        yieldEstimate: l.yield_estimate,
        priceHistory: l.price_history || []
      }));

      return transformedListings;
    }
  } catch (error) {
    console.warn('Database load failed, falling back to consolidated data:', error);
  }

  // Final fallback to consolidated data
  console.log('📦 Using consolidated data as final fallback...');
  const consolidatedData = await loadData();
  return consolidatedData.listings;
}

/**
 * Load rentals from local JSON files first, fallback to database
 */
export async function loadRentals(): Promise<RentalListing[]> {
  // First try to load from local JSON file (server-side file system access)
  try {
    console.log('🔍 Loading rentals from local JSON file...');
    const possiblePaths = [
      join(process.cwd(), 'public', 'data.json'),  // Production (deployed dashboard)
      join(process.cwd(), '..', 'scraper', 'data', 'data.json'),  // Development (monorepo)
      join(process.cwd(), '..', 'scraper', 'data', 'consolidated', 'data.json'),  // Consolidated directory
    ];

    for (const consolidatedPath of possiblePaths) {
      if (existsSync(consolidatedPath)) {
        const data = readFileSync(consolidatedPath, 'utf-8');
        const consolidatedData = JSON.parse(data);
        if (consolidatedData.rentals && consolidatedData.rentals.length > 0) {
          console.log(`✅ Loaded ${consolidatedData.rentals.length} rentals from consolidated JSON`);

          // Transform JSON data to match our RentalListing interface
          const transformedRentals: RentalListing[] = consolidatedData.rentals.map((r: any, index: number) => ({
            id: r.id || `json-${index}`,
            address: r.address,
            propertyType: r.propertyType || r.property_type,
            beds: r.beds,
            baths: r.baths,
            areaSqm: r.areaSqm || r.area_sqm,
            monthlyRent: r.monthlyRent || r.monthly_rent,
            rentPerSqm: r.rentPerSqm || r.rent_per_sqm,
            furnishing: r.furnishing,
            leaseType: r.leaseType || r.lease_type,
            latitude: r.latitude,
            longitude: r.longitude,
            eircode: r.eircode,
            dublinPostcode: r.dublinPostcode || r.dublin_postcode,
            berRating: r.berRating || r.ber_rating,
            rentPerBed: r.rentPerBed || r.rent_per_bed,
            sourceUrl: r.sourceUrl || r.source_url,
            sourcePage: r.sourcePage || r.source_page,
            scrapedAt: r.scrapedAt || r.scraped_at,
            nominatimAddress: r.nominatimAddress || r.nominatim_address,
            yieldEstimate: r.yieldEstimate || r.yield_estimate,
            rentHistory: r.rentHistory || r.price_history || []
          }));

          // Apply filtering
          const filtered = transformedRentals.filter(r =>
            r.monthlyRent >= 200 && r.monthlyRent <= 50000
          );

          console.log(`Filtered to ${filtered.length} rentals after applying filters`);
          return filtered;
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load from local JSON, falling back to database:', error);
  }

  // Fallback to database
  console.log('🔄 Falling back to database for rentals...');
  try {
    const supabase = await createClient();

    // Query rental listings from Supabase with filtering applied at database level
    const { data: rentals, error } = await supabase
      .from('rental_listings')
      .select('*')
      .gte('monthly_rent', 200)
      .lte('monthly_rent', 50000)
      .order('last_seen_date', { ascending: false });

    if (error) {
      console.warn('Failed to load rentals from Supabase:', error.message);
      throw error;
    }

    if (rentals && rentals.length > 0) {
      console.log(`Loaded ${rentals.length} rentals from database`);

      // Transform Supabase data to match our RentalListing interface
      const transformedRentals: RentalListing[] = rentals.map(r => ({
        id: r.id,
        address: r.address,
        propertyType: r.property_type,
        beds: r.beds,
        baths: r.baths,
        areaSqm: r.area_sqm,
        monthlyRent: r.monthly_rent,
        rentPerSqm: r.rent_per_sqm,
        furnishing: r.furnishing,
        leaseType: r.lease_type,
        latitude: r.latitude,
        longitude: r.longitude,
        eircode: r.eircode,
        dublinPostcode: r.dublin_postcode,
        berRating: r.ber_rating,
        rentPerBed: r.rent_per_bed,
        sourceUrl: r.source_url,
        sourcePage: r.source_page,
        scrapedAt: r.scraped_at,
        nominatimAddress: r.nominatim_address,
        yieldEstimate: r.yield_estimate,
        rentHistory: r.price_history || [],
        // Historical tracking fields
        availabilityStatus: (r as any).availability_status || 'active',
        firstSeenDate: (r as any).first_seen_date,
        lastSeenDate: (r as any).last_seen_date,
        daysSinceLastSeen: (r as any).days_since_last_seen,
        priceHistory: r.price_history || []
      }));

      return transformedRentals;
    }
  } catch (error) {
    console.warn('Database load failed, falling back to consolidated data:', error);
  }

  // Final fallback to consolidated data
  console.log('📦 Using consolidated data as final fallback...');
  const consolidatedData = await loadData();
  return consolidatedData.rentals;
}

/**
 * Calculate market statistics
 */
export function getMarketStats(properties: Property[]): MarketStats {
  if (properties.length === 0) {
    return { totalProperties: 0, medianPrice: 0, avgPricePerSqm: 0, pctOverAsking: 0, priceChange: 0 };
  }
  
  const prices = properties.map(p => p.soldPrice).sort((a, b) => a - b);
  const medianPrice = prices[Math.floor(prices.length / 2)];
  
  const withSqm = properties.filter(p => p.pricePerSqm && p.pricePerSqm > 0);
  const avgPricePerSqm = withSqm.length > 0 
    ? Math.round(withSqm.reduce((sum, p) => sum + (p.pricePerSqm || 0), 0) / withSqm.length)
    : 0;
  
  const overAsking = properties.filter(p => p.overUnderPercent > 0);
  const pctOverAsking = Math.round((overAsking.length / properties.length) * 100);
  
  // Calculate YoY change (simplified)
  const now = new Date();
  const thisYear = properties.filter(p => {
    const d = new Date(p.soldDate);
    return d.getFullYear() === now.getFullYear();
  });
  const lastYear = properties.filter(p => {
    const d = new Date(p.soldDate);
    return d.getFullYear() === now.getFullYear() - 1;
  });
  
  let priceChange = 0;
  if (thisYear.length > 0 && lastYear.length > 0) {
    const thisMedian = thisYear.map(p => p.soldPrice).sort((a, b) => a - b)[Math.floor(thisYear.length / 2)];
    const lastMedian = lastYear.map(p => p.soldPrice).sort((a, b) => a - b)[Math.floor(lastYear.length / 2)];
    priceChange = Math.round(((thisMedian - lastMedian) / lastMedian) * 1000) / 10;
  }
  
  return {
    totalProperties: properties.length,
    medianPrice,
    avgPricePerSqm,
    pctOverAsking,
    priceChange,
  };
}

/**
 * Extract area from address (simplified)
 */
export function extractArea(address: string): string {
  // Use the improved extractPrimaryArea function from areas.ts
  // which properly handles Dublin districts and named areas
  return extractPrimaryArea(address);
}

/**
 * Get area statistics
 */
export function getAreaStats(properties: Property[]): AreaStats[] {
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
  const stats: AreaStats[] = [];
  
  areaMap.forEach((props, name) => {
    if (props.length < 5) return; // Skip areas with few properties
    
    const prices = props.map(p => p.soldPrice).sort((a, b) => a - b);
    const medianPrice = prices[Math.floor(prices.length / 2)];
    
    const withSqm = props.filter(p => p.pricePerSqm && p.pricePerSqm > 0);
    const avgPricePerSqm = withSqm.length > 0
      ? Math.round(withSqm.reduce((sum, p) => sum + (p.pricePerSqm || 0), 0) / withSqm.length)
      : 0;
    
    const overAsking = props.filter(p => p.overUnderPercent > 0);
    const pctOverAsking = Math.round((overAsking.length / props.length) * 100);

    // Calculate average over/under percent and euro values
    const withAskingPrice = props.filter(p => p.askingPrice && p.askingPrice > 0);
    const avgOverUnderPercent = withAskingPrice.length > 0
      ? Math.round((withAskingPrice.reduce((sum, p) => sum + ((p.soldPrice - p.askingPrice) / p.askingPrice) * 100, 0) / withAskingPrice.length) * 10) / 10
      : 0;

    // Calculate average euro over/under (sold price - asking price)
    const withAskingPriceEuro = props.filter(p => p.askingPrice && p.askingPrice > 0);
    const avgOverUnderEuro = withAskingPriceEuro.length > 0
      ? Math.round(withAskingPriceEuro.reduce((sum, p) => sum + (p.soldPrice - p.askingPrice), 0) / withAskingPriceEuro.length)
      : 0;

    // Simplified 6-month change
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
      avgOverUnderPercent,
      avgOverUnderEuro,
      change6m,
    });
  });
  
  return stats.sort((a, b) => b.count - a.count);
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  if (price >= 1000000) {
    return `€${(price / 1000000).toFixed(2)}M`;
  }
  return `€${(price / 1000).toFixed(0)}k`;
}

/**
 * Format full price
 */
export function formatFullPrice(price: number): string {
  return `€${price.toLocaleString()}`;
}

/**
 * Calculate listing statistics
 */
export function getListingStats(listings: Listing[]): ListingStats {
  if (listings.length === 0) {
    return { totalListings: 0, medianPrice: 0, avgPricePerSqm: 0, priceRange: { min: 0, max: 0 } };
  }
  
  const prices = listings.map(l => l.askingPrice).sort((a, b) => a - b);
  const medianPrice = prices[Math.floor(prices.length / 2)];
  
  const withSqm = listings.filter(l => l.pricePerSqm && l.pricePerSqm > 0);
  const avgPricePerSqm = withSqm.length > 0 
    ? Math.round(withSqm.reduce((sum, l) => sum + (l.pricePerSqm || 0), 0) / withSqm.length)
    : 0;
  
  return {
    totalListings: listings.length,
    medianPrice,
    avgPricePerSqm,
    priceRange: { min: prices[0], max: prices[prices.length - 1] },
  };
}

/**
 * Calculate rental statistics
 */
export function getRentalStats(rentals: RentalListing[]): RentalStats {
  if (rentals.length === 0) {
    return { totalRentals: 0, medianRent: 0, avgRentPerSqm: 0, rentRange: { min: 0, max: 0 } };
  }
  
  const rents = rentals.map(r => r.monthlyRent).sort((a, b) => a - b);
  const medianRent = rents[Math.floor(rents.length / 2)];
  
  const withSqm = rentals.filter(r => r.rentPerSqm && r.rentPerSqm > 0);
  const avgRentPerSqm = withSqm.length > 0 
    ? Math.round(withSqm.reduce((sum, r) => sum + (r.rentPerSqm || 0), 0) / withSqm.length * 10) / 10
    : 0;
  
  return {
    totalRentals: rentals.length,
    medianRent,
    avgRentPerSqm,
    rentRange: { min: rents[0], max: rents[rents.length - 1] },
  };
}
