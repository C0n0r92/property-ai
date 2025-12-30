import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCurrentUser } from '@/lib/auth-utils';

// Lazy initialization to avoid build-time errors
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-11-17.clover',
  });
}

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

    // Validate required fields
    const required = ['location_name', 'location_coordinates', 'radius_km'];
    for (const field of required) {
      if (!alertConfig[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    const stripe = getStripe();

    // One-time payment for 12 months of alerts
    const ALERT_PRICE = 300; // €3.00 in cents
    const ALERT_DURATION_MONTHS = 12;

    // Create Stripe Checkout session (one-time payment, not subscription)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',  // One-time payment
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Property Alert - 12 Months',
              description: `Alerts for ${alertConfig.location_name} (${alertConfig.radius_km}km radius)`,
            },
            unit_amount: ALERT_PRICE,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://irishpropertydata.com'}/alerts?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://irishpropertydata.com'}/alerts?payment=cancelled`,
      metadata: {
        user_id: user.id,
        alert_config: JSON.stringify(alertConfig),
        alert_duration_months: ALERT_DURATION_MONTHS.toString(),
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: unknown) {
    console.error('Stripe alert checkout error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
