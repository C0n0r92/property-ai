import { NextRequest, NextResponse } from 'next/server';
import { clientKey, createLimiter } from '@/lib/real-price/guard';
import { getPool } from '@/lib/real-price/pool';
import { stopAlertSchema } from '@/lib/real-price/schema';

const allow = createLimiter(20, 10 * 60 * 1000);

/** Stop an alert: delete it, email address and all. */
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
  const parsed = stopAlertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  const db = getPool();
  if (!db) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  try {
    const { rowCount } = await db.query('DELETE FROM sold_alerts WHERE token = $1 AND notified_at IS NULL', [parsed.data.token]);
    return NextResponse.json({ stopped: (rowCount ?? 0) > 0 });
  } catch (error) {
    console.error('Stopping alert failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
