import { NextRequest, NextResponse } from 'next/server';
import { loadRentals, getRentalStats } from '@/lib/data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  let rentals = loadRentals();
  
  // Apply filters
  const minRent = searchParams.get('minRent');
  const maxRent = searchParams.get('maxRent');
  const minBeds = searchParams.get('minBeds');
  const propertyTypes = searchParams.get('propertyTypes')?.split(',').filter(Boolean);
  const berRatings = searchParams.get('berRatings')?.split(',').filter(Boolean);
  const furnishing = searchParams.get('furnishing');
  const timeFilter = searchParams.get('timeFilter');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const sortBy = searchParams.get('sortBy') || 'monthlyRent';
  const sortOrder = searchParams.get('sortOrder') || 'asc';
  
  // Filter by rent
  if (minRent) {
    rentals = rentals.filter(r => r.monthlyRent >= parseInt(minRent));
  }
  if (maxRent) {
    rentals = rentals.filter(r => r.monthlyRent <= parseInt(maxRent));
  }
  
  // Filter by beds
  if (minBeds) {
    rentals = rentals.filter(r => (r.beds || 0) >= parseInt(minBeds));
  }
  
  // Filter by property types
  if (propertyTypes && propertyTypes.length > 0) {
    rentals = rentals.filter(r => 
      propertyTypes.some(t => r.propertyType?.toLowerCase().includes(t.toLowerCase()))
    );
  }
  
  // Filter by BER rating
  if (berRatings && berRatings.length > 0) {
    rentals = rentals.filter(r => 
      r.berRating && berRatings.some(rating => r.berRating?.toUpperCase().startsWith(rating.toUpperCase()))
    );
  }
  
  // Filter by furnishing
  if (furnishing) {
    rentals = rentals.filter(r =>
      r.furnishing?.toLowerCase().includes(furnishing.toLowerCase())
    );
  }

  // Time filter
  if (timeFilter) {
    rentals = rentals.filter(r => {
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
        default:
          return true;
      }
    });
  }

  // Sort
  rentals.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'monthlyRent':
        comparison = a.monthlyRent - b.monthlyRent;
        break;
      case 'rentPerSqm':
        comparison = (a.rentPerSqm || 0) - (b.rentPerSqm || 0);
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
  const total = rentals.length;
  const start = (page - 1) * limit;
  const paginatedRentals = rentals.slice(start, start + limit);
  
  // Get stats for filtered data
  const stats = getRentalStats(rentals);
  
  return NextResponse.json({
    rentals: paginatedRentals,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    stats,
  });
}

