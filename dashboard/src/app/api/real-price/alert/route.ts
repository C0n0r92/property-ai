import { NextRequest, NextResponse } from 'next/server';
import { clientKey, createLimiter, siteUrl } from '@/lib/real-price/guard';
import { sendMail } from '@/lib/real-price/mailer';
import { getPool } from '@/lib/real-price/pool';
import { soldAlertSchema } from '@/lib/real-price/schema';
import { alertTarget, confirmEmail, newToken } from '@/lib/real-price/sold-alerts';

// Each request emails an address the caller chose, so keep this tight
const allow = createLimiter(5, 10 * 60 * 1000);

/** "Tell me what it sold for": set an alert and confirm it by email. */
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
  const parsed = soldAlertSchema.safeParse(body);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return NextResponse.json({ error: field === 'email' ? 'invalid_email' : 'invalid_request' }, { status: 400 });
  }
  const { email, address, askingPrice, predictedMid, county, company } = parsed.data;
  // Bots fill the hidden field; answer as if it worked and do nothing
  if (company) return NextResponse.json({ ok: true });

  const target = alertTarget(address);
  if (!target) return NextResponse.json({ error: 'needs_house_number' }, { status: 400 });

  const db = getPool();
  if (!db) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  try {
    const token = newToken();
    const { rowCount } = await db.query(
      `INSERT INTO sold_alerts (email, address, address_key, district, asking_price, predicted_mid, token, county)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email, address_key) WHERE notified_at IS NULL DO NOTHING`,
      [email, address, target.key, county === 'Dublin' ? target.district : null, askingPrice ?? null, predictedMid ?? null, token, county]
    );
    // Already watching this home for this address: say so, without a second email
    if (!rowCount) return NextResponse.json({ ok: true, already: true });
    const mail = confirmEmail({ address, token }, siteUrl(request.nextUrl.origin));
    await sendMail({ to: email, ...mail });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Sold alert failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
