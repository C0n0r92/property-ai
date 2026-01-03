import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { trigger } = await request.json();

    // Create Stripe checkout session for premium upgrade
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Irish Property Data Premium',
              description: '12 months of unlimited saves, alerts, and premium features',
            },
            unit_amount: 99, // €0.99 in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://irishpropertydata.com'}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://irishpropertydata.com'}/map`,
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        upgrade_type: 'premium',
        trigger: trigger || 'unknown',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Upgrade checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

