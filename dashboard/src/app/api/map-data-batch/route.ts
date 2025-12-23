import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

  // Batch parameters - increased default for better performance
  const offset = parseInt(searchParams.get('offset') || '0');
  const limit = parseInt(searchParams.get('limit') || '10000');
  
  // Cursor-based pagination (preferred over offset for large datasets)
  const cursorDate = searchParams.get('cursorDate'); // Last sold_date from previous batch
  const cursorId = searchParams.get('cursorId'); // Last id from previous batch (for ties)
  
  const bounds: MapBounds = { north, south, east, west };
  
  // Load only requested data sources
  const response: {
    properties?: Property[];
    listings?: Listing[];
    rentals?: RentalListing[];
    bounds: MapBounds;
    total: { properties: number; listings: number; rentals: number };
    hasMore: { properties: boolean; listings: boolean; rentals: boolean };
  } = {
    bounds,
    total: { properties: 0, listings: 0, rentals: 0 },
    hasMore: { properties: false, listings: false, rentals: false },
  };
  
  const supabase = await createClient();
  
  // Load properties (sold) if requested
  if (sources.includes('sold')) {
    // Query sold_properties table directly with pagination
    // Use cursor-based pagination to avoid PostgREST's offset limits (typically 10k max)
    let query = supabase
      .from('sold_properties')
      .select('*', { count: 'exact' })
      .order('sold_date', { ascending: false })
      .order('id', { ascending: false }); // Secondary sort for stable pagination

    // If we have a cursor (last seen sold_date and id), use it instead of offset
    if (cursorDate && cursorId) {
      // Get records older than the cursor
      query = query.or(`sold_date.lt.${cursorDate},and(sold_date.eq.${cursorDate},id.lt.${cursorId})`);
    }

    // Apply time filter if specified
    if (timeFilter) {
      const now = new Date();
      let dateFilter: Date;

      switch (timeFilter) {
        case 'today':
          dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          query = query.gte('sold_date', dateFilter.toISOString().split('T')[0]);
          break;
        case 'thisWeek': {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          query = query.gte('sold_date', startOfWeek.toISOString().split('T')[0]);
          break;
        }
        case 'thisMonth':
          dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
          query = query.gte('sold_date', dateFilter.toISOString().split('T')[0]);
          break;
        case 'lastWeek': {
          const startOfLastWeek = new Date(now);
          startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
          startOfLastWeek.setHours(0, 0, 0, 0);
          const endOfLastWeek = new Date(startOfLastWeek);
          endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
          endOfLastWeek.setHours(23, 59, 59, 999);
          query = query.gte('sold_date', startOfLastWeek.toISOString().split('T')[0])
                   .lte('sold_date', endOfLastWeek.toISOString().split('T')[0]);
          break;
        }
        case 'lastMonth': {
          dateFilter = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          query = query.gte('sold_date', dateFilter.toISOString().split('T')[0]);
          break;
        }
        case 'last6Months': {
          const sixMonthsAgo = new Date(now);
          sixMonthsAgo.setMonth(now.getMonth() - 6);
          query = query.gte('sold_date', sixMonthsAgo.toISOString().split('T')[0]);
          break;
        }
        case 'last12Months': {
          const twelveMonthsAgo = new Date(now);
          twelveMonthsAgo.setFullYear(now.getFullYear() - 1);
          query = query.gte('sold_date', twelveMonthsAgo.toISOString().split('T')[0]);
          break;
        }
      }
    }

    // Apply limit only (no offset for cursor-based pagination)
    // Apply pagination - note: Supabase has a default max of 10k rows
    // We need to use .limit() to ensure we can paginate beyond 10k total rows
    query = query.limit(limit);

    const { data: propertiesData, error, count } = await query;

    if (error) {
      console.warn('Failed to load properties:', error.message);
    } else if (propertiesData && propertiesData.length > 0) {
      // Transform data into Property format and apply filtering
      const properties: Property[] = propertiesData
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
          // Be more lenient with filtering to include more data
          return year >= 2015 && year <= 2025 && p.soldPrice >= 10000 && p.soldPrice <= 50000000;
        });

      response.properties = properties;
      response.total.properties = count || 0;
      response.hasMore.properties = properties.length === limit;
      
      // Return cursor for next batch (last item's sold_date and id)
      if (properties.length > 0) {
        const lastProperty = propertiesData[propertiesData.length - 1];
        (response as any).cursor = {
          properties: {
            date: lastProperty.sold_date,
            id: lastProperty.id
          }
        };
      }
    }
  }

  // Load listings (for sale) if requested
  if (sources.includes('forSale')) {
    let query = supabase
      .from('property_listings')
      .select('*', { count: 'exact' })
      .order('last_seen_date', { ascending: false })
      .order('id', { ascending: false }); // Secondary sort for stable pagination

    // If we have a cursor (last seen scraped_at and id), use it instead of offset
    if (cursorDate && cursorId) {
      // Get records older than the cursor
      query = query.or(`last_seen_date.lt.${cursorDate},and(last_seen_date.eq.${cursorDate},id.lt.${cursorId})`);
    }

    // Apply time filter if specified (filter by scrapedAt)
    if (timeFilter) {
      const now = new Date();
      let dateFilter: Date;
      
      switch (timeFilter) {
        case 'today':
          dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          query = query.gte('scraped_at', dateFilter.toISOString());
          break;
        case 'thisWeek': {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          query = query.gte('scraped_at', startOfWeek.toISOString());
          break;
        }
        case 'thisMonth':
          dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
          query = query.gte('scraped_at', dateFilter.toISOString());
          break;
        case 'lastWeek': {
          const startOfLastWeek = new Date(now);
          startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
          startOfLastWeek.setHours(0, 0, 0, 0);
          const endOfLastWeek = new Date(startOfLastWeek);
          endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
          endOfLastWeek.setHours(23, 59, 59, 999);
          query = query.gte('scraped_at', startOfLastWeek.toISOString())
                   .lte('scraped_at', endOfLastWeek.toISOString());
          break;
        }
        case 'lastMonth': {
          dateFilter = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          query = query.gte('scraped_at', dateFilter.toISOString());
          break;
        }
        case 'last6Months': {
          const sixMonthsAgo = new Date(now);
          sixMonthsAgo.setMonth(now.getMonth() - 6);
          query = query.gte('scraped_at', sixMonthsAgo.toISOString());
          break;
        }
        case 'last12Months': {
          const twelveMonthsAgo = new Date(now);
          twelveMonthsAgo.setFullYear(now.getFullYear() - 1);
          query = query.gte('scraped_at', twelveMonthsAgo.toISOString());
          break;
        }
      }
    }

    // Apply limit only (no offset for cursor-based pagination)
    query = query.limit(limit);

    const { data: listingsData, error, count } = await query;

    if (error) {
      console.warn('Failed to load listings:', error.message);
    } else if (listingsData && listingsData.length > 0) {
      const listings: Listing[] = listingsData
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
          berRating: null,
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
        .filter(l => l.askingPrice >= 10000 && l.askingPrice <= 100000000); // More lenient filtering

      response.listings = listings;
      response.total.listings = listings.length > 0 ? (count || 0) : 0;
      response.hasMore.listings = listings.length === limit;

      // Return cursor for next batch (last item's last_seen_date and id)
      if (listings.length > 0) {
        const lastListing = listingsData[listingsData.length - 1];
        (response as any).cursor = (response as any).cursor || {};
        (response as any).cursor.listings = {
          date: lastListing.last_seen_date,
          id: lastListing.id
        };
      }
    }
  }

  // Load rentals if requested
  if (sources.includes('rentals')) {
    let query = supabase
      .from('rental_listings')
      .select('*', { count: 'exact' })
      .order('last_seen_date', { ascending: false })
      .order('id', { ascending: false }); // Secondary sort for stable pagination

    // If we have a cursor (last seen scraped_at and id), use it instead of offset
    if (cursorDate && cursorId) {
      // Get records older than the cursor
      query = query.or(`last_seen_date.lt.${cursorDate},and(last_seen_date.eq.${cursorDate},id.lt.${cursorId})`);
    }

    // Apply time filter if specified (filter by scrapedAt)
    if (timeFilter) {
      const now = new Date();
      let dateFilter: Date;
      
      switch (timeFilter) {
        case 'today':
          dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          query = query.gte('scraped_at', dateFilter.toISOString());
          break;
        case 'thisWeek': {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          query = query.gte('scraped_at', startOfWeek.toISOString());
          break;
        }
        case 'thisMonth':
          dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
          query = query.gte('scraped_at', dateFilter.toISOString());
          break;
        case 'lastWeek': {
          const startOfLastWeek = new Date(now);
          startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
          startOfLastWeek.setHours(0, 0, 0, 0);
          const endOfLastWeek = new Date(startOfLastWeek);
          endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
          endOfLastWeek.setHours(23, 59, 59, 999);
          query = query.gte('scraped_at', startOfLastWeek.toISOString())
                   .lte('scraped_at', endOfLastWeek.toISOString());
          break;
        }
        case 'lastMonth': {
          dateFilter = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          query = query.gte('scraped_at', dateFilter.toISOString());
          break;
        }
        case 'last6Months': {
          const sixMonthsAgo = new Date(now);
          sixMonthsAgo.setMonth(now.getMonth() - 6);
          query = query.gte('scraped_at', sixMonthsAgo.toISOString());
          break;
        }
        case 'last12Months': {
          const twelveMonthsAgo = new Date(now);
          twelveMonthsAgo.setFullYear(now.getFullYear() - 1);
          query = query.gte('scraped_at', twelveMonthsAgo.toISOString());
          break;
        }
      }
    }

    // Apply limit only (no offset for cursor-based pagination)
    query = query.limit(limit);

    const { data: rentalsData, error, count } = await query;

    if (error) {
      console.warn('Failed to load rentals:', error.message);
    } else if (rentalsData && rentalsData.length > 0) {
      const rentals: RentalListing[] = rentalsData
        .map(p => ({
          id: p.id,
          address: p.address,
          propertyType: p.property_type,
          beds: p.beds,
          baths: p.baths,
          areaSqm: p.area_sqm,
          monthlyRent: p.monthly_rent,
          furnishing: p.furnishing,
          leaseType: p.lease_type,
          latitude: p.latitude,
          longitude: p.longitude,
          eircode: p.eircode,
          dublinPostcode: p.dublin_postcode,
          berRating: null,
          rentPerSqm: p.rent_per_sqm,
          rentPerBed: null,
          sourcePage: p.source_page,
          sourceUrl: p.source_url,
          scrapedAt: p.scraped_at,
          nominatimAddress: p.nominatim_address,
          yieldEstimate: p.yield_estimate,
          rentHistory: p.price_history as any || []
        }))
        .filter(r => r.monthlyRent >= 200 && r.monthlyRent <= 50000); // More lenient filtering

      response.rentals = rentals;
      response.total.rentals = rentals.length > 0 ? (count || 0) : 0;
      response.hasMore.rentals = rentals.length === limit;

      // Return cursor for next batch (last item's last_seen_date and id)
      if (rentals.length > 0) {
        const lastRental = rentalsData[rentalsData.length - 1];
        (response as any).cursor = (response as any).cursor || {};
        (response as any).cursor.rentals = {
          date: lastRental.last_seen_date,
          id: lastRental.id
        };
      }
    }
  }
  
  // Return response without compression for now to debug
  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
    },
  });
}

