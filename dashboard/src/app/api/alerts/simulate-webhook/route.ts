import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { createClient } from '@/lib/supabase/server';

/**
 * Simulate webhook for local testing
 * POST /api/alerts/simulate-webhook
 *
 * This endpoint simulates what the Stripe webhook does after payment
 * It should be called manually after a successful payment in local development
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // For simulation, we'll create a mock alert based on the last alert config
    // In production, this data comes from Stripe webhook metadata
    const mockAlertConfig = {
      location_name: 'Dublin Test Location',
      location_coordinates: { lat: 53.3498, lng: -6.2603 },
      radius_km: 2,
      monitor_sale: true,
      monitor_rental: false,
      monitor_sold: false,
      sale_min_bedrooms: 2,
      sale_max_bedrooms: 4,
      sale_min_price: 200000,
      sale_max_price: 500000,
    };

    const supabase = await createClient();

    // Calculate expiry date (12 months from now)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 12);

    // Create the alert record (simulating webhook logic)
    const { data: alert, error } = await supabase
      .from('location_alerts')
      .insert({
        user_id: user.id,
        location_name: mockAlertConfig.location_name,
        location_coordinates: `POINT(${mockAlertConfig.location_coordinates.lng} ${mockAlertConfig.location_coordinates.lat})`,
        search_radius_km: mockAlertConfig.radius_km,
        monitor_sold: mockAlertConfig.monitor_sold,
        monitor_sale: mockAlertConfig.monitor_sale,
        monitor_rental: mockAlertConfig.monitor_rental,
        sale_min_bedrooms: mockAlertConfig.sale_min_bedrooms,
        sale_max_bedrooms: mockAlertConfig.sale_max_bedrooms,
        sale_min_price: mockAlertConfig.sale_min_price,
        sale_max_price: mockAlertConfig.sale_max_price,
        sale_alert_on_new: true,
        sale_alert_on_price_drops: true,
        stripe_payment_id: `simulated_${Date.now()}`,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        last_checked: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating simulated alert:', error);
      return NextResponse.json(
        { error: 'Failed to create alert' },
        { status: 500 }
      );
    }

    console.log('✅ Simulated webhook: Alert created successfully');

    return NextResponse.json({
      success: true,
      alert: alert,
      message: 'Alert created successfully via simulated webhook'
    });

  } catch (error) {
    console.error('Simulate webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
