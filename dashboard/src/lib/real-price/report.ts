import {
  analyse,
  quarterlyTrend,
  type QuarterSummary,
  type Query,
  type RealPriceResult,
  type TypeGroup,
} from './model';
import { getRegister, getSalesStore } from './store';

export const REPORT_PRICE_CENTS = 1900;

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
}

export function describeHome(query: Query, areaLabel: string): string {
  const beds = query.beds ? `${query.beds}-bed ` : '';
  return `${beds}${TYPE_LABELS[query.typeGroup].single} in ${areaLabel}`;
}

/** Everything the full report shows, or null when the evidence is too thin. */
export function buildReport(query: Query, label?: string): ReportData | null {
  const store = getSalesStore();
  const areaLabel = store.areaLabels.get(query.areaKey);
  if (!areaLabel) return null;

  // The report lists comparables over up to three pages
  const result = analyse(store.sales, query, store.asOf, 72);
  if (!result) return null;

  const register = getRegister();
  const home = describeHome(query, areaLabel);

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
        .filter((s) => !s.newBuild && s.areaKeys.includes(query.areaKey))
        .slice(0, 12)
        .map(({ date, address, price }) => ({ date, address, price })),
    },
  };
}
