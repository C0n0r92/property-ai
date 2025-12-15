import { NextRequest, NextResponse } from 'next/server';
import { loadListings, getListingStats } from '@/lib/data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  let listings = loadListings();
  
  // Apply filters
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const minBeds = searchParams.get('minBeds');
  const propertyTypes = searchParams.get('propertyTypes')?.split(',').filter(Boolean);
  const berRatings = searchParams.get('berRatings')?.split(',').filter(Boolean);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const sortBy = searchParams.get('sortBy') || 'askingPrice';
  const sortOrder = searchParams.get('sortOrder') || 'asc';
  
  // Filter by price
  if (minPrice) {
    listings = listings.filter(l => l.askingPrice >= parseInt(minPrice));
  }
  if (maxPrice) {
    listings = listings.filter(l => l.askingPrice <= parseInt(maxPrice));
  }
  
  // Filter by beds
  if (minBeds) {
    listings = listings.filter(l => (l.beds || 0) >= parseInt(minBeds));
  }
  
  // Filter by property types
  if (propertyTypes && propertyTypes.length > 0) {
    listings = listings.filter(l => 
      propertyTypes.some(t => l.propertyType?.toLowerCase().includes(t.toLowerCase()))
    );
  }
  
  // Filter by BER rating
  if (berRatings && berRatings.length > 0) {
    listings = listings.filter(l => 
      l.berRating && berRatings.some(r => l.berRating?.toUpperCase().startsWith(r.toUpperCase()))
    );
  }
  
  // Sort
  listings.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'askingPrice':
        comparison = a.askingPrice - b.askingPrice;
        break;
      case 'pricePerSqm':
        comparison = (a.pricePerSqm || 0) - (b.pricePerSqm || 0);
        break;
      case 'beds':
        comparison = (a.beds || 0) - (b.beds || 0);
        break;
      case 'scrapedAt':
      default:
        comparison = new Date(a.scrapedAt).getTime() - new Date(b.scrapedAt).getTime();
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });
  
  // Paginate
  const total = listings.length;
  const start = (page - 1) * limit;
  const paginatedListings = listings.slice(start, start + limit);
  
  // Get stats for filtered data
  const stats = getListingStats(listings);
  
  return NextResponse.json({
    listings: paginatedListings,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    stats,
  });
}

