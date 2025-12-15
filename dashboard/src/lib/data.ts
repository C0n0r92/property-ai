import { Property, MarketStats, AreaStats, Listing, ListingStats } from '@/types/property';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Cache for properties data
let propertiesCache: Property[] | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Cache for listings data
let listingsCache: Listing[] | null = null;
let listingsCacheTime: number = 0;

/**
 * Load properties from JSON file with caching
 */
export function loadProperties(): Property[] {
  const now = Date.now();
  
  if (propertiesCache && (now - cacheTime) < CACHE_TTL) {
    return propertiesCache;
  }
  
  try {
    const dataPath = join(process.cwd(), '..', 'scraper', 'data', 'properties.json');
    const data = readFileSync(dataPath, 'utf-8');
    propertiesCache = JSON.parse(data);
    cacheTime = now;
    
    // Filter out bad data (future dates, very old dates, extreme prices)
    propertiesCache = propertiesCache!.filter(p => {
      const year = parseInt(p.soldDate?.split('-')[0] || '0');
      return year >= 2020 && year <= 2025 && p.soldPrice >= 50000 && p.soldPrice <= 20000000;
    });
    
    return propertiesCache;
  } catch (error) {
    console.error('Error loading properties:', error);
    return [];
  }
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
 * Load for-sale listings from JSON file with caching
 */
export function loadListings(): Listing[] {
  const now = Date.now();
  
  if (listingsCache && (now - listingsCacheTime) < CACHE_TTL) {
    return listingsCache;
  }
  
  try {
    const dataPath = join(process.cwd(), '..', 'scraper', 'data', 'listings.json');
    
    if (!existsSync(dataPath)) {
      console.log('Listings file not found:', dataPath);
      return [];
    }
    
    const data = readFileSync(dataPath, 'utf-8');
    listingsCache = JSON.parse(data);
    listingsCacheTime = now;
    
    // Filter out invalid data (no price, extreme prices)
    listingsCache = listingsCache!.filter(l => 
      l.askingPrice >= 50000 && l.askingPrice <= 50000000
    );
    
    return listingsCache;
  } catch (error) {
    console.error('Error loading listings:', error);
    return [];
  }
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

