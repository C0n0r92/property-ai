import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { cleanSale, extractAreas, type RawSale, type Sale } from './model';
import { getPool } from './pool';

export interface AreaOption {
  key: string;
  label: string;
  kind: 'district' | 'locality';
  sales: number;
}

export interface SalesStore {
  sales: Sale[];
  /** Date of the newest sale in the data (epoch ms). */
  asOf: number;
  areas: AreaOption[];
  areaLabels: Map<string, string>;
  /** When this copy was built; caches derived from the store key on it. */
  loadedAt: number;
}

/** An area needs this many sales in the last two years to be selectable. */
const MIN_AREA_SALES = 40;
const TWO_YEARS_MS = 730 * 86_400_000;


function findDataFile(): string {
  const candidates = [
    join(process.cwd(), 'public', 'data.json'),
    join(process.cwd(), '..', 'scraper', 'data', 'consolidated', 'data.json'),
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error('Sales data file not found');
  return found;
}

function districtOrder(key: string): number {
  const n = parseInt(key.slice(1), 10);
  return n + (key.endsWith('w') ? 0.5 : 0);
}

export function buildStore(rawSales: RawSale[], now: number): SalesStore {
  const sales: Sale[] = [];
  const labelVotes = new Map<string, Map<string, number>>();

  for (const raw of rawSales) {
    const sale = cleanSale(raw, now);
    if (!sale) continue;
    sales.push(sale);
    for (const area of extractAreas(sale.address, raw.dublinPostcode)) {
      const votes = labelVotes.get(area.key) ?? new Map<string, number>();
      votes.set(area.label, (votes.get(area.label) ?? 0) + 1);
      labelVotes.set(area.key, votes);
    }
  }

  const asOf = sales.reduce((max, s) => Math.max(max, s.t), 0);
  const recentCounts = new Map<string, number>();
  for (const sale of sales) {
    if (sale.t < asOf - TWO_YEARS_MS) continue;
    for (const key of sale.areaKeys) recentCounts.set(key, (recentCounts.get(key) ?? 0) + 1);
  }

  const areaLabels = new Map<string, string>();
  const areas: AreaOption[] = [];
  for (const [key, count] of recentCounts) {
    if (count < MIN_AREA_SALES) continue;
    const votes = [...(labelVotes.get(key) ?? [])].sort((a, b) => b[1] - a[1]);
    const label = votes[0]?.[0] ?? key;
    const kind = /^d\d{1,2}w?$/.test(key) ? 'district' : 'locality';
    areaLabels.set(key, label);
    areas.push({ key, label, kind, sales: count });
  }

  areas.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'district' ? -1 : 1;
    return a.kind === 'district'
      ? districtOrder(a.key) - districtOrder(b.key)
      : a.label.localeCompare(b.label);
  });

  return { sales, asOf, areas, areaLabels, loadedAt: now };
}

/** How long a loaded copy is served before it is refreshed from the database. */
const REFRESH_MS = 60 * 60 * 1000;

let cached: SalesStore | null = null;
let loading: Promise<SalesStore> | null = null;

function loadSeedFile(): SalesStore {
  const parsed = JSON.parse(readFileSync(findDataFile(), 'utf-8'));
  const rawSales: RawSale[] = Array.isArray(parsed) ? parsed : parsed.properties ?? [];
  return buildStore(rawSales, Date.now());
}

async function loadSales(): Promise<SalesStore> {
  const pool = getPool();
  if (!pool) return loadSeedFile();
  try {
    const { rows } = await pool.query(
      `SELECT address, sold_date::text AS "soldDate", sold_price AS "soldPrice", asking_price AS "askingPrice",
              beds, property_type AS "propertyType", dublin_postcode AS "dublinPostcode", sqm AS "areaSqm"
         FROM sales`
    );
    if (rows.length > 0) return buildStore(rows as RawSale[], Date.now());
    console.warn('The sales table is empty; serving the seed file until it is filled.');
  } catch (error) {
    // Keep a copy we already have; only a cold start falls back to the file
    if (cached) throw error;
    console.error('Sales could not be read from the database; serving the seed file:', error);
  }
  return loadSeedFile();
}

function refresh(): Promise<SalesStore> {
  loading ??= loadSales()
    .then((store) => {
      cached = store;
      return store;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

/**
 * The sales the pricing model works from, held in memory. The first call
 * loads them; after that a stale copy is served while a fresh one loads, so
 * new sales appear within the hour without a redeploy.
 */
export async function getSalesStore(): Promise<SalesStore> {
  if (!cached) return refresh();
  if (Date.now() - cached.loadedAt > REFRESH_MS) {
    refresh().catch((error) => console.error('Sales refresh failed:', error));
  }
  return cached;
}

export interface RegisterSale {
  date: string;
  address: string;
  price: number;
  areaKeys: string[];
}

let registerCache: { updated: string; sales: RegisterSale[]; loadedAt: number } | null = null;

/**
 * Recent second-hand sales from the public Property Price Register (sold
 * prices only), newest first.
 */
export async function getRegister(): Promise<{ updated: string; sales: RegisterSale[] }> {
  if (registerCache && Date.now() - registerCache.loadedAt < REFRESH_MS) return registerCache;
  const pool = getPool();
  let rows: Array<{ date: string; address: string; price: number }> = [];
  if (pool) {
    rows = (
      await pool.query(
        `SELECT sold_date::text AS date, address, price FROM register_sales
          WHERE NOT new_build AND sold_date >= CURRENT_DATE - INTERVAL '18 months'
          ORDER BY sold_date DESC`
      )
    ).rows;
  } else {
    const path = join(process.cwd(), 'public', 'ppr-dublin.json');
    if (existsSync(path)) {
      const parsed = JSON.parse(readFileSync(path, 'utf-8')) as {
        sales: Array<{ d: string; a: string; p: number; n: boolean }>;
      };
      rows = parsed.sales.filter((s) => !s.n).map((s) => ({ date: s.d, address: s.a, price: s.p }));
    }
  }
  registerCache = {
    updated: rows[0]?.date ?? '',
    sales: rows.map((r) => ({ ...r, areaKeys: extractAreas(r.address, null).map((a) => a.key) })),
    loadedAt: Date.now(),
  };
  return registerCache;
}
