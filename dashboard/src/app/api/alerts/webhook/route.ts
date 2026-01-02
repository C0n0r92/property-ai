import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

// Lazy initialization to avoid build-time errors
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-12-15.clover',
  });
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const supabase = await createClient();

    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    console.log('Received webhook event:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Extract metadata
      const userId = session.metadata?.user_id;
      const alertConfigStr = session.metadata?.alert_config;
      const alertType = session.metadata?.alert_type || 'location';
      const alertDurationMonths = parseInt(session.metadata?.alert_duration_months || '12');

      if (!userId || !alertConfigStr) {
        console.error('Missing user_id or alert_config in webhook metadata');
        return NextResponse.json({ error: 'Invalid metadata' }, { status: 400 });
      }

      const alertConfig = JSON.parse(alertConfigStr);

      console.log('Processing payment for alert type:', alertType);

      let alert;
      let error;

      if (alertType === 'blog') {
        // Create blog alert
        const result = await supabase
          .from('blog_alerts')
          .insert({
            user_id: userId,
            alert_categories: alertConfig.alert_categories || [],
            alert_tags: alertConfig.alert_tags || [],
            alert_all: alertConfig.alert_all !== false, // Default to true if not specified
            notification_frequency: alertConfig.notification_frequency || 'immediate',
            stripe_payment_id: session.id,
            status: 'active',
            expires_at: null, // Blog alerts are lifetime for now
          })
          .select()
          .single();

        alert = result.data;
        error = result.error;
        console.log('Created blog alert:', alert);
      } else {
        // Calculate expiry date for location alerts
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + alertDurationMonths);

        // Create location alert
        const result = await supabase
          .from('location_alerts')
          .insert({
            user_id: userId,
            location_name: alertConfig.location_name,
            location_coordinates: `POINT(${alertConfig.location_coordinates.lng} ${alertConfig.location_coordinates.lat})`,
            search_radius_km: alertConfig.radius_km,
            // Property types to monitor
            monitor_sold: alertConfig.monitor_sold || false,
            monitor_sale: alertConfig.monitor_sale || false,
            monitor_rental: alertConfig.monitor_rental || false,
            // Sale properties config
            sale_min_bedrooms: alertConfig.sale_min_bedrooms,
            sale_max_bedrooms: alertConfig.sale_max_bedrooms,
            sale_min_price: alertConfig.sale_min_price,
            sale_max_price: alertConfig.sale_max_price,
            sale_alert_on_new: alertConfig.sale_alert_on_new !== false,
            sale_alert_on_price_drops: alertConfig.sale_alert_on_price_drops !== false,
            // Rental properties config
            rental_min_bedrooms: alertConfig.rental_min_bedrooms,
            rental_max_bedrooms: alertConfig.rental_max_bedrooms,
            rental_min_price: alertConfig.rental_min_price,
            rental_max_price: alertConfig.rental_max_price,
            rental_alert_on_new: alertConfig.rental_alert_on_new !== false,
            // Sold properties config
            sold_min_bedrooms: alertConfig.sold_min_bedrooms,
            sold_max_bedrooms: alertConfig.sold_max_bedrooms,
            sold_price_threshold_percent: alertConfig.sold_price_threshold_percent || 5,
            sold_alert_on_under_asking: alertConfig.sold_alert_on_under_asking !== false,
            sold_alert_on_over_asking: alertConfig.sold_alert_on_over_asking !== false,
            // Payment and status
            stripe_payment_id: session.id,
            status: 'active',
            expires_at: expiresAt.toISOString(),
            last_checked: new Date().toISOString(),
          })
          .select()
          .single();

        alert = result.data;
        error = result.error;
        console.log('Created location alert:', alert);
      }

      if (error) {
        console.error('Failed to create alert:', error);
        return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
      }

      // Log the event
      await supabase.from('alert_events').insert({
        alert_id: alert.id,
        event_type: 'email_sent', // This will be the welcome email
        event_data: {
          type: 'welcome_email',
          alert_config: alertConfig,
        },
        sent_at: new Date().toISOString(),
      });

      // TODO: Send welcome email here
      // await sendWelcomeEmail(userId, alert);

      console.log(`Alert created for user ${userId}: ${alertConfig.location_name}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
