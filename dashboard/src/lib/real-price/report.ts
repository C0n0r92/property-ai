import {
  analyse,
  quarterlyTrend,
  type QuarterSummary,
  type Query,
  type RealPriceResult,
  type TypeGroup,
} from './model';
import {
  earlierSales,
  getMarketInsights,
  homeAndStreetHistory,
  listingCut,
  type MarketInsights,
  type RegisterEntry,
} from './insights';
import { getRegister, getSalesStore } from './store';

export const TYPE_LABELS: Record<TypeGroup, { single: string; plural: string }> = {
  apartment: { single: 'apartment', plural: 'apartments' },
  terraced: { single: 'terraced house', plural: 'terraced houses' },
  semi: { single: 'semi-detached house', plural: 'semi-detached houses' },
  detached: { single: 'detached house', plural: 'detached houses' },
};

export interface ReportData {
  query: Query;
  title: string;
  areaLabel: string;
  generatedOn: string;
  dataTo: string;
  result: RealPriceResult;
  trend: QuarterSummary[];
  register: {
    updated: string;
    sales: Array<{ date: string; address: string; price: number }>;
  };
  /** What the wider data shows; all optional, so older reports still open */
  insights?: {
    market: MarketInsights | null;
    /** The home's own and its street's register sales, when an address was given */
    history: { home: RegisterEntry[]; street: RegisterEntry[]; streetName: string; specific: boolean } | null;
    /** When each comparable had last sold before, keyed "address|soldDate" */
    earlier: Record<string, { date: string; price: number }>;
    /** The home's asking price was cut, if we have its listing */
    cut: { first: number; latest: number; since: string } | null;
  };
}

export function describeHome(query: Query, areaLabel: string): string {
  const beds = query.beds ? `${query.beds}-bed ` : '';
  return `${beds}${TYPE_LABELS[query.typeGroup].single} in ${areaLabel}`;
}

/** Everything the full report shows, or null when the evidence is too thin. */
export async function buildReport(query: Query, label?: string): Promise<ReportData | null> {
  const store = await getSalesStore();
  const areaLabel = store.areaLabels.get(query.areaKey);
  if (!areaLabel) return null;

  // The report lists comparables over up to three pages
  const result = analyse(store.sales, query, store.asOf, 72);
  if (!result) return null;

  const register = await getRegister();
  const home = describeHome(query, areaLabel);
  const address = label?.trim();
  // Each lookup is optional: a failure leaves that part out, never the report
  const [market, history, earlier, cut] = await Promise.all([
    getMarketInsights(),
    address ? homeAndStreetHistory(address).catch(() => null) : null,
    earlierSales(result.evidence.recent).catch(() => ({})),
    address ? listingCut(address).catch(() => null) : null,
  ]);

  return {
    query,
    title: label?.trim() || home.charAt(0).toUpperCase() + home.slice(1),
    areaLabel,
    generatedOn: new Date().toISOString().slice(0, 10),
    dataTo: new Date(store.asOf).toISOString().slice(0, 10),
    result,
    trend: quarterlyTrend(store.sales, query.areaKey, store.asOf).slice(-10),
    register: {
      updated: register.updated,
      sales: register.sales
        .filter((s) => s.areaKeys.includes(query.areaKey))
        .slice(0, 12)
        .map(({ date, address, price }) => ({ date, address, price })),
    },
    insights: { market, history, earlier, cut },
  };
}
