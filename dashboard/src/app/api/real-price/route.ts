import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { analyse, typicalAsking } from '@/lib/real-price/model';
import { toPublicResult } from '@/lib/real-price/public';
import { querySchema } from '@/lib/real-price/schema';
import { getSalesStore } from '@/lib/real-price/store';

// autoAsking: the visitor has not entered a price, so use what is typical for the home
const checkSchema = querySchema.extend({ autoAsking: z.boolean().optional() });

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = checkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  try {
    const store = await getSalesStore();
    const areaLabel = store.areaLabels.get(parsed.data.areaKey);
    if (!areaLabel) {
      return NextResponse.json({ error: 'unknown_area' }, { status: 400 });
    }

    const { autoAsking, ...query } = parsed.data;
    let typicalUsed = false;
    if (autoAsking && query.beds !== undefined) {
      const typical = typicalAsking(store.sales, { ...query, beds: query.beds }, store.asOf);
      if (typical) {
        query.askingPrice = typical;
        typicalUsed = true;
      }
    }

    const result = analyse(store.sales, query, store.asOf);
    if (!result) {
      return NextResponse.json({ error: 'not_enough_sales' }, { status: 422 });
    }

    // The full analysis is for the paid report; the page gets the public part
    return NextResponse.json({ areaLabel, askingPrice: query.askingPrice, typicalUsed, result: toPublicResult(result) });
  } catch (error) {
    console.error('Real price check failed:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
