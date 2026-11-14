/**
 * Everything we know about one home, for its page (/home/<slug>): its sales,
 * its listings and their asking prices, its planning, its street, what it is
 * likely worth, and (in Dublin, when we know its asking price) the price check.
 * All read by home_id (pipeline/src/build-homes.ts).
 */
import type { HomeRow } from './home-lookup';
import { toTypeGroup, type TypeGroup } from './model';
import { decisionWord, workSummary, type PlanningRow } from './planning-data';
import { getPool } from './pool';
import { worthForHome, type HomeWorth } from './worth-data';

export interface HomeListing {
  source: string;
  address: string;
  askingPrice: number;
  /** Asking prices over time, oldest first, when it changed */
  history: Array<{ date: string; price: number }>;
  firstSeen: string;
  lastSeen: string;
  saleAgreed: boolean;
  beds: number | null;
  typeGroup: TypeGroup | null;
  sqm: number | null;
  url: string | null;
}

export type TimelineEvent =
  | { kind: 'sold'; date: string; price: number; newBuild: boolean; asking: number | null }
  | { kind: 'listed'; date: string; until: string; price: number; firstPrice: number; saleAgreed: boolean }
  | { kind: 'planning'; date: string; decision: string; work: string; appNumber: string };

export interface HomePage {
  slug: string;
  homeId: string;
  address: string;
  county: string;
  areaKey: string;
  /** 'Dublin 8', 'Lucan', 'Naas, Co. Kildare' */
  areaName: string;
  street: { slug: string; name: string } | null;
  sales: Array<{ date: string; price: number; newBuild: boolean; address: string }>;
  listings: HomeListing[];
  planning: PlanningRow[];
  timeline: TimelineEvent[];
  worth: HomeWorth | null;
  /** On the market now (seen in the last 30 days) */
  forSale: HomeListing | null;
  /** What the price check needs, when we know the asking price, type and size (Dublin) */
  check: { areaKey: string; typeGroup: TypeGroup; beds: number; askingPrice: number } | null;
}

const areaNameOf = (areaKey: string, county: string, streetArea: string | null) => {
  if (/^d\d/.test(areaKey)) return `Dublin ${areaKey.slice(1).toUpperCase()}`;
  if (streetArea) return streetArea;
  if (areaKey.startsWith('county:')) return county === 'Dublin' ? 'Dublin' : `Co. ${county}`;
  return areaKey
    .replace(new RegExp(`-${county.toLowerCase()}$`), '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .concat(county === 'Dublin' ? '' : `, Co. ${county}`);
};

/** The home's page, or null if there is no such home (or no database). */
export async function loadHomePage(slug: string, knownAreas: Set<string>): Promise<HomePage | null> {
  const db = getPool();
  if (!db || !/^[a-z0-9-]{3,160}$/.test(slug)) return null;
  const home = (
    await db
      .query<HomeRow & { slug: string }>(
        `SELECT home_id, slug, county, area_key, address_key, address, street_slug, sales, listings, planning,
                last_sold::text, last_price FROM homes WHERE slug = $1`,
        [slug]
      )
      .catch(() => ({ rows: [] as Array<HomeRow & { slug: string }> }))
  ).rows[0];
  if (!home) return null;

  const [sales, listings, history, planning, street] = await Promise.all([
    db.query<{ date: string; price: number; new_build: boolean; address: string; asking: number | null }>(
      `SELECT r.sold_date::text AS date, r.price, r.new_build, r.address, s.asking_price AS asking
         FROM register_sales r LEFT JOIN sales s ON s.register_id = r.id
        WHERE r.home_id = $1 ORDER BY r.sold_date DESC`,
      [home.home_id]
    ),
    db.query<{
      source: string; source_id: string; address: string; asking_price: number; first_seen: string; last_seen: string;
      sale_agreed: boolean; beds: number | null; property_type: string | null; sqm: number | null; url: string | null;
    }>(
      `SELECT source, source_id, address, asking_price, first_seen::text, last_seen::text, sale_agreed, beds,
              property_type, sqm, url FROM listings WHERE home_id = $1 ORDER BY last_seen DESC`,
      [home.home_id]
    ),
    db.query<{ source: string; source_id: string; seen_on: string; price: number }>(
      `SELECT p.source, p.source_id, p.seen_on::text, p.price FROM listing_prices p
         JOIN listings l ON l.source = p.source AND l.source_id = p.source_id
        WHERE l.home_id = $1 ORDER BY p.seen_on`,
      [home.home_id]
    ),
    db
      .query<{ app_number: string; authority: string; address: string; description: string | null; kinds: string[]; decision: string; received: string | null; decided: string | null }>(
        `SELECT app_number, authority, address, description, kinds, decision, received_date::text AS received,
                decision_date::text AS decided
           FROM planning_applications WHERE home_id = $1 AND decision <> 'invalid' ORDER BY received_date DESC NULLS LAST`,
        [home.home_id]
      )
      .catch(() => ({ rows: [] })),
    home.street_slug
      ? db.query<{ slug: string; name: string; area_name: string | null }>(
          'SELECT slug, name, area_name FROM streets WHERE slug = $1',
          [home.street_slug]
        )
      : Promise.resolve({ rows: [] as Array<{ slug: string; name: string; area_name: string | null }> }),
  ]);

  const homeListings: HomeListing[] = listings.rows.map((l) => {
    // Asking prices over time: only the changes
    const seen = history.rows.filter((h) => h.source === l.source && h.source_id === l.source_id);
    const changes = seen.filter((h, i) => i === 0 || h.price !== seen[i - 1].price).map((h) => ({ date: h.seen_on, price: h.price }));
    return {
      source: l.source,
      address: l.address,
      askingPrice: l.asking_price,
      history: changes.length ? changes : [{ date: l.first_seen, price: l.asking_price }],
      firstSeen: l.first_seen,
      lastSeen: l.last_seen,
      saleAgreed: l.sale_agreed,
      beds: l.beds,
      typeGroup: toTypeGroup(l.property_type),
      sqm: l.sqm,
      url: l.url,
    };
  });

  const planningRows: PlanningRow[] = planning.rows.map((r) => ({
    appNumber: r.app_number,
    authority: r.authority,
    address: r.address,
    description: (r.description ?? '').trim(),
    kinds: r.kinds ?? [],
    decision: r.decision,
    received: r.received,
    decided: r.decided,
  }));

  const timeline: TimelineEvent[] = [
    ...sales.rows.map((s) => ({ kind: 'sold' as const, date: s.date, price: s.price, newBuild: s.new_build, asking: s.asking })),
    ...homeListings.map((l) => ({
      kind: 'listed' as const,
      date: l.firstSeen,
      until: l.lastSeen,
      price: l.askingPrice,
      firstPrice: l.history[0]?.price ?? l.askingPrice,
      saleAgreed: l.saleAgreed,
    })),
    ...planningRows
      .filter((p) => p.received)
      .map((p) => ({ kind: 'planning' as const, date: p.received!, decision: decisionWord(p.decision), work: workSummary(p, 120), appNumber: p.appNumber })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const forSale = homeListings.find((l) => l.lastSeen >= thirtyDaysAgo) ?? null;
  // The price check needs Dublin, an area the model knows, and the listing's type, size and asking price
  const basis = forSale ?? homeListings[0] ?? null;
  const checkArea = /^d\d/.test(home.area_key) ? home.area_key : home.area_key;
  const check =
    home.county === 'Dublin' && basis && basis.typeGroup && basis.beds && knownAreas.has(checkArea)
      ? { areaKey: checkArea, typeGroup: basis.typeGroup, beds: basis.beds, askingPrice: basis.askingPrice }
      : null;

  const streetRow = street.rows[0];
  return {
    slug: home.slug,
    homeId: home.home_id,
    address: home.address,
    county: home.county,
    areaKey: home.area_key,
    areaName: areaNameOf(home.area_key, home.county, streetRow?.area_name ?? null),
    street: streetRow ? { slug: streetRow.slug, name: streetRow.name } : null,
    sales: sales.rows.map((s) => ({ date: s.date, price: s.price, newBuild: s.new_build, address: s.address })),
    listings: homeListings,
    planning: planningRows,
    timeline,
    worth: await worthForHome(home),
    forSale,
    check,
  };
}
