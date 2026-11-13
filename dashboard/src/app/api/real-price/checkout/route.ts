import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { buildReport, describeHome, REPORT_PRICE_CENTS } from '@/lib/real-price/report';
import { insertRow } from '@/lib/real-price/db';
import { clientKey, createLimiter, siteUrl } from '@/lib/real-price/guard';
import { checkoutSchema } from '@/lib/real-price/schema';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-12-15.clover' });
}

const allow = createLimiter(10, 10 * 60 * 1000);

/**
 * Start a one-off payment for a full report. No account is needed: the paid
 * Stripe session itself is the key that unlocks the report page.
 */
export async function POST(request: NextRequest) {
  if (!allow(clientKey(request.headers))) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }

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
  const { query, address, eircode } = parsed.data;

  try {
    // Never take payment for a report we cannot produce
    const report = await buildReport(query, address);
    if (!report) {
      return NextResponse.json({ error: 'not_enough_sales' }, { status: 422 });
    }

    const site = siteUrl(request.nextUrl.origin);
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
      success_url: `${site}/real-price/report?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/real-price`,
      metadata: {
        kind: 'real-price-report',
        query: JSON.stringify(query),
        address,
        eircode: eircode ?? '',
      },
    });

    // Keep the home and its asking price: it is matched later against the
    // Property Price Register to learn what it sold for
    await insertRow('real_price_homes', {
      address,
      eircode: eircode ?? null,
      area_key: query.areaKey,
      type_group: query.typeGroup,
      beds: query.beds ?? null,
      asking_price: query.askingPrice,
      source: 'checkout',
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Real price checkout failed:', error);
    return NextResponse.json({ error: 'checkout_failed' }, { status: 500 });
  }
}
