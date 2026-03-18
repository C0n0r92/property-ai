// Use internal API route to avoid CORS issues when fetching from client
const DATA_API_URL = '/api/data';

// Data structure returned by the API
export interface DataResponse {
  properties: Property[];
  listings?: unknown[];
  rentals?: unknown[];
}

let cachedData: DataResponse | null = null;
let cacheTime = 0;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

export async function loadData(): Promise<DataResponse> {
  const now = Date.now();

  // Return cached data if still fresh
  if (cachedData && now - cacheTime < CACHE_DURATION) {
    return cachedData;
  }

  try {
    // Fetch from internal API route (handles CORS server-side)
    const response = await fetch(DATA_API_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`);
    }

    const data: DataResponse = await response.json();
    cachedData = data;
    cacheTime = now;

    return data;
  } catch (error) {
    console.error('Error loading data:', error);
    throw error;
  }
}

export interface Property {
  address: string;
  beds: number;
  baths: number;
  areaSqm: number;
  propertyType: string;
  soldPrice: number;
  askingPrice: number;
  overUnderPercent?: number;
  dublinPostcode?: string;
  latitude?: number;
  longitude?: number;
  yieldEstimate?: number;
  scrapedAt?: string;
}

export interface Comparable extends Property {
  soldDate?: string;
  daysSinceSold?: number;
}

export function findComparables(
  property: Property,
  allProperties: Property[],
  radius: number = 2000
): Comparable[] {
  if (!property.latitude || !property.longitude) {
    // Fallback: match by postcode and beds
    return allProperties
      .filter((p) => {
        const samePostcode = p.dublinPostcode === property.dublinPostcode;
        const propBeds = p.beds ?? 0;
        const thisBeds = property.beds ?? 0;
        const sameBeds = Math.abs(propBeds - thisBeds) <= 1;
        const sameType = p.propertyType === property.propertyType;
        return samePostcode && sameBeds && sameType;
      })
      .sort((a, b) => {
        const aDate = new Date(a.scrapedAt || 0).getTime();
        const bDate = new Date(b.scrapedAt || 0).getTime();
        return bDate - aDate;
      })
      .slice(0, 10);
  }

  // Geographic distance calculation
  function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  const comparables = allProperties
    .filter((p) => {
      if (!p.latitude || !p.longitude) return false;

      const distance = haversineDistance(
        property.latitude!,
        property.longitude!,
        p.latitude,
        p.longitude
      );

      const bedsDiff = Math.abs((p.beds || 0) - (property.beds || 0));
      const sameType = p.propertyType === property.propertyType;

      return distance <= radius && bedsDiff <= 1 && sameType;
    })
    .map((p) => ({
      ...p,
      daysSinceSold: Math.floor(
        (Date.now() - new Date(p.scrapedAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24)
      ),
    }))
    .sort((a, b) => {
      // Sort by recency
      const aDate = new Date(a.scrapedAt || 0).getTime();
      const bDate = new Date(b.scrapedAt || 0).getTime();
      return bDate - aDate;
    })
    .slice(0, 10);

  return comparables;
}

export function calculateStats(properties: Property[]) {
  if (properties.length === 0) {
    return null;
  }

  const prices = properties
    .map((p) => p.soldPrice || p.askingPrice)
    .filter((p) => p > 0)
    .sort((a, b) => a - b);

  const pricePerSqm = properties
    .filter((p) => p.areaSqm && p.areaSqm > 0)
    .map((p) => p.soldPrice ? p.soldPrice / p.areaSqm : p.askingPrice / p.areaSqm)
    .sort((a, b) => a - b);

  const overAskingPercents = properties
    .filter((p) => p.askingPrice && p.soldPrice)
    .map((p) => ((p.soldPrice! - p.askingPrice!) / p.askingPrice!) * 100);

  const median = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  };

  const average = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  return {
    medianPrice: Math.round(median(prices)),
    averagePrice: Math.round(average(prices)),
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    medianPricePerSqm: Math.round(median(pricePerSqm) * 100) / 100,
    averagePricePerSqm: Math.round(average(pricePerSqm) * 100) / 100,
    medianOverAskingPercent: Math.round(median(overAskingPercents) * 100) / 100,
    averageOverAskingPercent: Math.round(average(overAskingPercents) * 100) / 100,
    count: properties.length,
  };
}
