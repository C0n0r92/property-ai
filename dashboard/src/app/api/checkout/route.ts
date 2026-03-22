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
    const { plan } = await request.json();

    const VALID_PLANS = ['one-time', 'monthly', 'pro', 'agency'] as const;
    type Plan = typeof VALID_PLANS[number];

    if (!plan || !VALID_PLANS.includes(plan as Plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "one-time", "monthly", "pro", or "agency"' },
        { status: 400 }
      );
    }

    const currency = 'eur';

    // Plan config
    const planConfig: Record<Plan, { amount: number; name: string; description: string; mode: 'payment' | 'subscription' }> = {
      'one-time': {
        amount: 2000, // €20
        name: 'Irish Property Data - Lifetime Access',
        description: 'One-time payment for lifetime access to Pro Insights and Saved Properties',
        mode: 'payment',
      },
      'monthly': {
        amount: 500, // €5/mo
        name: 'Irish Property Data - Monthly',
        description: 'Monthly subscription to Pro Insights and Saved Properties',
        mode: 'subscription',
      },
      'pro': {
        amount: 900, // €9/mo
        name: 'Irish Property Data Pro',
        description: 'Pro plan — AI price predictions, deal finder, area forecasts, and more',
        mode: 'subscription',
      },
      'agency': {
        amount: 4900, // €49/mo
        name: 'Irish Property Data Agency',
        description: 'Agency plan — everything in Pro plus bulk analysis and priority support',
        mode: 'subscription',
      },
    };

    const config = planConfig[plan as Plan];

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: config.name,
              description: config.description,
            },
            unit_amount: config.amount,
            ...(config.mode === 'subscription' && { recurring: { interval: 'month' } }),
          },
          quantity: 1,
        },
      ],
      mode: config.mode,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://irishpropertydata.com'}/insights?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://irishpropertydata.com'}/insights?payment=cancelled`,
      metadata: {
        plan,
        user_id: user.id,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: unknown) {
    console.error('Stripe checkout error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
