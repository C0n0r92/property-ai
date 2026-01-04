import { NextRequest, NextResponse } from 'next/server';
import { loadProperties, loadListings } from '@/lib/data';

// Calculate distance between two points in km (Haversine formula)
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '53.3498');
    const lng = parseFloat(searchParams.get('lng') || '-6.2603');
    const radiusKm = parseFloat(searchParams.get('radius') || '3');

    // Load data
    const [soldProperties, listings] = await Promise.all([
      loadProperties(),
      loadListings(),
    ]);

    // Filter to properties within radius
    const nearbyProperties = soldProperties.filter(p => {
      if (!p.latitude || !p.longitude) return false;
      const distance = getDistanceKm(lat, lng, p.latitude, p.longitude);
      return distance <= radiusKm;
    });

    const nearbyListings = listings.filter(l => {
      if (!l.latitude || !l.longitude) return false;
      const distance = getDistanceKm(lat, lng, l.latitude, l.longitude);
      return distance <= radiusKm;
    });

    // Calculate stats
    const prices = nearbyProperties.map(p => p.soldPrice).sort((a, b) => a - b);
    const medianPrice = prices.length > 0 
      ? prices[Math.floor(prices.length / 2)] 
      : 0;

    // Calculate YoY price change
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    
    const recentProperties = nearbyProperties.filter(p => {
      const soldDate = new Date(p.soldDate);
      return soldDate >= oneYearAgo;
    });
    
    const olderProperties = nearbyProperties.filter(p => {
      const soldDate = new Date(p.soldDate);
      const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      return soldDate >= twoYearsAgo && soldDate < oneYearAgo;
    });

    let priceChange = 0;
    if (recentProperties.length > 0 && olderProperties.length > 0) {
      const recentMedian = recentProperties
        .map(p => p.soldPrice)
        .sort((a, b) => a - b)[Math.floor(recentProperties.length / 2)];
      const olderMedian = olderProperties
        .map(p => p.soldPrice)
        .sort((a, b) => a - b)[Math.floor(olderProperties.length / 2)];
      
      priceChange = Math.round(((recentMedian - olderMedian) / olderMedian) * 100);
    }

    // Count new listings (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const newListings = nearbyListings.filter(l => {
      // Use first_seen_date if available, otherwise assume recent
      if (l.first_seen_date) {
        return new Date(l.first_seen_date) >= sevenDaysAgo;
      }
      return true; // Count all if no date
    }).length;

    // Find most common Eircode in the area
    const eircodeCounts: Record<string, number> = {};
    [...nearbyProperties, ...nearbyListings].forEach(item => {
      if (item.eircode) {
        eircodeCounts[item.eircode] = (eircodeCounts[item.eircode] || 0) + 1;
      }
    });

    const mostCommonEircode = Object.entries(eircodeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

    // Format median price
    const formatPrice = (price: number) => {
      if (price >= 1000000) {
        return `€${(price / 1000000).toFixed(1)}M`;
      }
      return `€${Math.round(price / 1000)}K`;
    };

    return NextResponse.json({
      avgPrice: formatPrice(medianPrice),
      avgPriceRaw: medianPrice,
      newListings: Math.min(newListings, 50), // Cap at 50 for display
      priceChange: priceChange,
      totalSold: nearbyProperties.length,
      totalListings: nearbyListings.length,
      radiusKm,
      eircode: mostCommonEircode,
    });
  } catch (error) {
    console.error('Location stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location stats' },
      { status: 500 }
    );
  }
}

