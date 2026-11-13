import { areaProfile, type AreaProfile, type TypeGroup } from './model';
import { getSalesStore } from './store';

export type MarketType = TypeGroup | 'all';

export interface MarketArea {
  key: string;
  label: string;
  kind: 'district' | 'locality';
  profile: AreaProfile;
}

export interface Market {
  type: MarketType;
  dataTo: string;
  areas: MarketArea[];
}

/** Towns and neighbourhoods need this many recent sales to be compared. */
const MIN_LOCALITY_SALES = 60;

const cache = new Map<MarketType, Market>();
let cacheFor = 0;

/** Every area with enough recent sales, profiled for one home type (or all). */
export async function getMarket(type: MarketType): Promise<Market> {
  const store = await getSalesStore();
  // A refreshed store invalidates every profile
  if (cacheFor !== store.loadedAt) {
    cache.clear();
    cacheFor = store.loadedAt;
  }
  const hit = cache.get(type);
  if (hit) return hit;

  const typeGroup = type === 'all' ? null : type;
  const areas: MarketArea[] = [];
  for (const area of store.areas) {
    if (area.kind === 'locality' && area.sales < MIN_LOCALITY_SALES) continue;
    const profile = areaProfile(store.sales, area.key, typeGroup, store.asOf);
    if (profile) areas.push({ key: area.key, label: area.label, kind: area.kind, profile });
  }

  const market = { type, dataTo: new Date(store.asOf).toISOString().slice(0, 10), areas };
  cache.set(type, market);
  return market;
}
