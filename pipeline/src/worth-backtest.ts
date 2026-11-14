/**
 * How accurate "What is it worth?" is: one in five resales since a date is
 * held out, the indexes are fitted on every other resale (as in use, where
 * the index runs to today), and each held-out resale is predicted from its
 * previous sale.
 *
 *   npx tsx src/worth-backtest.ts [2025-01-01]
 */
import { addressKey } from '../../dashboard/src/lib/real-price/address.ts';
import { streetIdentity } from '../../dashboard/src/lib/real-price/streets.ts';
import { blendWithStreet, bringForward, errorBands, fitIndex, repeatPairs, yearOf, type Pair, type PriceIndex, type SalePoint } from '../../dashboard/src/lib/real-price/worth.ts';
import { pool } from './db.ts';

const cutoff = yearOf(process.argv[2] ?? '2025-01-01');
const MIN_AREA_PAIRS = 150;
const FROM = 2010;
const TO = new Date().getFullYear();

/** A home's area for the index: Dublin district, else town (and county), else the county. */
export function areaOf(address: string, county: string, district: string | null): string {
  if (county === 'Dublin' && district) return district;
  return streetIdentity(address, county)?.areaKey ?? `county:${county}`;
}

const counties = (await pool.query<{ county: string }>('SELECT DISTINCT county FROM register_sales ORDER BY county')).rows.map((r) => r.county);
const report: Array<Record<string, unknown>> = [];
let allArea: number[] = [];
let allCounty: number[] = [];
let allStreet: number[] = [];
let allBlend: number[] = [];

for (const county of counties) {
  const { rows } = await pool.query<{ address: string; district: string | null; date: string; price: number }>(
    `SELECT address, district, sold_date::text AS date, price FROM register_sales
      WHERE county = $1 AND NOT new_build AND price >= 50000 ORDER BY id`,
    [county]
  );
  const sales: SalePoint[] = [];
  const streetOf = new Map<string, string>(); // home -> street slug
  const streetSales = new Map<string, Array<{ home: string; t: number; price: number }>>();
  for (const r of rows) {
    const key = addressKey(r.address);
    if (!/^(?:(?:APT|UNIT|FLAT) \d+[A-Z]? )?\d+[A-Z]? [A-Z]/.test(key.key)) continue;
    const area = areaOf(r.address, county, r.district);
    const home = `${key.key}|${area}`;
    const t = yearOf(r.date);
    sales.push({ home, area, t, price: r.price });
    const street = streetIdentity(r.address, county)?.slug;
    if (street) {
      streetOf.set(home, street);
      const list = streetSales.get(street) ?? [];
      list.push({ home, t, price: r.price });
      streetSales.set(street, list);
    }
  }
  // Which home each pair belongs to, to find its street
  const homeOfPair = new Map<Pair, string>();
  const pairs = repeatPairs(sales);
  const saleHome = new Map(sales.map((x) => [`${x.area}|${x.t}|${x.price}`, x.home]));
  for (const p of pairs) homeOfPair.set(p, saleHome.get(`${p.area}|${p.t1}|${p.p1}`) ?? '');
  const recent = pairs.filter((p) => p.t2 >= cutoff);
  const test = recent.filter((_, i) => i % 5 === 0);
  const held = new Set(test);
  const train = pairs.filter((p) => !held.has(p));
  const countyIndex = fitIndex(train, FROM, TO);
  if (!countyIndex || !test.length) continue;

  // Area indexes where an area has enough pairs of its own
  const byArea = new Map<string, Pair[]>();
  for (const p of train) byArea.set(p.area, [...(byArea.get(p.area) ?? []), p]);
  const areaIndex = new Map([...byArea].filter(([, ps]) => ps.length >= MIN_AREA_PAIRS).map(([a, ps]) => [a, fitIndex(ps, FROM, TO)]));

  const errArea: number[] = [];
  const errCounty: number[] = [];
  const errStreet: number[] = [];
  const errBlend: number[] = [];
  const pctErr = (pred: number, actual: number) => (Math.abs(pred - actual) / actual) * 100;
  for (const p of test) {
    const idx = (areaIndex.get(p.area) ?? countyIndex) as PriceIndex;
    const own = bringForward(idx, p.p1, p.t1, p.t2);
    errArea.push(pctErr(own, p.p2));
    errCounty.push(errorBands(countyIndex, [p]).medianAbsPct);
    // Other homes on the street sold in the 3 years before, brought to the date of this sale
    const home = homeOfPair.get(p) ?? '';
    const near = (streetSales.get(streetOf.get(home) ?? '') ?? [])
      .filter((x) => x.home !== home && x.t < p.t2 && x.t >= p.t2 - 3)
      .map((x) => bringForward(idx, x.price, x.t, p.t2))
      .sort((a, b) => a - b);
    if (near.length >= 3) errStreet.push(pctErr(near[Math.floor(near.length / 2)], p.p2));
    // The site's blend: only neighbours priced like this home
    errBlend.push(pctErr(blendWithStreet(own, near), p.p2));
  }
  allStreet = allStreet.concat(errStreet);
  allBlend = allBlend.concat(errBlend);
  const med = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
  const within = (v: number[], pct: number) => Math.round((v.filter((e) => e <= pct).length / v.length) * 100);
  allArea = allArea.concat(errArea);
  allCounty = allCounty.concat(errCounty);
  report.push({
    county,
    pairs: pairs.length,
    tested: test.length,
    areaIndexes: areaIndex.size,
    medianErr: +med(errArea).toFixed(1),
    within10: within(errArea, 10),
    within20: within(errArea, 20),
    countyOnlyMedianErr: +med(errCounty).toFixed(1),
    blendMedianErr: +med(errBlend).toFixed(1),
    blendWithin10: within(errBlend, 10),
  });
}

console.table(report);
const med = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
const within = (v: number[], pct: number) => Math.round((v.filter((e) => e <= pct).length / v.length) * 100);
console.log(`BLEND: median ${med(allBlend).toFixed(1)}% · within 10%: ${within(allBlend, 10)}% · within 20%: ${within(allBlend, 20)}% | street alone (where 3+ neighbours, ${allStreet.length}): ${med(allStreet).toFixed(1)}%`);
console.log(
  `ALL: ${allArea.length} resales tested · median error ${med(allArea).toFixed(1)}% · within 10%: ${within(allArea, 10)}% · within 20%: ${within(allArea, 20)}% · county-only index ${med(allCounty).toFixed(1)}%`
);
await pool.end();
