import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCurrentUser } from '@/lib/auth-utils';

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
    // Get authenticated user
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in to continue' },
        { status: 401 }
      );
    }

    const stripe = getStripe();

    // One-time payment for blog alerts (€3)
    const BLOG_ALERT_PRICE = 300; // €3 in cents

    // Create Stripe Checkout session (one-time payment)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',  // One-time payment
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Blog Alert Subscription',
              description: 'Get notified when we publish new research articles and market insights',
            },
            unit_amount: BLOG_ALERT_PRICE,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://irishpropertydata.com'}/alerts?payment=success&alert_type=blog`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://irishpropertydata.com'}/alerts?payment=cancelled&alert_type=blog`,
      metadata: {
        user_id: user.id,
        alert_type: 'blog',
        alert_config: JSON.stringify({
          alert_type: 'general',
          notification_frequency: 'immediate'
        }),
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: unknown) {
    console.error('Stripe blog alert checkout error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
