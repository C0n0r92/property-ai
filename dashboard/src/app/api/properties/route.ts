import { NextRequest, NextResponse } from 'next/server';
import { loadProperties, getMarketStats, getAreaStats } from '@/lib/data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  let properties = loadProperties();
  
  // Apply filters
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const minBeds = searchParams.get('minBeds');
  const propertyTypes = searchParams.get('propertyTypes')?.split(',').filter(Boolean);
  const timeFilter = searchParams.get('timeFilter');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const sortBy = searchParams.get('sortBy') || 'soldDate';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  
  // Filter
  if (minPrice) {
    properties = properties.filter(p => p.soldPrice >= parseInt(minPrice));
  }
  if (maxPrice) {
    properties = properties.filter(p => p.soldPrice <= parseInt(maxPrice));
  }
  if (minBeds) {
    properties = properties.filter(p => (p.beds || 0) >= parseInt(minBeds));
  }
  if (propertyTypes && propertyTypes.length > 0) {
    properties = properties.filter(p =>
      propertyTypes.some(t => p.propertyType?.toLowerCase().includes(t.toLowerCase()))
    );
  }

  // Time filter
  if (timeFilter) {
    properties = properties.filter(p => {
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
        default:
          return true;
      }
    });
  }
  
  // Sort
  properties.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'soldPrice':
        comparison = a.soldPrice - b.soldPrice;
        break;
      case 'pricePerSqm':
        comparison = (a.pricePerSqm || 0) - (b.pricePerSqm || 0);
        break;
      case 'overUnderPercent':
        comparison = a.overUnderPercent - b.overUnderPercent;
        break;
      case 'soldDate':
      default:
        comparison = new Date(a.soldDate).getTime() - new Date(b.soldDate).getTime();
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });
  
  // Paginate
  const total = properties.length;
  const start = (page - 1) * limit;
  const paginatedProperties = properties.slice(start, start + limit);
  
  // Get stats for filtered data
  const stats = getMarketStats(properties);
  
  return NextResponse.json({
    properties: paginatedProperties,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    stats,
  });
}





