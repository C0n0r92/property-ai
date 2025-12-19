import { NextRequest, NextResponse } from 'next/server';
import { loadProperties, loadListings, loadRentals } from '@/lib/data';
import type { Property, Listing, RentalListing } from '@/types/property';

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * API endpoint for loading map data based on viewport bounds
 * Supports progressive loading and filtering by data source
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Parse bounds from query params
  const north = parseFloat(searchParams.get('north') || '90');
  const south = parseFloat(searchParams.get('south') || '-90');
  const east = parseFloat(searchParams.get('east') || '180');
  const west = parseFloat(searchParams.get('west') || '-180');
  
  // Data sources to load
  const sources = searchParams.get('sources')?.split(',') || ['sold'];

  // Time filter
  const timeFilter = searchParams.get('timeFilter');

  // Limit for initial load
  const limit = parseInt(searchParams.get('limit') || '5000');
  
  const bounds: MapBounds = { north, south, east, west };
  
  // Load only requested data sources
  const response: {
    properties?: Property[];
    listings?: Listing[];
    rentals?: RentalListing[];
    bounds: MapBounds;
    total: { properties: number; listings: number; rentals: number };
  } = {
    bounds,
    total: { properties: 0, listings: 0, rentals: 0 },
  };
  
  // Load properties (sold) if requested
  if (sources.includes('sold')) {
    let allProperties = loadProperties();

    // Apply time filter if specified
    if (timeFilter) {
      allProperties = allProperties.filter(p => {
        const soldDate = new Date(p.soldDate);
        const now = new Date();

        switch (timeFilter) {
          case 'today':
            return soldDate.toDateString() === now.toDateString();
          case 'thisWeek': {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
            startOfWeek.setHours(0, 0, 0, 0);
            return soldDate >= startOfWeek;
          }
          case 'thisMonth': {
            return soldDate.getMonth() === now.getMonth() && soldDate.getFullYear() === now.getFullYear();
          }
          case 'lastWeek': {
            const startOfLastWeek = new Date(now);
            startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
            startOfLastWeek.setHours(0, 0, 0, 0);
            const endOfLastWeek = new Date(startOfLastWeek);
            endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
            endOfLastWeek.setHours(23, 59, 59, 999);
            return soldDate >= startOfLastWeek && soldDate <= endOfLastWeek;
          }
          case 'lastMonth': {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
            return soldDate.getMonth() === lastMonth.getMonth() && soldDate.getFullYear() === lastMonth.getFullYear();
          }
          case 'last6Months': {
            const sixMonthsAgo = new Date(now);
            sixMonthsAgo.setMonth(now.getMonth() - 6);
            return soldDate >= sixMonthsAgo;
          }
          case 'last12Months': {
            const twelveMonthsAgo = new Date(now);
            twelveMonthsAgo.setFullYear(now.getFullYear() - 1);
            return soldDate >= twelveMonthsAgo;
          }
          default:
            return true;
        }
      });
    }

    const filtered = filterByBounds(allProperties, bounds);
    response.properties = filtered.slice(0, limit);
    response.total.properties = filtered.length;
  }

  // Load listings (for sale) if requested
  if (sources.includes('forSale')) {
    let allListings = loadListings();

    // Apply time filter if specified (filter by scrapedAt)
    if (timeFilter) {
      allListings = allListings.filter(l => {
        const scrapedDate = new Date(l.scrapedAt);
        const now = new Date();

        switch (timeFilter) {
          case 'today':
            return scrapedDate.toDateString() === now.toDateString();
          case 'thisWeek': {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
            startOfWeek.setHours(0, 0, 0, 0);
            return scrapedDate >= startOfWeek;
          }
          case 'thisMonth': {
            return scrapedDate.getMonth() === now.getMonth() && scrapedDate.getFullYear() === now.getFullYear();
          }
          case 'lastWeek': {
            const startOfLastWeek = new Date(now);
            startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
            startOfLastWeek.setHours(0, 0, 0, 0);
            const endOfLastWeek = new Date(startOfLastWeek);
            endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
            endOfLastWeek.setHours(23, 59, 59, 999);
            return scrapedDate >= startOfLastWeek && scrapedDate <= endOfLastWeek;
          }
          case 'lastMonth': {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
            return scrapedDate.getMonth() === lastMonth.getMonth() && scrapedDate.getFullYear() === lastMonth.getFullYear();
          }
          case 'last6Months': {
            const sixMonthsAgo = new Date(now);
            sixMonthsAgo.setMonth(now.getMonth() - 6);
            return scrapedDate >= sixMonthsAgo;
          }
          case 'last12Months': {
            const twelveMonthsAgo = new Date(now);
            twelveMonthsAgo.setFullYear(now.getFullYear() - 1);
            return scrapedDate >= twelveMonthsAgo;
          }
          default:
            return true;
        }
      });
    }

    const filtered = filterByBounds(allListings, bounds);
    response.listings = filtered.slice(0, limit);
    response.total.listings = filtered.length;
  }

  // Load rentals if requested
  if (sources.includes('rentals')) {
    let allRentals = loadRentals();

    // Apply time filter if specified (filter by scrapedAt)
    if (timeFilter) {
      allRentals = allRentals.filter(r => {
        const scrapedDate = new Date(r.scrapedAt);
        const now = new Date();

        switch (timeFilter) {
          case 'today':
            return scrapedDate.toDateString() === now.toDateString();
          case 'thisWeek': {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
            startOfWeek.setHours(0, 0, 0, 0);
            return scrapedDate >= startOfWeek;
          }
          case 'thisMonth': {
            return scrapedDate.getMonth() === now.getMonth() && scrapedDate.getFullYear() === now.getFullYear();
          }
          case 'lastWeek': {
            const startOfLastWeek = new Date(now);
            startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
            startOfLastWeek.setHours(0, 0, 0, 0);
            const endOfLastWeek = new Date(startOfLastWeek);
            endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
            endOfLastWeek.setHours(23, 59, 59, 999);
            return scrapedDate >= startOfLastWeek && scrapedDate <= endOfLastWeek;
          }
          case 'lastMonth': {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
            return scrapedDate.getMonth() === lastMonth.getMonth() && scrapedDate.getFullYear() === lastMonth.getFullYear();
          }
          case 'last6Months': {
            const sixMonthsAgo = new Date(now);
            sixMonthsAgo.setMonth(now.getMonth() - 6);
            return scrapedDate >= sixMonthsAgo;
          }
          case 'last12Months': {
            const twelveMonthsAgo = new Date(now);
            twelveMonthsAgo.setFullYear(now.getFullYear() - 1);
            return scrapedDate >= twelveMonthsAgo;
          }
          default:
            return true;
        }
      });
    }

    const filtered = filterByBounds(allRentals, bounds);
    response.rentals = filtered.slice(0, limit);
    response.total.rentals = filtered.length;
  }
  
  return NextResponse.json(response);
}

/**
 * Filter data by geographic bounds
 */
function filterByBounds<T extends { latitude?: number | null; longitude?: number | null }>(
  data: T[],
  bounds: MapBounds
): T[] {
  return data.filter(item => {
    if (!item.latitude || !item.longitude) return false;
    
    const { latitude, longitude } = item;
    
    // Handle longitude wrap-around for bounds crossing 180/-180
    const inLongitude = bounds.west <= bounds.east
      ? longitude >= bounds.west && longitude <= bounds.east
      : longitude >= bounds.west || longitude <= bounds.east;
    
    const inLatitude = latitude >= bounds.south && latitude <= bounds.north;
    
    return inLatitude && inLongitude;
  });
}

