import { NextRequest, NextResponse } from 'next/server';
import { loadListings, getListingStats } from '@/lib/data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  let listings = await loadListings();
  
  // Apply filters
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const minBeds = searchParams.get('minBeds');
  const propertyTypes = searchParams.get('propertyTypes')?.split(',').filter(Boolean);
  const berRatings = searchParams.get('berRatings')?.split(',').filter(Boolean);
  const timeFilter = searchParams.get('timeFilter');
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

  // Time filter
  if (timeFilter) {
    listings = listings.filter(l => {
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
        default:
          return true;
      }
    });
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

