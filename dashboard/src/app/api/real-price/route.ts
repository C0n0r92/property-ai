import { NextRequest, NextResponse } from 'next/server';
import { analyse } from '@/lib/real-price/model';
import { querySchema } from '@/lib/real-price/schema';
import { getSalesStore } from '@/lib/real-price/store';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = querySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  try {
    const store = getSalesStore();
    const areaLabel = store.areaLabels.get(parsed.data.areaKey);
    if (!areaLabel) {
      return NextResponse.json({ error: 'unknown_area' }, { status: 400 });
    }

    const result = analyse(store.sales, parsed.data, store.asOf);
    if (!result) {
      return NextResponse.json({ error: 'not_enough_sales' }, { status: 422 });
    }

    return NextResponse.json({ areaLabel, result });
  } catch (error) {
    console.error('Real price check failed:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
