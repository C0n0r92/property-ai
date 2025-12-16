import { Property, MarketStats, AreaStats, Listing, ListingStats, RentalListing, RentalStats } from '@/types/property';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

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
 * Load unified data.json with caching
 */
function loadData(): ConsolidatedData {
  const now = Date.now();
  
  if (dataCache && (now - cacheTime) < CACHE_TTL) {
    return dataCache;
  }
  
  try {
    // Try to load from consolidated data.json first
    const consolidatedPath = join(process.cwd(), '..', 'scraper', 'data', 'data.json');
    
    if (existsSync(consolidatedPath)) {
      const data = readFileSync(consolidatedPath, 'utf-8');
      dataCache = JSON.parse(data);
      cacheTime = now;
      console.log(`Loaded consolidated data: ${dataCache!.properties.length} properties, ${dataCache!.listings.length} listings, ${dataCache!.rentals.length} rentals`);
      return dataCache!;
    }
    
    // Fallback to separate files if data.json doesn't exist
    console.log('data.json not found, falling back to separate files');
    return loadFromSeparateFiles();
  } catch (error) {
    console.error('Error loading consolidated data:', error);
    return loadFromSeparateFiles();
  }
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
 * Load properties from unified data with filtering
 */
export function loadProperties(): Property[] {
  const data = loadData();
  
  // Filter out bad data (future dates, very old dates, extreme prices)
  return data.properties.filter(p => {
    const year = parseInt(p.soldDate?.split('-')[0] || '0');
    return year >= 2020 && year <= 2025 && p.soldPrice >= 50000 && p.soldPrice <= 20000000;
  });
}

/**
 * Load listings from unified data with filtering
 */
export function loadListings(): Listing[] {
  const data = loadData();
  
  // Filter out invalid data (no price, extreme prices)
  return data.listings.filter(l => 
    l.askingPrice >= 50000 && l.askingPrice <= 50000000
  );
}

/**
 * Load rentals from unified data with filtering
 */
export function loadRentals(): RentalListing[] {
  const data = loadData();
  
  // Filter out invalid data (no rent, extreme rents)
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
