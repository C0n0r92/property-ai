import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { analytics } from '@/lib/analytics';
import { headers } from 'next/headers';

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
    const body = await request.text();
    const headersList = await headers();
    const sig = headersList.get('stripe-signature');

    if (!sig) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    const stripe = getStripe();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = await createClient();

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;

        // Check if this is an AI summary payment
        if (session.metadata?.request_id) {
          const requestId = session.metadata.request_id;
          const customerEmail = session.customer_email || session.metadata.email;

          // Update the AI summary request as paid and completed
          const { error: updateError } = await supabase
            .from('ai_summary_requests')
            .update({
              is_paid: true,
              stripe_payment_id: session.payment_intent as string,
              stripe_session_id: session.id,
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', requestId);

          if (updateError) {
            console.error('Error updating AI summary request:', updateError);
            return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
          }

          // Update newsletter subscriber to mark as paying customer
          if (customerEmail) {
            const { error: subscriberUpdateError } = await supabase
              .from('newsletter_subscribers')
              .update({
                is_paying_customer: true,
                last_payment_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('email', customerEmail.toLowerCase().trim());

            if (subscriberUpdateError) {
              console.error('Error updating newsletter subscriber:', subscriberUpdateError);
              // Don't fail the webhook for this
            }
          }

          // Track payment completion
          analytics.aiSummaryPaymentCompleted(session.metadata.blog_slug, 99, parseInt(session.metadata.user_request_number || '0'));

          // Here you would trigger the AI summary email sending
          // For now, we'll just log it
          console.log(`AI summary request ${requestId} marked as paid and completed for ${customerEmail}`);

          // TODO: Send AI summary email
          // You could call an email service or queue job here
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('AI summary webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
