import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  fetchPlanningApplications,
  scorePlanningApplication,
  calculatePlanningInsight,
  getPropertyPlanningHistory,
} from '@/lib/planning';

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

    // Get parameters from query
    const searchParams = request.nextUrl.searchParams;
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const address = searchParams.get('address') || '';
    const postcode = searchParams.get('postcode') || undefined;
    const radius = parseInt(searchParams.get('radius') || '150');

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Valid lat and lng parameters are required' },
        { status: 400 }
      );
    }

    // Fetch planning applications from ArcGIS
    const applications = await fetchPlanningApplications(lat, lng, radius);

    // Score each application against the property address
    const scoredApplications = applications.map(app =>
      scorePlanningApplication(app, {
        propertyAddress: address,
        dublinPostcode: postcode,
        searchRadius: radius as 50 | 100 | 150,
      })
    );

    // Sort by score (highest first)
    scoredApplications.sort((a, b) => b.score - a.score);

    // Calculate insights
    const insight = calculatePlanningInsight(scoredApplications);
    const propertyHistory = getPropertyPlanningHistory(scoredApplications);

    return NextResponse.json({
      applications: scoredApplications.slice(0, 20), // Limit to top 20
      insight,
      propertyHistory,
      totalCount: applications.length,
      searchRadius: radius,
    });
  } catch (error) {
    console.error('Planning API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch planning data' },
      { status: 500 }
    );
  }
}
