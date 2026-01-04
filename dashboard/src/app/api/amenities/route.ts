import { NextRequest, NextResponse } from 'next/server';
import { fetchAmenities } from '@/lib/amenities';

/**
 * API endpoint for fetching amenities data
 * GET /api/amenities?lat=53.35&lng=-6.45&radius=2000
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius') || '2000';

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Missing lat/lng parameters' },
        { status: 400 }
      );
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusNum = parseInt(radius);

    if (isNaN(latNum) || isNaN(lngNum) || isNaN(radiusNum)) {
      return NextResponse.json(
        { error: 'Invalid lat/lng/radius parameters' },
        { status: 400 }
      );
    }

    console.log(`🌍 Fetching amenities for ${latNum}, ${lngNum} with radius ${radiusNum}m`);

    // Fetch amenities using our lib function
    const amenities = await fetchAmenities(latNum, lngNum, radiusNum);

    console.log(`✅ Found ${amenities.length} amenities`);

    return NextResponse.json({
      amenities,
      count: amenities.length,
      location: { lat: latNum, lng: lngNum, radius: radiusNum }
    });

  } catch (error) {
    console.error('❌ Amenities API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch amenities data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
