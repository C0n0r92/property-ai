import { NextRequest, NextResponse } from 'next/server';
import type { Property, Listing, RentalListing } from '@/types/property';

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * API endpoint for loading map data in batches
 * Supports progressive loading with offset/limit
 * NOTE: Map now loads directly from JSON file, this endpoint is deprecated
 */
export async function GET(request: NextRequest) {
  // Since map now loads directly from JSON, return empty response
  return NextResponse.json({
    properties: [],
    listings: [],
    rentals: [],
    bounds: { north: 90, south: -90, east: 180, west: -180 },
    total: { properties: 0, listings: 0, rentals: 0 },
    hasMore: { properties: false, listings: false, rentals: false },
  });
}
