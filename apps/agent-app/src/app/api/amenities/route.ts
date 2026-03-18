import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { fetchAmenities, calculateWalkabilityScore } from '@/lib/amenities';

// Helper to decode JWT and get user ID
function getUserIdFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.sub || null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    let userId: string | null = null;

    const supabase = await createClient();
    const { data: { user: sessionUser } } = await supabase.auth.getUser();

    if (sessionUser) {
      userId = sessionUser.id;
    } else {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        userId = getUserIdFromToken(token);
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get coordinates from query params
    const searchParams = request.nextUrl.searchParams;
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const radius = parseInt(searchParams.get('radius') || '1000');

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Valid lat and lng parameters are required' },
        { status: 400 }
      );
    }

    // Fetch amenities from Overpass API
    const amenities = await fetchAmenities(lat, lng, radius);
    const walkabilityScore = calculateWalkabilityScore(amenities);

    return NextResponse.json({
      amenities,
      walkabilityScore,
      count: amenities.length,
    });
  } catch (error) {
    console.error('Amenities API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch amenities' },
      { status: 500 }
    );
  }
}
