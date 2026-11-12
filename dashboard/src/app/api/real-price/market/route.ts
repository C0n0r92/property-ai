import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMarket } from '@/lib/real-price/market';

const typeSchema = z.enum(['all', 'apartment', 'terraced', 'semi', 'detached']);

/** Area-by-area bidding profiles for one home type. */
export async function GET(request: NextRequest) {
  const parsed = typeSchema.safeParse(request.nextUrl.searchParams.get('type') ?? 'all');
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
  }
  try {
    return NextResponse.json(getMarket(parsed.data), {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (error) {
    console.error('Market profiles failed:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
