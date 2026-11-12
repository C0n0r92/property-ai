import { NextRequest, NextResponse } from 'next/server';
import { insertRow } from '@/lib/real-price/db';
import { sendResultEmail } from '@/lib/real-price/mailer';
import { analyse } from '@/lib/real-price/model';
import { toPublicResult } from '@/lib/real-price/public';
import { emailSchema } from '@/lib/real-price/schema';
import { getSalesStore } from '@/lib/real-price/store';

/** "Email me this result": send the free answer and keep the request. */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = emailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  const { email, query, marketingConsent, company } = parsed.data;

  // Bots fill the hidden field; answer as if it worked and do nothing
  if (company) return NextResponse.json({ emailed: true });

  try {
    const store = getSalesStore();
    const areaLabel = store.areaLabels.get(query.areaKey);
    const full = areaLabel ? analyse(store.sales, query, store.asOf) : null;
    if (!areaLabel || !full) {
      return NextResponse.json({ error: 'not_enough_sales' }, { status: 422 });
    }

    const emailed = await sendResultEmail({
      to: email,
      query,
      areaLabel,
      result: toPublicResult(full),
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin,
    });
    const saved = await insertRow('real_price_leads', {
      email,
      query,
      marketing_consent: marketingConsent,
      emailed,
    });

    if (!emailed && !saved) {
      return NextResponse.json({ error: 'email_unavailable' }, { status: 503 });
    }
    return NextResponse.json({ emailed });
  } catch (error) {
    console.error('Real price email failed:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
