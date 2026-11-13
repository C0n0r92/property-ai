import { NextRequest, NextResponse } from 'next/server';
import { clientKey, createLimiter } from '@/lib/real-price/guard';
import { parseListingLink } from '@/lib/real-price/listing-link';
import { lookUpListing } from '@/lib/real-price/listing-lookup';
import { getSalesStore } from '@/lib/real-price/store';

const allow = createLimiter(30, 60 * 1000);

/** A pasted MyHome.ie or Daft.ie link, read into the home to check. */
export async function GET(request: NextRequest) {
  if (!allow(clientKey(request.headers))) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  const url = request.nextUrl.searchParams.get('url') ?? '';
  const link = url.length <= 500 ? parseListingLink(url) : null;
  if (!link) {
    return NextResponse.json({ error: 'unrecognised_link' }, { status: 400 });
  }
  try {
    const store = await getSalesStore();
    return NextResponse.json(await lookUpListing(link, store));
  } catch (error) {
    console.error('Listing link failed:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
