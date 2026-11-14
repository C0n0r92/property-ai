import { NextRequest, NextResponse } from 'next/server';
import { clientKey, createLimiter } from '@/lib/real-price/guard';
import { worthFor } from '@/lib/real-price/worth-data';

const allow = createLimiter(30, 60 * 1000);

/** What a home is worth from its last sale: GET /api/worth?address=12 Main Street, Naas */
export async function GET(request: NextRequest) {
  if (!allow(clientKey(request.headers))) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  const address = (request.nextUrl.searchParams.get('address') ?? '').trim();
  if (address.length < 4 || address.length > 200) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  try {
    const result = await worthFor(address);
    return NextResponse.json(result, { headers: { 'cache-control': 'private, max-age=300' } });
  } catch (error) {
    console.error('Worth lookup failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
