import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in to continue' },
        { status: 401 }
      );
    }

    const { alertConfig } = await request.json();

    if (!alertConfig) {
      return NextResponse.json(
        { error: 'Alert configuration is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Calculate expiry date (12 months from now)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 12);

    // Create the alert record
    const { data: alert, error } = await supabase
      .from('location_alerts')
      .insert({
        user_id: user.id,
        location_name: alertConfig.location_name,
        location_coordinates: `POINT(${alertConfig.location_coordinates.lng} ${alertConfig.location_coordinates.lat})`,
        search_radius_km: alertConfig.radius_km,
        monitor_sold: alertConfig.monitor_sold,
        monitor_sale: alertConfig.monitor_sale,
        monitor_rental: alertConfig.monitor_rental,
        sale_min_bedrooms: alertConfig.sale_min_bedrooms,
        sale_max_bedrooms: alertConfig.sale_max_bedrooms,
        sale_min_price: alertConfig.sale_min_price,
        sale_max_price: alertConfig.sale_max_price,
        sale_alert_on_new: alertConfig.sale_alert_on_new,
        sale_alert_on_price_drops: alertConfig.sale_alert_on_price_drops,
        rental_min_bedrooms: alertConfig.rental_min_bedrooms,
        rental_max_bedrooms: alertConfig.rental_max_bedrooms,
        rental_min_price: alertConfig.rental_min_price,
        rental_max_price: alertConfig.rental_max_price,
        rental_alert_on_new: alertConfig.rental_alert_on_new,
        sold_min_bedrooms: alertConfig.sold_min_bedrooms,
        sold_max_bedrooms: alertConfig.sold_max_bedrooms,
        sold_price_threshold_percent: alertConfig.sold_price_threshold_percent,
        sold_alert_on_under_asking: alertConfig.sold_alert_on_under_asking,
        sold_alert_on_over_asking: alertConfig.sold_alert_on_over_asking,
        stripe_payment_id: `test_${Date.now()}`, // Test payment ID
        status: 'active',
        expires_at: expiresAt.toISOString(),
        last_checked: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create alert record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      alert: alert,
      message: 'Alert created successfully for testing'
    });

  } catch (error: unknown) {
    console.error('Test alert creation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create test alert';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
