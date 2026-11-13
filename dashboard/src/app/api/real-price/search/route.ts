import { NextRequest, NextResponse } from 'next/server';
import { clientKey, createLimiter } from '@/lib/real-price/guard';
import { extractAreas, toTypeGroup } from '@/lib/real-price/model';
import { getPool } from '@/lib/real-price/pool';
import { getSalesStore } from '@/lib/real-price/store';

const allow = createLimiter(60, 60 * 1000);

/**
 * Homes for sale now whose address matches what the visitor is typing,
 * for the address box on area pages. ?q=rath gael&area=d22 (area optional:
 * matches in that area come first).
 */
export async function GET(request: NextRequest) {
  if (!allow(clientKey(request.headers))) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim();
  const area = request.nextUrl.searchParams.get('area') ?? '';
  if (q.length < 3 || q.length > 80) return NextResponse.json({ results: [] });

  const db = getPool();
  if (!db) return NextResponse.json({ results: [] });
  // Every word must appear somewhere in the address, in any order
  const words = q.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean).slice(0, 6);
  if (!words.length) return NextResponse.json({ results: [] });
  try {
    const { rows } = await db.query<{
      address: string; district: string | null; property_type: string | null; beds: number | null; asking_price: number; sale_agreed: boolean;
    }>(
      `SELECT address, district, property_type, beds, asking_price, sale_agreed FROM listings
        WHERE last_seen >= CURRENT_DATE - 21
          AND ${words.map((_, i) => `lower(address) LIKE $${i + 1}`).join(' AND ')}
        ORDER BY last_seen DESC LIMIT 40`,
      words.map((w) => `%${w}%`)
    );
    const store = await getSalesStore();
    const results = rows
      .map((r) => {
        const areaKey = extractAreas(r.address, r.district).map((a) => a.key).find((k) => store.areaLabels.has(k));
        return {
          address: r.address.replace(/\s+,/g, ',').replace(/\s{2,}/g, ' '),
          areaKey,
          typeGroup: /penthouse/i.test(r.property_type ?? '') ? 'apartment' : toTypeGroup(r.property_type),
          beds: r.beds && r.beds >= 1 && r.beds <= 10 ? r.beds : undefined,
          askingPrice: r.asking_price,
          saleAgreed: r.sale_agreed,
          inArea: Boolean(area && extractAreas(r.address, r.district).some((a) => a.key === area)),
        };
      })
      .filter((r) => r.areaKey)
      .sort((a, b) => Number(b.inArea) - Number(a.inArea))
      .slice(0, 6);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Address search failed:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
