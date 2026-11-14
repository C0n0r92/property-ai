import { NextRequest, NextResponse } from 'next/server';
import { clientKey, createLimiter } from '@/lib/real-price/guard';
import { searchHomes } from '@/lib/real-price/home-search';
import { getSalesStore } from '@/lib/real-price/store';

const allow = createLimiter(40, 60 * 1000);

/** The one search box: GET /api/home/search?q=<address, Eircode or listing link> */
export async function GET(request: NextRequest) {
  if (!allow(clientKey(request.headers))) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 3 || q.length > 500) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  try {
    return NextResponse.json(await searchHomes(q, await getSalesStore()));
  } catch (error) {
    console.error('Home search failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
