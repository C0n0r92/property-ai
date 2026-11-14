/**
 * "What is it worth?": a home's last sale price brought to today with a
 * repeat-sales price index for its area.
 *
 * Every home that sold twice says how prices in its area moved between the
 * two sales. Fitting all such pairs at once (log price change = index at the
 * second sale − index at the first, least squares over year dummies: the
 * Bailey–Muth–Nourse method behind the Case-Shiller indices) gives a price
 * index by year. A home's estimate is its last price × index now ÷ index
 * then; the range comes from how far real resales landed from the index.
 *
 * Shared with the pipeline (pipeline/src/build-worth.ts): imports only the
 * other shared helpers.
 */

export interface SalePoint {
  /** The home: address key plus its area, so 12 Main St in two towns are two homes */
  home: string;
  area: string;
  /** Sale date as a fractional year, e.g. 2019.5 */
  t: number;
  price: number;
}

export interface Pair {
  area: string;
  t1: number;
  t2: number;
  p1: number;
  p2: number;
}

/** Resales at least this far apart: quicker ones are usually flips or corrections */
const MIN_YEARS = 0.5;
/** Price changes outside these bounds are almost always not the same home, or not a market sale */
const MIN_RATIO = 0.4;
const MAX_RATIO = 5;

/** Consecutive sales of the same home, as pairs. */
export function repeatPairs(sales: SalePoint[]): Pair[] {
  const byHome = new Map<string, SalePoint[]>();
  for (const s of sales) {
    const list = byHome.get(s.home);
    if (list) list.push(s);
    else byHome.set(s.home, [s]);
  }
  const pairs: Pair[] = [];
  for (const list of byHome.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => a.t - b.t);
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1];
      const b = list[i];
      const ratio = b.price / a.price;
      if (b.t - a.t < MIN_YEARS || ratio < MIN_RATIO || ratio > MAX_RATIO) continue;
      pairs.push({ area: a.area, t1: a.t, t2: b.t, p1: a.price, p2: b.price });
    }
  }
  return pairs;
}

export interface PriceIndex {
  /** First year of the index; value[0] is that year, = 1 */
  from: number;
  /** Index by year (1 = the first year) */
  values: number[];
  pairs: number;
}

/**
 * Fit a yearly index from pairs (least squares on log changes). Sales are
 * spread over the two years either side of their date, so a sale in
 * mid-2019 counts half in 2019 and half in 2020. Returns null with too few
 * pairs to say anything.
 */
export function fitIndex(pairs: Pair[], from: number, to: number, minPairs = 30): PriceIndex | null {
  if (pairs.length < minPairs || to <= from) return null;
  const n = to - from + 1;
  // Unknowns: index for years from+1..to (the first year is fixed at 0 in logs)
  const k = n - 1;
  const ata = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const atb = new Array<number>(k).fill(0);
  // A light pull of each year towards its neighbours keeps sparse years sensible
  const SMOOTH = 0.5;

  const weights = (t: number) => {
    const clamped = Math.min(Math.max(t, from), to);
    const y = Math.floor(clamped);
    const frac = clamped - y;
    const w = new Array<number>(n).fill(0);
    if (y >= to) w[n - 1] = 1;
    else {
      w[y - from] += 1 - frac;
      w[y - from + 1] += frac;
    }
    return w;
  };

  for (const p of pairs) {
    const w1 = weights(p.t1);
    const w2 = weights(p.t2);
    // row: w2 - w1 over years 1..n-1 (year 0 drops out)
    const row = w2.map((v, i) => v - w1[i]).slice(1);
    const y = Math.log(p.p2 / p.p1);
    for (let i = 0; i < k; i++) {
      if (!row[i]) continue;
      atb[i] += row[i] * y;
      for (let j = 0; j < k; j++) if (row[j]) ata[i][j] += row[i] * row[j];
    }
  }
  // Smoothness: (x[i] - x[i-1]) small, including x[0] against the fixed first year
  for (let i = 0; i < k; i++) {
    ata[i][i] += SMOOTH * (i === k - 1 ? 1 : 2);
    if (i > 0) {
      ata[i][i - 1] -= SMOOTH;
      ata[i - 1][i] -= SMOOTH;
    }
  }
  const x = solve(ata, atb);
  if (!x) return null;
  return { from, values: [1, ...x.map((v) => Math.exp(v))], pairs: pairs.length };
}

/** Gaussian elimination with partial pivoting; null if singular. */
function solve(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let pivot = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r;
    if (Math.abs(m[pivot][c]) < 1e-12) return null;
    [m[c], m[pivot]] = [m[pivot], m[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      if (f) for (let j = c; j <= n; j++) m[r][j] -= f * m[c][j];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

/** The index at a fractional year, between the yearly values. */
export function indexAt(index: PriceIndex, t: number): number {
  const last = index.from + index.values.length - 1;
  const c = Math.min(Math.max(t, index.from), last);
  const y = Math.floor(c);
  const frac = c - y;
  const a = index.values[y - index.from];
  const b = index.values[Math.min(y - index.from + 1, index.values.length - 1)];
  return Math.exp(Math.log(a) * (1 - frac) + Math.log(b) * frac);
}

/** Last price × index now ÷ index then. */
export function bringForward(index: PriceIndex, price: number, soldAt: number, now: number): number {
  return (price * indexAt(index, now)) / indexAt(index, soldAt);
}

/**
 * How far real resales landed from the index (log error quantiles), by
 * years held: the range widens the longer since the last sale.
 */
export interface ErrorBands {
  /** [maxYears, low quantile, high quantile] in log terms, ascending by years */
  bands: Array<[number, number, number]>;
  medianAbsPct: number;
  within10Pct: number;
  tested: number;
}

const quantile = (sorted: number[], q: number) => {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

/** Errors of predicting each pair's second price from its first with the given index. */
export function errorBands(index: PriceIndex, pairs: Pair[]): ErrorBands {
  const held = [3, 7, 99];
  const logs: number[][] = held.map(() => []);
  const abs: number[] = [];
  for (const p of pairs) {
    const predicted = bringForward(index, p.p1, p.t1, p.t2);
    const e = Math.log(p.p2 / predicted);
    const years = p.t2 - p.t1;
    logs[held.findIndex((h) => years <= h)].push(e);
    abs.push(Math.abs(p.p2 - predicted) / p.p2);
  }
  abs.sort((a, b) => a - b);
  return {
    bands: held.map((h, i) => {
      const s = logs[i].sort((a, b) => a - b);
      return [h, quantile(s, 0.2), quantile(s, 0.8)] as [number, number, number];
    }),
    medianAbsPct: quantile(abs, 0.5) * 100,
    within10Pct: abs.length ? (abs.filter((a) => a <= 0.1).length / abs.length) * 100 : 0,
    tested: pairs.length,
  };
}

export interface WorthEstimate {
  mid: number;
  low: number;
  high: number;
  lastSale: { price: number; t: number };
  /** Change in the area's prices since the last sale */
  changePct: number;
}

/** A home's value today from its last sale, with a range for its years held. */
/**
 * A range around an estimate from measured errors: as wide as the middle 60%
 * of real resale errors for that many years held, centred on the estimate.
 */
export function rangeAround(mid: number, bands: ErrorBands['bands'], yearsHeld: number): { low: number; high: number } {
  const band = bands.find(([h]) => yearsHeld <= h) ?? bands[bands.length - 1] ?? [99, -0.15, 0.15];
  const half = Math.max(0.05, (band[2] - band[1]) / 2);
  return { low: mid * Math.exp(-half), high: mid * Math.exp(half) };
}

export function estimateWorth(index: PriceIndex, bands: ErrorBands, price: number, soldAt: number, now: number): WorthEstimate {
  const mid = bringForward(index, price, soldAt, now);
  const range = rangeAround(mid, bands.bands, now - soldAt);
  const round = (v: number) => Math.round(v / 1000) * 1000;
  return {
    mid: round(mid),
    low: round(range.low),
    high: round(range.high),
    lastSale: { price, t: soldAt },
    changePct: (mid / price - 1) * 100,
  };
}

/** "2019-06-15" -> 2019.45 */
export const yearOf = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const end = Date.UTC(d.getUTCFullYear() + 1, 0, 1);
  return d.getUTCFullYear() + (d.getTime() - start) / (end - start);
};

const HOME_KEY = /^(?:(?:APT|UNIT|FLAT) \d+[A-Z]? )?\d+[A-Z]? [A-Z]/;

/** A key that names one home (a house or flat number, then the street). */
export const isHomeKey = (key: string) => HOME_KEY.test(key);

/**
 * The area a home's index comes from: its Dublin district, else its town
 * (and county), else the county. `street` is the streets.ts identity's area
 * key, passed in so this file needs no other imports.
 */
export function indexArea(county: string, district: string | null, streetArea: string | null): string {
  if (county === 'Dublin' && district) return district;
  return streetArea ?? `county:${county}`;
}

/** Neighbours priced like the home (0.7 to 1.4 times its own estimate): the ones the blend uses. */
export const alikeNeighbours = (own: number, neighbours: number[]) => neighbours.filter((n) => n >= own * 0.7 && n <= own * 1.4);

/**
 * Blend the home's own last sale (brought forward) with recent sales on its
 * street (brought forward), in log terms: the more neighbours, the more
 * weight they get, up to 60%. Only neighbours priced like this home count
 * (within 0.7 to 1.4 times its own estimate): on a street of flats and big
 * houses, the houses say nothing about a flat.
 */
export function blendWithStreet(own: number, neighbours: number[]): number {
  const alike = alikeNeighbours(own, neighbours);
  if (alike.length < 3) return own;
  const sorted = [...alike].sort((a, b) => a - b);
  const street = sorted[Math.floor(sorted.length / 2)];
  const w = Math.min(0.6, alike.length / 20);
  return Math.exp((1 - w) * Math.log(own) + w * Math.log(street));
}
