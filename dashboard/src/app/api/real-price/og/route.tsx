import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { analyse } from '@/lib/real-price/model';
import { describeHome } from '@/lib/real-price/report';
import { querySchema } from '@/lib/real-price/schema';
import { getSalesStore } from '@/lib/real-price/store';

const euro = (value: number) => `€${Math.round(value).toLocaleString('en-IE')}`;

const INK = '#16223f';
const SOFT = '#4d586b';
const GOLD = '#c9992f';

/**
 * The picture shown when a result link is pasted into a chat or a post:
 * the home, its asking price and what it will likely sell for, over a strip
 * of the real sales behind the answer.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    areaKey: params.get('area') ?? undefined,
    typeGroup: params.get('type') ?? undefined,
    beds: params.get('beds') ? Number(params.get('beds')) : undefined,
    askingPrice: Number(params.get('asking')),
  });
  if (!parsed.success) return new Response('Bad request', { status: 400 });

  const store = await getSalesStore();
  const areaLabel = store.areaLabels.get(parsed.data.areaKey);
  const result = areaLabel ? analyse(store.sales, parsed.data, store.asOf) : null;
  if (!areaLabel || !result) return new Response('Not found', { status: 404 });

  const { prediction, dots, evidence } = result;
  const above = Math.round(prediction.shareAboveAsking * 100);

  // The sales as columns of dots, 2.5% of asking price per column
  const BIN = 2.5;
  const lo = -10;
  const columns = Array.from({ length: 22 }, () => 0);
  for (const value of dots.values) {
    const index = Math.floor((value - lo) / BIN);
    if (index >= 0 && index < columns.length) columns[index]++;
  }
  const tallest = Math.max(1, ...columns);
  const perDot = Math.max(1, Math.ceil(tallest / 7));
  const midColumn = Math.floor((prediction.medianOverAskingPct - lo) / BIN);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          color: INK,
          background: 'linear-gradient(160deg, #fcfcfa 0%, #fdeee2 62%, #e3d6f2 100%)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, color: SOFT }}>
          <span style={{ fontWeight: 700, color: INK }}>Real Price Check</span>
          <span>irishpropertydata.com</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 38, color: SOFT }}>
            A {describeHome(parsed.data, areaLabel)} asking {euro(parsed.data.askingPrice)}
          </span>
          <span style={{ fontSize: 38, color: SOFT, marginTop: 6 }}>will really sell for about</span>
          <span style={{ fontSize: 150, fontWeight: 700, letterSpacing: -6, lineHeight: 1.05 }}>
            {euro(prediction.mid)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 28, color: SOFT }}>
            <span>
              <b style={{ color: INK, marginRight: 8 }}>{above}%</b> of {evidence.count} similar homes
            </span>
            <span>sold above asking</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            {columns.map((count, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column-reverse', gap: 5 }}>
                {Array.from({ length: Math.max(count > 0 ? 1 : 0, Math.round(count / perDot)) }, (_, j) => (
                  <div
                    key={j}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      background: i === midColumn ? GOLD : i * BIN + lo < 0 ? '#c9cede' : INK,
                    }}
                  />
                ))}
                {count === 0 && <div style={{ width: 18, height: 18 }} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
    }
  );
}
