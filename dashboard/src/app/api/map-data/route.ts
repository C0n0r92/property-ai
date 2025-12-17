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
    const allProperties = loadProperties();
    const filtered = filterByBounds(allProperties, bounds);
    response.properties = filtered.slice(0, limit);
    response.total.properties = filtered.length;
  }
  
  // Load listings (for sale) if requested
  if (sources.includes('forSale')) {
    const allListings = loadListings();
    const filtered = filterByBounds(allListings, bounds);
    response.listings = filtered.slice(0, limit);
    response.total.listings = filtered.length;
  }
  
  // Load rentals if requested
  if (sources.includes('rentals')) {
    const allRentals = loadRentals();
    const filtered = filterByBounds(allRentals, bounds);
    response.rentals = filtered.slice(0, limit);
    response.total.rentals = filtered.length;
  }
  
  return NextResponse.json(response);
}

/**
 * Filter data by geographic bounds
 */
function filterByBounds<T extends { latitude?: number; longitude?: number }>(
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

