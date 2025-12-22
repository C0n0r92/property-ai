import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { upgradeToPremium, downgradeToFree, syncStripeSubscription, getUserByEmail, getUserByStripeCustomerId } from '@/lib/user-tier';

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
