/**
 * Street pages (/streets/<slug>): every register sale on a street, prices by
 * year, homes that sold more than once, and asking against sold where the
 * asking price is known. Streets are built by pipeline/src/build-streets.ts.
 */
import { addressKey } from './address';
import { tidyAddress, toTypeGroup, type TypeGroup } from './model';
import { getPool } from './pool';
import { areaSlugOf, isBulkSale } from './streets';

export interface StreetRow {
  slug: string;
  name: string;
  area_key: string;
  area_label: string;
  sales: number;
  first_sale: string;
  last_sale: string;
  median_recent: number | null;
  recent_sales: number;
}

export interface StreetSaleRow {
  date: string;
  address: string;
  price: number;
  new_build: boolean;
  /** From our matched records, when the asking price is known */
  asking: number | null;
  beds: number | null;
  property_type: string | null;
}

export interface StreetLink {
  slug: string;
  name: string;
  areaLabel: string;
  sales: number;
  medianRecent: number | null;
}

export interface RepeatSale {
  address: string;
  from: { date: string; price: number };
  to: { date: string; price: number };
  changePct: number;
  years: number;
}

export interface StreetPage {
  slug: string;
  name: string;
  areaKey: string;
  areaSlug: string;
  areaLabel: string;
  /** Sales at EUR 50k and over, newest first, without blocks of homes sold together */
  sales: Array<StreetSaleRow & { overAskingPct: number | null }>;
  count: number;
  firstYear: number;
  lastSale: { date: string; price: number } | null;
  /** Median over the last three years, with at least three sales */
  typical: { price: number; count: number } | null;
  /** Median by calendar year */
  years: Array<{ year: number; median: number; count: number }>;
  /** Typical change from an earlier period to the last three years */
  change: { fromYears: string; pct: number } | null;
  asking: { count: number; medianOverAskingPct: number; shareAbove: number } | null;
  repeats: RepeatSale[];
  /** For the price check's starting values */
  common: { type: TypeGroup; beds: number } | null;
  nearby: StreetLink[];
}

const MARKET_PRICE = 50_000;
const YEAR_MS = 365.25 * 86_400_000;

const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** The page from a street's rows; pure, so it can be tested without a database. */
export function buildStreetPage(street: StreetRow, rows: StreetSaleRow[], nearby: StreetLink[], now: number): StreetPage {
  const market = rows.filter((r) => r.price >= MARKET_PRICE);
  const streetMedian = market.length ? median(market.map((r) => r.price)) : 0;
  const sales = market
    .filter((r) => !isBulkSale(r.address, r.price, streetMedian))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((r) => ({
      ...r,
      address: tidyAddress(r.address),
      overAskingPct: r.asking ? ((r.price - r.asking) / r.asking) * 100 : null,
    }));

  const recentCut = now - 3 * YEAR_MS;
  const recent = sales.filter((s) => new Date(s.date).getTime() >= recentCut);
  const typical = recent.length >= 3 ? { price: Math.round(median(recent.map((s) => s.price))), count: recent.length } : null;

  const byYear = new Map<number, number[]>();
  for (const s of sales) {
    const y = Number(s.date.slice(0, 4));
    byYear.set(y, [...(byYear.get(y) ?? []), s.price]);
  }
  const years = [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, prices]) => ({ year, median: Math.round(median(prices)), count: prices.length }));

  // Change: the last three years against the earliest three-year window with enough sales
  let change: StreetPage['change'] = null;
  if (typical) {
    const nowYear = new Date(now).getFullYear();
    for (let start = years[0]?.year ?? nowYear; start <= nowYear - 6; start++) {
      const window = sales.filter((s) => {
        const y = Number(s.date.slice(0, 4));
        return y >= start && y <= start + 2;
      });
      if (window.length >= 3) {
        const before = median(window.map((s) => s.price));
        change = { fromYears: `${start}–${String(start + 2).slice(2)}`, pct: ((typical.price - before) / before) * 100 };
        break;
      }
    }
  }

  const withAsking = sales.filter((s) => s.overAskingPct !== null);
  const asking =
    withAsking.length >= 3
      ? {
          count: withAsking.length,
          medianOverAskingPct: median(withAsking.map((s) => s.overAskingPct!)),
          shareAbove: withAsking.filter((s) => s.overAskingPct! > 0).length / withAsking.length,
        }
      : null;

  // Homes sold more than once: first and latest sale of each numbered home
  const byHome = new Map<string, typeof sales>();
  for (const s of sales) {
    const key = addressKey(s.address);
    if (!key.specific) continue;
    byHome.set(key.key, [...(byHome.get(key.key) ?? []), s]);
  }
  const repeats: RepeatSale[] = [];
  for (const homeSales of byHome.values()) {
    if (homeSales.length < 2) continue;
    const ordered = [...homeSales].sort((a, b) => a.date.localeCompare(b.date));
    const from = ordered[0];
    const to = ordered[ordered.length - 1];
    const years = (new Date(to.date).getTime() - new Date(from.date).getTime()) / YEAR_MS;
    // A resale within six months is usually a correction or a flip, not a market move
    if (years < 0.5) continue;
    repeats.push({
      address: to.address,
      from: { date: from.date, price: from.price },
      to: { date: to.date, price: to.price },
      changePct: ((to.price - from.price) / from.price) * 100,
      years,
    });
  }
  repeats.sort((a, b) => b.to.date.localeCompare(a.to.date));

  // The most common type and size among homes with known details
  const kinds = new Map<string, number>();
  for (const s of sales) {
    const type = toTypeGroup(s.property_type);
    if (type && s.beds) kinds.set(`${type}|${s.beds}`, (kinds.get(`${type}|${s.beds}`) ?? 0) + 1);
  }
  const top = [...kinds.entries()].sort((a, b) => b[1] - a[1])[0];
  const common = top ? { type: top[0].split('|')[0] as TypeGroup, beds: Number(top[0].split('|')[1]) } : null;

  return {
    slug: street.slug,
    name: street.name,
    areaKey: street.area_key,
    areaSlug: areaSlugOf(street.area_key),
    areaLabel: street.area_label,
    sales,
    count: sales.length,
    firstYear: years[0]?.year ?? Number(street.first_sale.slice(0, 4)),
    lastSale: sales[0] ? { date: sales[0].date, price: sales[0].price } : null,
    typical,
    years,
    change,
    asking,
    repeats,
    common,
    nearby,
  };
}

const toLink = (r: StreetRow): StreetLink => ({
  slug: r.slug,
  name: r.name,
  areaLabel: r.area_label,
  sales: r.sales,
  medianRecent: r.median_recent,
});

/** A street's page from the database; null when there is no database or no such street. */
export async function loadStreetPage(slug: string): Promise<StreetPage | null> {
  const db = getPool();
  if (!db || !/^[a-z0-9-]{3,120}$/.test(slug)) return null;
  const street = (
    await db.query<StreetRow>(
      `SELECT slug, name, area_key, area_label, sales, first_sale::text, last_sale::text, median_recent, recent_sales
         FROM streets WHERE slug = $1`,
      [slug]
    )
  ).rows[0];
  if (!street) return null;

  const [sales, nearby] = await Promise.all([
    db.query<StreetSaleRow>(
      // Asking price from our records: the same sale has the same date and price
      `SELECT r.sold_date::text AS date, r.address, r.price, r.new_build,
              m.asking_price AS asking, m.beds, m.property_type
         FROM register_sales r
         LEFT JOIN LATERAL (
           SELECT asking_price, beds, property_type FROM sales s
            WHERE s.sold_date = r.sold_date AND s.sold_price = r.price
            ORDER BY (s.register_id = r.id) DESC NULLS LAST LIMIT 1
         ) m ON TRUE
        WHERE r.street_slug = $1
        ORDER BY r.sold_date DESC`,
      [slug]
    ),
    db.query<StreetRow>(
      `SELECT slug, name, area_key, area_label, sales, first_sale::text, last_sale::text, median_recent, recent_sales
         FROM streets WHERE area_key = $1 AND slug <> $2
        ORDER BY sales DESC LIMIT 12`,
      [street.area_key, slug]
    ),
  ]);
  return buildStreetPage(street, sales.rows, nearby.rows.map(toLink), Date.now());
}

/** Every street with a page in an area, for area pages; [] without a database. */
export async function streetsInArea(areaKey: string): Promise<StreetLink[]> {
  const db = getPool();
  if (!db) return [];
  const { rows } = await db.query<StreetRow>(
    `SELECT slug, name, area_key, area_label, sales, first_sale::text, last_sale::text, median_recent, recent_sales
       FROM streets WHERE area_key = $1 ORDER BY name`,
    [areaKey]
  );
  return rows.map(toLink);
}

/** Areas that have street pages, with counts, for the streets index. */
export async function streetAreas(): Promise<Array<{ areaKey: string; areaSlug: string; areaLabel: string; streets: number }>> {
  const db = getPool();
  if (!db) return [];
  const { rows } = await db.query<{ area_key: string; streets: number }>(
    `SELECT area_key, COUNT(*)::int AS streets FROM streets GROUP BY area_key ORDER BY area_key`
  );
  return rows.map((r) => ({
    areaKey: r.area_key,
    areaSlug: areaSlugOf(r.area_key),
    areaLabel: /^d\d/.test(r.area_key) ? `Dublin ${r.area_key.slice(1).toUpperCase()}` : labelOfTown(r.area_key),
    streets: r.streets,
  }));
}

const labelOfTown = (key: string) => key.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

/** Every street page, for the sitemap. */
export async function allStreets(): Promise<Array<{ slug: string; lastSale: string }>> {
  const db = getPool();
  if (!db) return [];
  const { rows } = await db.query<{ slug: string; last_sale: string }>('SELECT slug, last_sale::text FROM streets');
  return rows.map((r) => ({ slug: r.slug, lastSale: r.last_sale }));
}
