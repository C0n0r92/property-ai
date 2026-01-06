import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

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
    const { email, blogSlug, step = 'check' } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    if (!blogSlug) {
      return NextResponse.json(
        { error: 'Blog slug is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the user's next request number (across all blogs)
    const { data: requestNumberData, error: requestNumberError } = await supabase
      .rpc('get_user_request_number', {
        user_email: email.toLowerCase().trim()
      });

    if (requestNumberError) {
      console.error('Error getting request number:', requestNumberError);
      return NextResponse.json(
        { error: 'Failed to check request history' },
        { status: 500 }
      );
    }

    const requestNumber = requestNumberData || 1;
    const needsPayment = requestNumber > 1; // First request (1) is free, subsequent (2+) cost money

    // Handle different steps
    if (step === 'check') {
      // Just return whether payment is needed
      return NextResponse.json({
        requestNumber,
        needsPayment,
        price: needsPayment ? 99 : 0, // 99 cents in cents
        currency: 'eur'
      });
    }

    if (step === 'request') {
      // Create the AI summary request
      const { data: requestData, error: insertError } = await supabase
        .from('ai_summary_requests')
        .insert({
          email: email.toLowerCase().trim(),
          blog_slug: blogSlug,
          request_number: requestNumber,
          is_paid: !needsPayment, // First request is free
          status: needsPayment ? 'pending' : 'processing'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating AI summary request:', insertError);
        return NextResponse.json(
          { error: 'Failed to create request' },
          { status: 500 }
        );
      }

      if (needsPayment) {
        // Create Stripe checkout session for payment
        const stripe = getStripe();
        const AI_SUMMARY_PRICE = 99; // €0.99 in cents

        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          customer_email: email.toLowerCase().trim(),
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'eur',
                product_data: {
                  name: 'AI Blog Summary',
                  description: `AI-powered summary of "${blogSlug.replace(/-/g, ' ')}" blog post`,
                },
                unit_amount: AI_SUMMARY_PRICE,
              },
              quantity: 1,
            },
          ],
          success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://irishpropertydata.com'}/blog/${blogSlug}?ai_summary=success&request_id=${requestData.id}`,
          cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://irishpropertydata.com'}/blog/${blogSlug}?ai_summary=cancelled&request_id=${requestData.id}`,
          metadata: {
            request_id: requestData.id,
            email: email.toLowerCase().trim(),
            blog_slug: blogSlug,
            user_request_number: requestNumber.toString(), // Global request number across all blogs
          },
        });

        return NextResponse.json({
          requestId: requestData.id,
          needsPayment: true,
          checkoutUrl: session.url,
          sessionId: session.id
        });
      } else {
        // Free request - process immediately
        // In a real implementation, you'd trigger the AI summary generation here
        // For now, we'll just mark as completed

        await supabase
          .from('ai_summary_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', requestData.id);

        return NextResponse.json({
          requestId: requestData.id,
          needsPayment: false,
          status: 'completed',
          message: 'Your free AI summary has been requested! Check your email soon.'
        });
      }
    }

    return NextResponse.json(
      { error: 'Invalid step' },
      { status: 400 }
    );

  } catch (error: unknown) {
    console.error('AI summary request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
