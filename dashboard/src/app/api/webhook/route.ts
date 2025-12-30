import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { upgradeToPremium, downgradeToFree, syncStripeSubscription, getUserByEmail, getUserByStripeCustomerId } from '@/lib/user-tier';

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
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  // Handle different event types
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        console.log('Payment successful:', {
          sessionId: session.id,
          customerEmail: session.customer_email,
          amount: session.amount_total,
          plan: session.metadata?.plan,
          alert_config: !!session.metadata?.alert_config,
          customerId: session.customer,
          subscriptionId: session.subscription,
        });

        // Get user ID from metadata (passed during checkout) or email
        let userId: string | null | undefined = session.metadata?.user_id;

        if (!userId && session.customer_email) {
          userId = await getUserByEmail(session.customer_email);
        }

        if (!userId) {
          console.error('Could not find user for completed checkout session');
          return NextResponse.json({ received: true });
        }

        // Check if this is an alert payment or subscription payment
        if (session.metadata?.alert_config) {
          // This is an alert payment - create location alert
          console.log('Processing alert payment for user:', userId);

          const alertConfigStr = session.metadata.alert_config;
          const alertDurationMonths = parseInt(session.metadata.alert_duration_months || '12');

          try {
            const alertConfig = JSON.parse(alertConfigStr);

            // Calculate expiry date
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + alertDurationMonths);

            // Create the alert in database
            const supabase = await createClient();
            const { data: alert, error } = await supabase
              .from('location_alerts')
              .insert({
                user_id: userId,
                location_name: alertConfig.location_name,
                location_coordinates: `POINT(${alertConfig.location_coordinates.lng} ${alertConfig.location_coordinates.lat})`,
                search_radius_km: alertConfig.radius_km,
                monitor_sold: alertConfig.monitor_sold || false,
                monitor_sale: alertConfig.monitor_sale || false,
                monitor_rental: alertConfig.monitor_rental || false,
                sale_min_bedrooms: alertConfig.sale_min_bedrooms,
                sale_max_bedrooms: alertConfig.sale_max_bedrooms,
                sale_min_price: alertConfig.sale_min_price,
                sale_max_price: alertConfig.sale_max_price,
                sale_alert_on_new: alertConfig.sale_alert_on_new !== false,
                sale_alert_on_price_drops: alertConfig.sale_alert_on_price_drops !== false,
                rental_min_bedrooms: alertConfig.rental_min_bedrooms,
                rental_max_bedrooms: alertConfig.rental_max_bedrooms,
                rental_min_price: alertConfig.rental_min_price,
                rental_max_price: alertConfig.rental_max_price,
                rental_alert_on_new: alertConfig.rental_alert_on_new !== false,
                sold_min_bedrooms: alertConfig.sold_min_bedrooms,
                sold_max_bedrooms: alertConfig.sold_max_bedrooms,
                sold_price_threshold_percent: alertConfig.sold_price_threshold_percent || 5,
                sold_alert_on_under_asking: alertConfig.sold_alert_on_under_asking !== false,
                sold_alert_on_over_asking: alertConfig.sold_alert_on_over_asking !== false,
                stripe_payment_id: session.id,
                status: 'active',
                expires_at: expiresAt.toISOString(),
                last_checked: new Date().toISOString(),
              })
              .select()
              .single();

            if (error) {
              console.error('Failed to create alert:', error);
              return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
            }

            // Log the event
            await supabase.from('alert_events').insert({
              alert_id: alert.id,
              event_type: 'email_sent',
              event_data: {
                type: 'welcome_email',
                alert_config: alertConfig,
              },
              sent_at: new Date().toISOString(),
            });

            console.log(`Alert created for user ${userId}: ${alertConfig.location_name}`);

          } catch (alertError) {
            console.error('Error processing alert payment:', alertError);
            return NextResponse.json({ error: 'Failed to process alert payment' }, { status: 500 });
          }
        } else {
          // This is a subscription/premium payment
          console.log('Processing subscription payment for user:', userId);

          // Upgrade user to premium
          const success = await upgradeToPremium(userId, {
            customerId: session.customer as string,
            subscriptionId: session.subscription as string,
            plan: session.metadata?.plan || 'unknown',
            amount: session.amount_total || 0,
          });

          if (!success) {
            console.error('Failed to upgrade user to premium');
          }
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        console.log('Subscription cancelled:', {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
        });

        // Find user by Stripe customer ID
        const userId = await getUserByStripeCustomerId(subscription.customer as string);

        if (!userId) {
          console.error('Could not find user for cancelled subscription');
          return NextResponse.json({ received: true });
        }

        // Downgrade user to free
        const success = await downgradeToFree(userId);

        if (!success) {
          console.error('Failed to downgrade user to free');
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        console.log('Subscription updated:', {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
        });

        // Find user by Stripe customer ID
        const userId = await getUserByStripeCustomerId(subscription.customer as string);

        if (!userId) {
          console.error('Could not find user for updated subscription');
          return NextResponse.json({ received: true });
        }

        // Sync subscription status
        const success = await syncStripeSubscription(
          userId,
          subscription.id,
          subscription.status
        );

        if (!success) {
          console.error('Failed to sync subscription status');
        }

        // If subscription became inactive, downgrade to free
        if (['canceled', 'unpaid', 'incomplete_expired'].includes(subscription.status)) {
          await downgradeToFree(userId);
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error processing webhook event:', error);
    return NextResponse.json(
      { error: 'Error processing webhook' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
