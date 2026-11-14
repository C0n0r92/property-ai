/**
 * How the price check would have done on recent sales: each sale predicted
 * from its asking price using only sales that closed before it, exactly as
 * the site predicts today, then set against what it really sold for.
 * Recomputed from the live data, so the figures quoted can't go stale.
 */
import { predict, selectComparables, tidyAddress, type Sale, type TypeGroup } from './model';
import type { SalesStore } from './store';

const DAY_MS = 86_400_000;

export interface TrackTest {
  address: string;
  soldDate: string;
  areaKey: string;
  typeGroup: TypeGroup;
  beds: number | null;
  asking: number;
  sold: number;
  low: number;
  mid: number;
  high: number;
  inRange: boolean;
  inLikely: boolean;
  /** |mid - sold| / sold */
  modelError: number;
  /** |asking - sold| / sold */
  askingError: number;
}

export interface TrackSummary {
  tested: number;
  insideRangePct: number;
  insideLikelyPct: number;
  medianModelErrorPct: number;
  medianAskingErrorPct: number;
  /** Share of sales where the middle estimate was nearer the sale price than the asking price */
  closerThanAskingPct: number;
  within5Pct: number;
  within10Pct: number;
}

export interface TrackRecord {
  from: string;
  to: string;
  overall: TrackSummary;
  byMonth: Array<{ month: string } & TrackSummary>;
  byType: Array<{ type: TypeGroup } & TrackSummary>;
  /** The most recent tests, newest first */
  recent: TrackTest[];
}

const median = (values: number[]) => {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function summarise(tests: TrackTest[]): TrackSummary {
  const n = tests.length || 1;
  const share = (pred: (t: TrackTest) => boolean) => (tests.filter(pred).length / n) * 100;
  return {
    tested: tests.length,
    insideRangePct: share((t) => t.inRange),
    insideLikelyPct: share((t) => t.inLikely),
    medianModelErrorPct: median(tests.map((t) => t.modelError)) * 100,
    medianAskingErrorPct: median(tests.map((t) => t.askingError)) * 100,
    closerThanAskingPct: share((t) => t.modelError < t.askingError),
    within5Pct: share((t) => t.modelError <= 0.05),
    within10Pct: share((t) => t.modelError <= 0.1),
  };
}

/** First index in sorted `sales` with t >= value. */
function lowerBound(sales: Sale[], value: number): number {
  let lo = 0;
  let hi = sales.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sales[mid].t < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Test every sale in the `months` before the newest sale (every `every`th,
 * to bound the work), each against the sales before it.
 */
export function computeTrackRecord(sales: Sale[], asOf: number, months = 12, every = 1): TrackRecord {
  const sorted = [...sales].sort((a, b) => a.t - b.t);
  const start = asOf - months * 30.44 * DAY_MS;
  const candidates = sorted.filter((s) => s.t >= start && s.t <= asOf && s.typeGroup && s.areaKeys.length > 0);

  const tests: TrackTest[] = [];
  candidates.forEach((s, i) => {
    if (i % every !== 0) return;
    const before = s.t - DAY_MS;
    // Only what was known the day before it sold: the two years up to then
    const window = sorted.slice(lowerBound(sorted, before - 731 * DAY_MS), lowerBound(sorted, before + 1));
    const query = { areaKey: s.areaKeys[0], typeGroup: s.typeGroup!, beds: s.beds ?? undefined, askingPrice: s.askingPrice };
    const { comps, tier } = selectComparables(window, query, before);
    if (tier === 'none') return;
    const p = predict(comps, s.askingPrice);
    tests.push({
      address: tidyAddress(s.address),
      soldDate: s.soldDate,
      areaKey: s.areaKeys[0],
      typeGroup: s.typeGroup!,
      beds: s.beds,
      asking: s.askingPrice,
      sold: s.soldPrice,
      low: p.low,
      mid: p.mid,
      high: p.high,
      inRange: s.soldPrice >= p.low && s.soldPrice <= p.high,
      inLikely: s.soldPrice >= p.likelyLow && s.soldPrice <= p.likelyHigh,
      modelError: Math.abs(p.mid - s.soldPrice) / s.soldPrice,
      askingError: Math.abs(s.askingPrice - s.soldPrice) / s.soldPrice,
    });
  });

  const group = <K extends string>(key: (t: TrackTest) => K) => {
    const map = new Map<K, TrackTest[]>();
    for (const t of tests) map.set(key(t), [...(map.get(key(t)) ?? []), t]);
    return map;
  };
  const byMonth = [...group((t) => t.soldDate.slice(0, 7))]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, list]) => ({ month, ...summarise(list) }));
  const byType = [...group((t) => t.typeGroup)]
    .map(([type, list]) => ({ type, ...summarise(list) }))
    .sort((a, b) => b.tested - a.tested);

  return {
    from: tests.length ? tests[0].soldDate : '',
    to: tests.length ? tests[tests.length - 1].soldDate : '',
    overall: summarise(tests),
    byMonth,
    byType,
    recent: [...tests].sort((a, b) => b.soldDate.localeCompare(a.soldDate)).slice(0, 15),
  };
}

const cache = new WeakMap<SalesStore, TrackRecord>();
let latest: TrackRecord | null = null;

/**
 * The track record for the current data, worked out once per copy of the
 * data (a few seconds). When the data refreshes, the previous record is
 * served while the new one is worked out.
 */
export function trackRecord(store: SalesStore): TrackRecord {
  const cached = cache.get(store);
  if (cached) return cached;
  if (latest) {
    const stale = latest;
    setTimeout(() => {
      if (!cache.has(store)) cache.set(store, (latest = computeTrackRecord(store.sales, store.asOf)));
    }, 0);
    return stale;
  }
  latest = computeTrackRecord(store.sales, store.asOf);
  cache.set(store, latest);
  return latest;
}
