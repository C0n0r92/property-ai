/**
 * Does planning explain resale prices the index misses? For Dublin resales,
 * compare how far the second sale landed from the index between homes with
 * an extension or attic granted between the two sales and the rest.
 *
 *   npx tsx src/worth-planning-test.ts
 */
import { addressKey } from '../../dashboard/src/lib/real-price/address.ts';
import { streetIdentity } from '../../dashboard/src/lib/real-price/streets.ts';
import { bringForward, fitIndex, indexArea, isHomeKey, repeatPairs, yearOf, type Pair, type SalePoint } from '../../dashboard/src/lib/real-price/worth.ts';
import { pool } from './db.ts';

const { rows } = await pool.query<{ address: string; district: string | null; date: string; price: number }>(
  `SELECT address, district, sold_date::text AS date, price FROM register_sales
    WHERE county = 'Dublin' AND NOT new_build AND price >= 50000 ORDER BY id`
);
const sales: SalePoint[] = [];
for (const r of rows) {
  const key = addressKey(r.address).key;
  if (!isHomeKey(key)) continue;
  const area = indexArea('Dublin', r.district, streetIdentity(r.address, 'Dublin')?.areaKey ?? null);
  sales.push({ home: `${key}|${area}`, area, t: yearOf(r.date), price: r.price });
}
const pairs = repeatPairs(sales);
const homeOf = new Map(sales.map((s) => [`${s.area}|${s.t}|${s.price}`, s.home.split('|')[0]]));

// Granted extensions and attics by home key, with decision dates
const { rows: plans } = await pool.query<{ home_key: string; decided: string; kinds: string[] }>(
  `SELECT home_key, decision_date::text AS decided, kinds FROM planning_applications
    WHERE home_key IS NOT NULL AND decision IN ('granted','part') AND decision_date IS NOT NULL
      AND kinds && ARRAY['extension','attic']`
);
const planned = new Map<string, number[]>();
for (const p of plans) planned.set(p.home_key, [...(planned.get(p.home_key) ?? []), yearOf(p.decided)]);

const byArea = new Map<string, Pair[]>();
for (const p of pairs) byArea.set(p.area, [...(byArea.get(p.area) ?? []), p]);
const to = new Date().getFullYear();
const whole = fitIndex(pairs, 2010, to)!;
const idx = new Map([...byArea].map(([a, ps]) => [a, ps.length >= 150 ? fitIndex(ps, 2010, to) ?? whole : whole]));

const resid = (p: Pair) => Math.log(p.p2 / bringForward(idx.get(p.area) ?? whole, p.p1, p.t1, p.t2));
const withWork: number[] = [];
const without: number[] = [];
for (const p of pairs) {
  if (p.t1 < 2012) continue; // planning records start in 2012
  const dates = planned.get(homeOf.get(`${p.area}|${p.t1}|${p.p1}`) ?? '') ?? [];
  // Granted after the first sale and at least 6 months before the second (time to build)
  (dates.some((d) => d > p.t1 && d < p.t2 - 0.5) ? withWork : without).push(resid(p));
}
const med = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
const pct = (l: number) => `${((Math.exp(l) - 1) * 100).toFixed(1)}%`;
console.log(`Resales since 2012: ${withWork.length} with an extension/attic granted between the sales, ${without.length} without`);
console.log(`Second sale against the index, median: with work ${pct(med(withWork))}, without ${pct(med(without))}`);
// How much the error falls if the typical uplift is applied to homes with work
const uplift = med(withWork) - med(without);
const absErr = (v: number[], shift: number) => med(v.map((e) => Math.abs(Math.exp(e - shift) - 1) * 100));
console.log(`Typical error for homes with work: ${absErr(withWork, 0).toFixed(1)}% now, ${absErr(withWork, uplift).toFixed(1)}% with a ${pct(uplift)} uplift`);
await pool.end();
