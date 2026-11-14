/**
 * Repeat-sales price indexes for "What is it worth?", and how accurate they
 * are. Per county: an index for the county and for each area with enough
 * resales; then one in five resales of the last two years is held out, the
 * indexes refitted without them, and the held-out resales predicted from
 * their previous sale. Those errors give the published accuracy and the
 * ranges shown with each estimate.
 *
 *   npm run build-worth
 */
import { addressKey } from '../../dashboard/src/lib/real-price/address.ts';
import { streetIdentity } from '../../dashboard/src/lib/real-price/streets.ts';
import {
  errorBands,
  fitIndex,
  indexArea,
  isHomeKey,
  repeatPairs,
  yearOf,
  type Pair,
  type PriceIndex,
  type SalePoint,
} from '../../dashboard/src/lib/real-price/worth.ts';
import { pool, runJob } from './db.ts';

const FROM = 2010;
/** An area gets its own index with this many resales; otherwise the county's */
export const MIN_AREA_PAIRS = 150;

function indexesFor(pairs: Pair[], county: string, to: number) {
  const out = new Map<string, PriceIndex>();
  const whole = fitIndex(pairs, FROM, to);
  if (whole) out.set(`county:${county}`, whole);
  const byArea = new Map<string, Pair[]>();
  for (const p of pairs) {
    const list = byArea.get(p.area);
    if (list) list.push(p);
    else byArea.set(p.area, [p]);
  }
  for (const [area, list] of byArea) {
    if (list.length < MIN_AREA_PAIRS || area.startsWith('county:')) continue;
    const idx = fitIndex(list, FROM, to);
    if (idx) out.set(area, idx);
  }
  return out;
}

export async function buildWorth(): Promise<Record<string, unknown>> {
  const to = new Date().getFullYear();
  const recentFrom = to - 2;
  const counties = (await pool.query<{ county: string }>('SELECT DISTINCT county FROM register_sales ORDER BY county')).rows.map(
    (r) => r.county
  );
  const indexRows: Array<Record<string, unknown>> = [];
  const accuracyRows: Array<Record<string, unknown>> = [];
  const allErrors: number[] = [];

  for (const county of counties) {
    const { rows } = await pool.query<{ address: string; district: string | null; date: string; price: number }>(
      `SELECT address, district, sold_date::text AS date, price FROM register_sales
        WHERE county = $1 AND NOT new_build AND price >= 50000 ORDER BY id`,
      [county]
    );
    const sales: SalePoint[] = [];
    for (const r of rows) {
      const key = addressKey(r.address).key;
      if (!isHomeKey(key)) continue;
      const area = indexArea(county, county === 'Dublin' ? r.district : null, streetIdentity(r.address, county)?.areaKey ?? null);
      sales.push({ home: `${key}|${area}`, area, t: yearOf(r.date), price: r.price });
    }
    const pairs = repeatPairs(sales);

    // Published indexes: every resale
    for (const [area, idx] of indexesFor(pairs, county, to)) {
      indexRows.push({ area_key: area, county, from_year: idx.from, vals: idx.values, pairs: idx.pairs });
    }

    // Accuracy: hold out one in five recent resales and predict them
    const test = pairs.filter((p) => p.t2 >= recentFrom).filter((_, i) => i % 5 === 0);
    const held = new Set(test);
    const fitted = indexesFor(
      pairs.filter((p) => !held.has(p)),
      county,
      to
    );
    const countyIdx = fitted.get(`county:${county}`);
    if (!countyIdx || test.length < 20) continue;
    // Each held-out resale predicted with its area's index (as in use)
    const errors = test.map((p) => errorBands(fitted.get(p.area) ?? countyIdx, [p]).medianAbsPct);
    // Ranges from the county index's errors: a little wider than the area ones, the cautious choice
    const bands = errorBands(countyIdx, test);
    const sorted = [...errors].sort((a, b) => a - b);
    accuracyRows.push({
      county,
      tested: test.length,
      median_abs: sorted[Math.floor(sorted.length / 2)],
      within10: (errors.filter((e) => e <= 10).length / errors.length) * 100,
      within20: (errors.filter((e) => e <= 20).length / errors.length) * 100,
      bands: JSON.stringify(bands.bands),
    });
    allErrors.push(...errors);
  }

  const sorted = [...allErrors].sort((a, b) => a - b);
  const all = {
    county: 'ALL',
    tested: allErrors.length,
    median_abs: sorted[Math.floor(sorted.length / 2)] ?? 0,
    within10: (allErrors.filter((e) => e <= 10).length / Math.max(1, allErrors.length)) * 100,
    within20: (allErrors.filter((e) => e <= 20).length / Math.max(1, allErrors.length)) * 100,
    bands: JSON.stringify([]),
  };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM price_indexes');
    await client.query(
      `INSERT INTO price_indexes (area_key, county, from_year, vals, pairs)
       SELECT area_key, county, from_year, vals, pairs
         FROM json_to_recordset($1::json) AS t(area_key text, county text, from_year int, vals float8[], pairs int)`,
      [JSON.stringify(indexRows)]
    );
    await client.query('DELETE FROM worth_accuracy');
    await client.query(
      `INSERT INTO worth_accuracy (county, tested, median_abs, within10, within20, bands)
       SELECT county, tested, median_abs, within10, within20, bands::jsonb
         FROM json_to_recordset($1::json) AS t(county text, tested int, median_abs float8, within10 float8, within20 float8, bands text)`,
      [JSON.stringify([...accuracyRows, all])]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return {
    indexes: indexRows.length,
    tested: all.tested,
    medianErrorPct: +all.median_abs.toFixed(1),
    within10Pct: +all.within10.toFixed(0),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runJob('build-worth', () => buildWorth());
  await pool.end();
}
