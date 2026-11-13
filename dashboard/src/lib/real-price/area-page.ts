/**
 * Everything an area page (/areas/dublin-8) shows, worked out from the sales.
 * Pure: takes the loaded sales store, so it can be tested without a database.
 */
import {
  analyse,
  areaProfile,
  quantile,
  sampleOverAsking,
  tidyAddress,
  typicalAsking,
  type AreaProfile,
  type Sale,
  type TypeGroup,
} from './model';
import type { SalesStore } from './store';

const DAY_MS = 86_400_000;
const TYPES: TypeGroup[] = ['apartment', 'terraced', 'semi', 'detached'];

export const TYPE_NAMES: Record<TypeGroup, { single: string; plural: string }> = {
  apartment: { single: 'apartment', plural: 'apartments' },
  terraced: { single: 'terraced house', plural: 'terraced houses' },
  semi: { single: 'semi-detached house', plural: 'semi-detached houses' },
  detached: { single: 'detached house', plural: 'detached houses' },
};

/** The sizes worth quoting for each type of home. */
const TYPICAL_BEDS: Record<TypeGroup, number[]> = {
  apartment: [1, 2],
  terraced: [2, 3],
  semi: [3, 4],
  detached: [4],
};

/** "d8" -> "dublin-8"; locality keys are already readable. */
export function areaSlug(key: string): string {
  const district = key.match(/^d(\d{1,2}w?)$/);
  return district ? `dublin-${district[1]}` : key;
}

/** "dublin-8" -> "d8"; null for anything that cannot be an area key. */
export function areaKeyFromSlug(slug: string): string | null {
  const s = slug.toLowerCase();
  const district = s.match(/^dublin-?(\d{1,2}w?)$/);
  if (district) return `d${district[1]}`;
  return /^[a-z0-9-]{2,60}$/.test(s) ? s : null;
}

export interface StreetSale {
  address: string;
  soldDate: string;
  askingPrice: number;
  soldPrice: number;
  overAskingPct: number;
}

export interface AreaLink {
  key: string;
  slug: string;
  label: string;
  medianOverAskingPct: number;
  medianPrice: number;
}

export interface AreaPage {
  key: string;
  slug: string;
  label: string;
  kind: 'district' | 'locality';
  dataTo: string;
  /** All homes, last 12 months, with a quarterly trend */
  profile: AreaProfile;
  byType: Array<{ type: TypeGroup; profile: AreaProfile }>;
  /** Among districts, by how far over asking homes typically sell */
  rank: { position: number; of: number } | null;
  dublin: { medianOverAskingPct: number; shareAboveAsking: number; medianPrice: number };
  /** The latest sales of the commonest home type, for the 3D street */
  street: { type: TypeGroup; beds: number; sales: StreetSale[] };
  dots: { values: number[]; salesPerDot: number };
  /** What a typical home of each kind asks here and likely sells for */
  typical: Array<{ type: TypeGroup; beds: number; asking: number; likely: number; overPct: number }>;
  recent: Array<{ address: string; area: string; askingPrice: number; soldPrice: number }>;
  /** Districts: neighbourhoods inside it. Neighbourhoods: their district and neighbours. */
  nearby: AreaLink[];
  /** Areas where similar money buys a home, for comparison */
  similar: AreaLink[];
}

function lastYear(store: SalesStore): Sale[] {
  const from = store.asOf - 365 * DAY_MS;
  return store.sales.filter((s) => s.t >= from && s.t <= store.asOf);
}

function median(values: number[]): number {
  return quantile([...values].sort((a, b) => a - b), 0.5);
}

function link(store: SalesStore, key: string, profile: AreaProfile): AreaLink {
  return {
    key,
    slug: areaSlug(key),
    label: store.areaLabels.get(key) ?? key,
    medianOverAskingPct: profile.medianOverAskingPct,
    medianPrice: profile.medianPrice,
  };
}

export function buildAreaPage(store: SalesStore, key: string): AreaPage | null {
  const option = store.areas.find((a) => a.key === key);
  if (!option) return null;
  const profile = areaProfile(store.sales, key, null, store.asOf);
  if (!profile) return null;

  const year = lastYear(store);
  const here = year.filter((s) => s.areaKeys.includes(key));

  const byType = TYPES.flatMap((type) => {
    const p = areaProfile(store.sales, key, type, store.asOf);
    return p ? [{ type, profile: p }] : [];
  });

  // Every area with enough sales, profiled once, for rank and comparisons
  const profiles = new Map<string, AreaProfile>();
  for (const area of store.areas) {
    const p = area.key === key ? profile : areaProfile(store.sales, area.key, null, store.asOf);
    if (p) profiles.set(area.key, p);
  }
  const isDistrict = (k: string) => /^d\d{1,2}w?$/.test(k);

  let rank: AreaPage['rank'] = null;
  if (option.kind === 'district') {
    const districts = [...profiles].filter(([k]) => isDistrict(k));
    const hotter = districts.filter(([, p]) => p.medianOverAskingPct > profile.medianOverAskingPct).length;
    rank = { position: hotter + 1, of: districts.length };
  }

  const ratios = year.map((s) => s.ratio);
  const dublin = {
    medianOverAskingPct: (median(ratios) - 1) * 100,
    shareAboveAsking: ratios.filter((r) => r > 1 + 1e-9).length / Math.max(1, ratios.length),
    medianPrice: Math.round(median(year.map((s) => s.soldPrice)) / 1000) * 1000,
  };

  // The street: the commonest type of home here, its usual size, its latest sales
  const typeCounts = TYPES.map((t) => [t, here.filter((s) => s.typeGroup === t).length] as const);
  const streetType = [...typeCounts].sort((a, b) => b[1] - a[1])[0][0];
  const ofType = here.filter((s) => s.typeGroup === streetType).sort((a, b) => b.t - a.t);
  const beds = ofType.map((s) => s.beds).filter((b): b is number => b !== null);
  const street = {
    type: streetType,
    beds: beds.length ? Math.round(median(beds)) : 3,
    sales: ofType.slice(0, 5).map((s) => ({
      address: tidyAddress(s.address),
      soldDate: s.soldDate,
      askingPrice: s.askingPrice,
      soldPrice: s.soldPrice,
      overAskingPct: (s.ratio - 1) * 100,
    })),
  };

  const typical: AreaPage['typical'] = [];
  for (const { type } of byType) {
    for (const b of TYPICAL_BEDS[type]) {
      const asking = typicalAsking(store.sales, { areaKey: key, typeGroup: type, beds: b }, store.asOf);
      if (!asking) continue;
      const result = analyse(store.sales, { areaKey: key, typeGroup: type, beds: b, askingPrice: asking }, store.asOf);
      // Only quote answers drawn from sales in this area
      if (!result || !result.tier.startsWith('area')) continue;
      typical.push({
        type,
        beds: b,
        asking,
        likely: result.prediction.mid,
        overPct: (result.prediction.mid / asking - 1) * 100,
      });
    }
  }

  const recent = [...here]
    .sort((a, b) => b.t - a.t)
    .slice(0, 24)
    .map((s) => {
      const parts = tidyAddress(s.address).split(', ');
      const locality = s.areaKeys.find((k) => k !== key && !isDistrict(k));
      return {
        address: parts[0],
        area: (locality && store.areaLabels.get(locality)) || parts[parts.length - 1],
        askingPrice: s.askingPrice,
        soldPrice: s.soldPrice,
      };
    });

  // Areas that share sales with this one: a district's neighbourhoods, or a
  // neighbourhood's district and the neighbourhoods around it
  const together = new Map<string, number>();
  for (const s of here) {
    for (const k of s.areaKeys) if (k !== key && profiles.has(k)) together.set(k, (together.get(k) ?? 0) + 1);
  }
  let nearbyKeys = [...together].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  if (option.kind === 'locality') {
    const district = nearbyKeys.find(isDistrict);
    const siblings = new Map<string, number>();
    if (district) {
      for (const s of year) {
        if (!s.areaKeys.includes(district)) continue;
        for (const k of s.areaKeys) {
          if (k !== key && k !== district && !isDistrict(k) && profiles.has(k)) siblings.set(k, (siblings.get(k) ?? 0) + 1);
        }
      }
    }
    nearbyKeys = [
      ...(district ? [district] : []),
      ...[...siblings].sort((a, b) => b[1] - a[1]).map(([k]) => k),
    ];
  } else {
    nearbyKeys = nearbyKeys.filter((k) => !isDistrict(k));
  }
  const nearby = nearbyKeys.slice(0, 6).map((k) => link(store, k, profiles.get(k)!));

  // Same kind of area, closest typical sale price
  const shown = new Set([key, ...nearby.map((n) => n.key)]);
  const similar = [...profiles]
    .filter(([k]) => !shown.has(k) && isDistrict(k) === (option.kind === 'district'))
    .sort((a, b) => Math.abs(a[1].medianPrice - profile.medianPrice) - Math.abs(b[1].medianPrice - profile.medianPrice))
    .slice(0, 4)
    .map(([k, p]) => link(store, k, p));

  return {
    key,
    slug: areaSlug(key),
    label: option.label,
    kind: option.kind,
    dataTo: new Date(store.asOf).toISOString().slice(0, 10),
    profile,
    byType,
    rank,
    dublin,
    street,
    dots: sampleOverAsking(here, 240),
    typical: typical.slice(0, 6),
    recent,
    nearby,
    similar,
  };
}

export interface AreaIndexRow extends AreaLink {
  kind: 'district' | 'locality';
  shareAboveAsking: number;
  medianPricePerSqm: number | null;
  count: number;
}

/** Every area with a profile, for the /areas index. */
export function buildAreaIndex(store: SalesStore): AreaIndexRow[] {
  const rows: AreaIndexRow[] = [];
  for (const area of store.areas) {
    const p = areaProfile(store.sales, area.key, null, store.asOf);
    if (!p) continue;
    rows.push({
      ...link(store, area.key, p),
      kind: area.kind,
      shareAboveAsking: p.shareAboveAsking,
      medianPricePerSqm: p.medianPricePerSqm,
      count: p.count,
    });
  }
  return rows;
}
