import { Property, MarketStats, AreaStats, Listing, ListingStats, RentalListing, RentalStats } from '@/types/property';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createClient } from '@/lib/supabase/server';

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
 * Load consolidated data from Supabase with caching
 */
async function loadData(): Promise<ConsolidatedData> {
  const now = Date.now();

  if (dataCache && (now - cacheTime) < CACHE_TTL) {
    return dataCache;
  }

  try {
    // Load consolidated data from Supabase
    console.log('Loading consolidated data from Supabase...');

    const supabase = await createClient();

    // Query consolidated properties
    const { data: consolidatedData, error } = await supabase
      .from('consolidated_properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to load consolidated data from Supabase:', error.message);
      throw error;
    }

    if (consolidatedData && consolidatedData.length > 0) {
      console.log(`Loaded ${consolidatedData.length} consolidated properties from Supabase`);

      // Transform consolidated data into the expected format
      const properties: Property[] = consolidatedData
        .filter(p => !p.is_listing && !p.is_rental)
        .map(p => ({
          id: p.id,
          address: p.address,
          propertyType: p.property_type,
          beds: p.beds,
          baths: p.baths,
          areaSqm: p.area_sqm,
          soldDate: p.sold_date,
          soldPrice: p.sold_price,
          askingPrice: p.asking_price,
          overUnderPercent: p.over_under_percent,
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
        }))
        .filter(p => {
          const year = parseInt(p.soldDate?.split('-')[0] || '0');
          return year >= 2020 && year <= 2025 && p.soldPrice >= 50000 && p.soldPrice <= 20000000;
        });

      const listings: Listing[] = consolidatedData
        .filter(p => p.is_listing)
        .map(p => ({
          id: p.id,
          address: p.address,
          propertyType: p.property_type,
          beds: p.beds,
          baths: p.baths,
          areaSqm: p.area_sqm,
          askingPrice: p.asking_price,
          latitude: p.latitude,
          longitude: p.longitude,
          eircode: p.eircode,
          dublinPostcode: p.dublin_postcode,
          pricePerSqm: p.price_per_sqm,
          sourceUrl: p.source_url,
          sourcePage: p.source_page,
          scrapedAt: p.scraped_at,
          nominatimAddress: p.nominatim_address,
          yieldEstimate: p.yield_estimate,
          priceHistory: p.price_history as any || []
        }))
        .filter(l => l.askingPrice >= 50000 && l.askingPrice <= 50000000);

      const rentals: Rental[] = consolidatedData
        .filter(p => p.is_rental)
        .map(p => ({
          id: p.id,
          address: p.address,
          propertyType: p.property_type,
          beds: p.beds,
          baths: p.baths,
          areaSqm: p.area_sqm,
          monthlyRent: p.monthly_rent,
          latitude: p.latitude,
          longitude: p.longitude,
          eircode: p.eircode,
          dublinPostcode: p.dublin_postcode,
          rentPerSqm: p.rent_per_sqm,
          rentPerBed: p.rent_per_bed,
          sourceUrl: p.source_url,
          scrapedAt: p.scraped_at,
          nominatimAddress: p.nominatim_address,
          rentHistory: p.price_history as any || []
        }))
        .filter(r => r.monthlyRent >= 500 && r.monthlyRent <= 20000);

      const consolidatedResult: ConsolidatedData = {
        properties,
        listings,
        rentals,
        stats: {
          generated: new Date().toISOString(),
          propertiesCount: properties.length,
          listingsCount: listings.length,
          rentalsCount: rentals.length,
          yieldCoverage: {
            properties: properties.filter(p => p.yieldEstimate !== null).length,
            listings: listings.filter(l => l.yieldEstimate !== null).length
          }
        }
      };

      dataCache = consolidatedResult;
      cacheTime = now;

      console.log(`Processed consolidated data: ${properties.length} properties, ${listings.length} listings, ${rentals.length} rentals`);
      return consolidatedResult;
    }
  } catch (error) {
    console.warn('Supabase consolidated data load failed, falling back to individual tables:', error);
  }

  // Fallback: Load from individual Supabase tables
  try {
    console.log('Loading data from individual Supabase tables...');

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

    console.log(`Loaded data from individual tables: ${properties.length} properties, ${listings.length} listings, ${rentals.length} rentals`);
    return consolidatedData;

  } catch (error) {
    console.error('Error loading data from individual tables:', error);
  }

  // Final fallback to JSON files
  try {
    console.log('Falling back to JSON files...');
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
    console.error('Error loading JSON fallback:', jsonError);
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
 * Load properties from Supabase with caching and fallback to JSON
 */
export async function loadProperties(): Promise<Property[]> {
  // Try to load from Supabase first
  try {
    const supabase = await createClient();

    // Query sold properties from Supabase
    const { data: properties, error } = await supabase
      .from('sold_properties')
      .select('*')
      .order('sold_date', { ascending: false });

    if (error) {
      console.warn('Failed to load properties from Supabase:', error.message);
      throw error;
    }

    if (properties && properties.length > 0) {
      console.log(`Loaded ${properties.length} properties from Supabase`);

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
        overUnderPercent: p.over_under_percent,
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

      // Apply the same filtering as before
      return transformedProperties.filter(p => {
        const year = parseInt(p.soldDate?.split('-')[0] || '0');
        return year >= 2020 && year <= 2025 && p.soldPrice >= 50000 && p.soldPrice <= 20000000;
      });
    }
  } catch (error) {
    console.warn('Supabase load failed, falling back to JSON files:', error);
  }

  // Fallback to existing JSON loading (for backward compatibility)
  const data = await loadData();
  return data.properties.filter(p => {
    const year = parseInt(p.soldDate?.split('-')[0] || '0');
    return year >= 2020 && year <= 2025 && p.soldPrice >= 50000 && p.soldPrice <= 20000000;
  });
}

/**
 * Load listings from Supabase with caching and fallback to JSON
 */
export async function loadListings(): Promise<Listing[]> {
  // Try to load from Supabase first
  try {
    const supabase = await createClient();

    // Query property listings from Supabase
    const { data: listings, error } = await supabase
      .from('property_listings')
      .select('*')
      .order('last_seen_date', { ascending: false });

    if (error) {
      console.warn('Failed to load listings from Supabase:', error.message);
      throw error;
    }

    if (listings && listings.length > 0) {
      console.log(`Loaded ${listings.length} listings from Supabase`);

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
        firstSeenDate: l.first_seen_date,
        lastSeenDate: l.last_seen_date,
        daysOnMarket: l.days_on_market,
        priceChanges: l.price_changes,
        priceHistory: l.price_history,
        sourceUrl: l.source_url,
        scrapedAt: l.scraped_at,
        nominatimAddress: l.nominatim_address,
        yieldEstimate: l.yield_estimate
      }));

      // Apply the same filtering as before
      return transformedListings.filter(l =>
        l.askingPrice >= 50000 && l.askingPrice <= 50000000
      );
    }
  } catch (error) {
    console.warn('Supabase load failed, falling back to JSON files:', error);
  }

  // Fallback to existing JSON loading (for backward compatibility)
  const data = await loadData();
  return data.listings.filter(l =>
    l.askingPrice >= 50000 && l.askingPrice <= 50000000
  );
}

/**
 * Load rentals from Supabase with caching and fallback to JSON
 */
export async function loadRentals(): Promise<RentalListing[]> {
  // Try to load from Supabase first
  try {
    const supabase = await createClient();

    // Query rental listings from Supabase
    const { data: rentals, error } = await supabase
      .from('rental_listings')
      .select('*')
      .order('last_seen_date', { ascending: false });

    if (error) {
      console.warn('Failed to load rentals from Supabase:', error.message);
      throw error;
    }

    if (rentals && rentals.length > 0) {
      console.log(`Loaded ${rentals.length} rentals from Supabase`);

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
        firstSeenDate: r.first_seen_date,
        lastSeenDate: r.last_seen_date,
        daysOnMarket: r.days_on_market,
        priceChanges: r.price_changes,
        priceHistory: r.price_history,
        sourceUrl: r.source_url,
        scrapedAt: r.scraped_at,
        nominatimAddress: r.nominatim_address,
        yieldEstimate: r.yield_estimate
      }));

      // Apply the same filtering as before
      return transformedRentals.filter(r =>
        r.monthlyRent >= 500 && r.monthlyRent <= 20000
      );
    }
  } catch (error) {
    console.warn('Supabase load failed, falling back to JSON files:', error);
  }

  // Fallback to existing JSON loading (for backward compatibility)
  const data = await loadData();
  return data.rentals.filter(r =>
    r.monthlyRent >= 500 && r.monthlyRent <= 20000
  );
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
  const parts = address.split(',').map(p => p.trim());
  
  // Look for Dublin district
  for (const part of parts) {
    if (/Dublin\s*\d+/i.test(part)) {
      return part.replace(/,?\s*Dublin$/i, '').trim();
    }
  }
  
  // Use second-to-last part as area
  if (parts.length >= 2) {
    return parts[parts.length - 2].replace(/Dublin\s*\d*/i, '').trim() || 'Dublin';
  }
  
  return 'Dublin';
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
