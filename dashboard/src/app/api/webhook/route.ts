import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
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
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
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

