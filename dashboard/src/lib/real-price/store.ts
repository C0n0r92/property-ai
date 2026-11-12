import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { cleanSale, extractAreas, type RawSale, type Sale } from './model';

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
}

/** An area needs this many sales in the last two years to be selectable. */
const MIN_AREA_SALES = 40;
const TWO_YEARS_MS = 730 * 86_400_000;

let cached: SalesStore | null = null;

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

  return { sales, asOf, areas, areaLabels };
}

/** Load and index the sold-property data once per server process. */
export function getSalesStore(): SalesStore {
  if (cached) return cached;
  const parsed = JSON.parse(readFileSync(findDataFile(), 'utf-8'));
  const rawSales: RawSale[] = Array.isArray(parsed) ? parsed : parsed.properties ?? [];
  cached = buildStore(rawSales, Date.now());
  return cached;
}
