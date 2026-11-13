/**
 * The monthly over-asking report: how far over asking Dublin homes sold in a
 * month, against the month before and the same month a year earlier, by
 * district, type of home and price band. Pure, so it can be tested.
 */
import { quantile, tidyAddress, type Sale, type TypeGroup } from './model';
import type { SalesStore } from './store';

/** A month needs this many sales with asking and sold prices to be reported. */
export const MIN_MONTH_SALES = 150;
const MIN_DISTRICT_SALES = 8;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

export interface MonthFigures {
  month: string;
  label: string;
  count: number;
  medianOverAskingPct: number;
  shareAboveAsking: number;
  medianPrice: number;
}

export interface MonthlyReport extends MonthFigures {
  previous: MonthFigures | null;
  yearAgo: MonthFigures | null;
  /** The 13 months to this one, for the trend */
  trend: MonthFigures[];
  districts: Array<{ key: string; label: string; count: number; medianOverAskingPct: number; shareAboveAsking: number }>;
  byType: Array<{ type: TypeGroup; count: number; medianOverAskingPct: number; medianPrice: number }>;
  bands: Array<{ label: string; count: number; medianOverAskingPct: number; shareAboveAsking: number }>;
  biggest: Array<{ address: string; area: string; askingPrice: number; soldPrice: number; overAskingPct: number }>;
  dataTo: string;
}

const BANDS: Array<[string, number, number]> = [
  ['Under €350,000', 0, 350_000],
  ['€350,000 to €500,000', 350_000, 500_000],
  ['€500,000 to €750,000', 500_000, 750_000],
  ['€750,000 to €1m', 750_000, 1_000_000],
  ['€1m and over', 1_000_000, Infinity],
];

const median = (values: number[]) => quantile([...values].sort((a, b) => a - b), 0.5);
const isDistrict = (key: string) => /^d\d{1,2}w?$/.test(key);

function byMonth(store: SalesStore): Map<string, Sale[]> {
  const months = new Map<string, Sale[]>();
  for (const s of store.sales) {
    const m = s.soldDate.slice(0, 7);
    const list = months.get(m) ?? [];
    list.push(s);
    months.set(m, list);
  }
  return months;
}

function figures(month: string, sales: Sale[] | undefined): MonthFigures | null {
  if (!sales || sales.length < MIN_MONTH_SALES) return null;
  const ratios = sales.map((s) => s.ratio);
  return {
    month,
    label: monthLabel(month),
    count: sales.length,
    medianOverAskingPct: (median(ratios) - 1) * 100,
    shareAboveAsking: ratios.filter((r) => r > 1 + 1e-9).length / ratios.length,
    medianPrice: Math.round(median(sales.map((s) => s.soldPrice)) / 1000) * 1000,
  };
}

/** Months with enough sales to report, newest first. */
export function availableMonths(store: SalesStore): string[] {
  return [...byMonth(store)]
    .filter(([, sales]) => sales.length >= MIN_MONTH_SALES)
    .map(([m]) => m)
    .sort()
    .reverse();
}

const reportCache = new WeakMap<SalesStore, Map<string, MonthlyReport | null>>();

/** A month's report, worked out once per loaded store. */
export function buildMonthlyReport(store: SalesStore, month: string): MonthlyReport | null {
  let cache = reportCache.get(store);
  if (!cache) reportCache.set(store, (cache = new Map()));
  if (!cache.has(month)) cache.set(month, computeMonthlyReport(store, month));
  return cache.get(month) ?? null;
}

function computeMonthlyReport(store: SalesStore, month: string): MonthlyReport | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const months = byMonth(store);
  const sales = months.get(month);
  const main = figures(month, sales);
  if (!main || !sales) return null;

  const trend: MonthFigures[] = [];
  for (let i = -12; i <= 0; i++) {
    const m = shiftMonth(month, i);
    const f = figures(m, months.get(m));
    if (f) trend.push(f);
  }

  const districtSales = new Map<string, Sale[]>();
  for (const s of sales) {
    for (const k of s.areaKeys) {
      if (!isDistrict(k)) continue;
      const list = districtSales.get(k) ?? [];
      list.push(s);
      districtSales.set(k, list);
    }
  }
  const districts = [...districtSales]
    .filter(([, list]) => list.length >= MIN_DISTRICT_SALES)
    .map(([key, list]) => {
      const ratios = list.map((s) => s.ratio);
      return {
        key,
        label: store.areaLabels.get(key) ?? key.replace(/^d/, 'Dublin ').toUpperCase(),
        count: list.length,
        medianOverAskingPct: (median(ratios) - 1) * 100,
        shareAboveAsking: ratios.filter((r) => r > 1 + 1e-9).length / ratios.length,
      };
    })
    .sort((a, b) => b.medianOverAskingPct - a.medianOverAskingPct);

  const types: TypeGroup[] = ['apartment', 'terraced', 'semi', 'detached'];
  const byType = types.flatMap((type) => {
    const list = sales.filter((s) => s.typeGroup === type);
    if (list.length < 10) return [];
    return [{
      type,
      count: list.length,
      medianOverAskingPct: (median(list.map((s) => s.ratio)) - 1) * 100,
      medianPrice: Math.round(median(list.map((s) => s.soldPrice)) / 1000) * 1000,
    }];
  });

  const bands = BANDS.flatMap(([label, lo, hi]) => {
    const list = sales.filter((s) => s.askingPrice >= lo && s.askingPrice < hi);
    if (!list.length) return [];
    const ratios = list.map((s) => s.ratio);
    return [{
      label,
      count: list.length,
      medianOverAskingPct: (median(ratios) - 1) * 100,
      shareAboveAsking: ratios.filter((r) => r > 1 + 1e-9).length / ratios.length,
    }];
  });

  const biggest = [...sales]
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 5)
    .map((s) => {
      const parts = tidyAddress(s.address).split(', ');
      return {
        address: parts[0],
        area: parts.slice(1).join(', '),
        askingPrice: s.askingPrice,
        soldPrice: s.soldPrice,
        overAskingPct: (s.ratio - 1) * 100,
      };
    });

  return {
    ...main,
    previous: figures(shiftMonth(month, -1), months.get(shiftMonth(month, -1))),
    yearAgo: figures(shiftMonth(month, -12), months.get(shiftMonth(month, -12))),
    trend,
    districts,
    byType,
    bands,
    biggest,
    dataTo: new Date(store.asOf).toISOString().slice(0, 10),
  };
}
