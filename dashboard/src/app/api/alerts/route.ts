import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { createClient } from '@/lib/supabase/server';
import { analytics } from '@/lib/analytics';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Fetch user's alerts
    const { data: alerts, error } = await supabase
      .from('location_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching alerts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch alerts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ alerts: alerts || [] });
  } catch (error: unknown) {
    console.error('Alerts API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    const {
      location_name,
      location_coordinates,
      radius_km,
      monitor_sale,
      monitor_rental,
      monitor_sold,
      is_free_tier: requestedFreeTier  // Explicit flag from form
    } = await request.json();

    if (!location_name || !location_coordinates) {
      return NextResponse.json(
        { error: 'Location name and coordinates are required' },
        { status: 400 }
      );
    }

    // Determine if this is a free tier alert
    const isFreeTier = requestedFreeTier === true;

    // Check user tier - premium users can create unlimited alerts
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Unable to verify user account status' },
        { status: 500 }
      );
    }

    const userTier = userProfile.tier || 'free';

    // Check if user already has a free alert (only applies to free tier users)
    if (isFreeTier && userTier === 'free') {
      try {
        // Try to check for free alerts using is_free_tier column, but fall back if column doesn't exist
        let freeAlertCount = 0;
        let countError = null;

        try {
          const result = await supabase
            .from('location_alerts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_free_tier', true);
          freeAlertCount = result.count || 0;
        } catch (columnError) {
          // If column doesn't exist, check total alerts for free users (assume all are free)
          const result = await supabase
            .from('location_alerts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);
          freeAlertCount = result.count || 0;
          countError = result.error;
        }

        if (!countError && freeAlertCount >= 3) {
          return NextResponse.json(
            {
              error: 'Free tier users are limited to 3 active alerts. Upgrade to premium for unlimited alerts.',
              requiresUpgrade: true
            },
            { status: 403 }
          );
        }
      } catch (err) {
        console.error('Unexpected error checking free alerts:', err);
        // Continue with alert creation if we can't check
      }
    }

    // Calculate expiry date (12 months for both free and paid)
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    // Create the alert
    const alertData: any = {
      user_id: user.id,
      location_name,
      location_coordinates: `POINT(${location_coordinates.lng} ${location_coordinates.lat})`,
      search_radius_km: radius_km || 5,
      monitor_sale: monitor_sale || false,
      monitor_rental: monitor_rental || false,
      monitor_sold: monitor_sold || false,
      status: 'active',
      expires_at: expiresAt  // Always set (NOT NULL column)
    };

    // Only add is_free_tier if it's a free tier alert and the column exists
    if (isFreeTier && userTier === 'free') {
      try {
        // Test if the column exists by attempting to select it
        await supabase.from('location_alerts').select('is_free_tier').limit(1);
        alertData.is_free_tier = true;
      } catch (columnError) {
        // Column doesn't exist, skip setting the flag
      }
    }

    const { data: alert, error: createError } = await supabase
      .from('location_alerts')
      .insert(alertData)
      .select()
      .single();

    if (createError) {
      console.error('Error creating alert:', createError);
      return NextResponse.json(
        { error: 'Failed to create alert' },
        { status: 500 }
      );
    }

    // Track analytics
    if (isFreeTier) {
      analytics.freeAlertCreated(alert.id, location_name, 'location');
      console.log('Free alert created:', alert.id);
    } else {
      analytics.paidAlertCreated(alert.id, location_name, 0.99, 'location');
      console.log('Paid alert created:', alert.id);
    }

    return NextResponse.json({
      alert,
      message: 'Alert created successfully'
    });

  } catch (error: unknown) {
    console.error('Alerts POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
