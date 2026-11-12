import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { buildReport, describeHome, REPORT_PRICE_CENTS } from '@/lib/real-price/report';
import { checkoutSchema } from '@/lib/real-price/schema';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-12-15.clover' });
}

/**
 * Start a one-off payment for a full report. No account is needed: the paid
 * Stripe session itself is the key that unlocks the report page.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const { query, label } = parsed.data;

  try {
    // Never take payment for a report we cannot produce
    const report = buildReport(query, label);
    if (!report) {
      return NextResponse.json({ error: 'not_enough_sales' }, { status: 422 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: REPORT_PRICE_CENTS,
            product_data: {
              name: 'Real Price Report',
              description: `Bidding report for a ${describeHome(query, report.areaLabel)}`,
            },
          },
        },
      ],
      success_url: `${siteUrl}/real-price/report?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/real-price`,
      metadata: {
        kind: 'real-price-report',
        query: JSON.stringify(query),
        label: label ?? '',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Real price checkout failed:', error);
    return NextResponse.json({ error: 'checkout_failed' }, { status: 500 });
  }
}
