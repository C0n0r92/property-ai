import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

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

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Here you would typically:
    // 1. Get the user email from session.customer_email or session.customer
    // 2. Update user's payment status in your database
    // 3. Grant access to Pro features
    
    // For now, we'll just log it
    // In production, you'd update a database record
    console.log('Payment successful:', {
      sessionId: session.id,
      customerEmail: session.customer_email,
      amount: session.amount_total,
      plan: session.metadata?.plan,
    });

    // TODO: Update user's hasPaid status in database
    // Example:
    // await updateUserPaymentStatus(session.customer_email, true);
  }

  return NextResponse.json({ received: true });
}
