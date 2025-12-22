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

    const stripe = getStripe();
    const { plan } = await request.json();

    if (!plan || (plan !== 'one-time' && plan !== 'monthly')) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "one-time" or "monthly"' },
        { status: 400 }
      );
    }

    // Price in cents
    const amount = plan === 'one-time' ? 2000 : 500; // €20 or €5
    const currency = 'eur';

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: plan === 'one-time' 
                ? 'Irish Property Data Pro - Lifetime Access' 
                : 'Irish Property Data Pro - Monthly Subscription',
              description: plan === 'one-time'
                ? 'One-time payment for lifetime access to Pro Insights and Saved Properties'
                : 'Monthly subscription to Pro Insights and Saved Properties',
            },
            unit_amount: amount,
            ...(plan === 'monthly' && { recurring: { interval: 'month' } }),
          },
          quantity: 1,
        },
      ],
      mode: plan === 'one-time' ? 'payment' : 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com'}/insights?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com'}/insights?payment=cancelled`,
      metadata: {
        plan,
        user_id: user.id, // Pass user ID to webhook
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
