/**
 * "What is it worth?" from the database: find a home's sales on the
 * register, bring its last price to today with its area's index (built by
 * pipeline/src/build-worth.ts), blend in recent sales on its street, and
 * give a range from how accurate the method has measured in its county.
 */
import { addressKey, sameArea } from './address';
import { tidyAddress } from './model';
import { getPool } from './pool';
import { streetIdentity } from './streets';
import { alikeNeighbours, blendWithStreet, bringForward, indexArea, isHomeKey, rangeAround, yearOf, type ErrorBands, type PriceIndex } from './worth';

/** New homes are registered without VAT: add it back so the price compares with a resale */
const NEW_BUILD_VAT = 1.135;
/**
 * Dublin homes granted an extension or attic conversion between two sales
 * resold a median 6.2% above their area's index, against 0.2% for the rest
 * (716 and 19,842 resales since 2012; pipeline/src/worth-planning-test.ts).
 */
const EXTENSION_UPLIFT = 1.06;
const MARKET_PRICE = 50_000;

interface Model {
  indexes: Map<string, PriceIndex>;
  accuracy: Map<string, { tested: number; medianAbs: number; within10: number; bands: ErrorBands['bands'] }>;
  loadedAt: number;
}
let cache: Model | null = null;

async function model(): Promise<Model | null> {
  if (cache && Date.now() - cache.loadedAt < 3_600_000) return cache;
  const db = getPool();
  if (!db) return null;
  try {
    const [idx, acc] = await Promise.all([
      db.query<{ area_key: string; county: string; from_year: number; vals: number[]; pairs: number }>(
        'SELECT area_key, county, from_year, vals, pairs FROM price_indexes'
      ),
      db.query<{ county: string; tested: number; median_abs: number; within10: number; bands: ErrorBands['bands'] }>(
        'SELECT county, tested, median_abs, within10, bands FROM worth_accuracy'
      ),
    ]);
    cache = {
      indexes: new Map(idx.rows.map((r) => [`${r.county}|${r.area_key}`, { from: r.from_year, values: r.vals, pairs: r.pairs }])),
      accuracy: new Map(acc.rows.map((r) => [r.county, { tested: r.tested, medianAbs: r.median_abs, within10: r.within10, bands: r.bands }])),
      loadedAt: Date.now(),
    };
    return cache;
  } catch {
    // Tables arrive with the worth migration; until then there is no estimate
    return null;
  }
}

export interface HomeWorth {
  address: string;
  county: string;
  /** The area whose prices moved it: 'Dublin 8', 'Naas, Co. Kildare', 'Co. Kerry' */
  areaName: string;
  lastSale: { price: number; date: string; newBuild: boolean };
  previous: Array<{ price: number; date: string }>;
  estimate: { mid: number; low: number; high: number; areaChangePct: number; neighbours: number };
  /** Extension or attic granted since the last sale (Dublin), applied as the measured uplift */
  extended: { year: number; work: string } | null;
  accuracy: { medianAbs: number; within10: number; tested: number } | null;
  streetSlug: string | null;
}

const areaNameOf = (county: string, district: string | null, address: string): string => {
  if (county === 'Dublin' && district) return `Dublin ${district.slice(1).toUpperCase()}`;
  return streetIdentity(address, county)?.areaLabel ?? (county === 'Dublin' ? 'Dublin' : `Co. ${county}`);
};

/**
 * Homes matching an address (house number and street), with their estimates.
 * Several homes can share a house number and street name across the country;
 * when the address names a town or district, those that agree come first.
 */
export async function worthFor(address: string): Promise<{ homes: HomeWorth[]; reason?: 'no_number' | 'not_found' | 'unavailable' }> {
  const key = addressKey(address);
  if (!isHomeKey(key.key)) return { homes: [], reason: 'no_number' };
  const db = getPool();
  const m = await model();
  if (!db || !m) return { homes: [], reason: 'unavailable' };

  const { rows } = await db.query<{
    address: string;
    county: string;
    district: string | null;
    date: string;
    price: number;
    new_build: boolean;
    street_slug: string | null;
  }>(
    `SELECT address, county, district, sold_date::text AS date, price, new_build, street_slug
       FROM register_sales WHERE address_key = $1 AND price >= ${MARKET_PRICE}
      ORDER BY sold_date DESC LIMIT 200`,
    [key.key]
  );
  if (!rows.length) return { homes: [], reason: 'not_found' };

  // One home per county and area
  const homes = new Map<string, typeof rows>();
  for (const r of rows) {
    const area = indexArea(r.county, r.county === 'Dublin' ? r.district : null, streetIdentity(r.address, r.county)?.areaKey ?? null);
    const id = `${r.county}|${area}`;
    homes.set(id, [...(homes.get(id) ?? []), r]);
  }

  const now = yearOf(new Date().toISOString().slice(0, 10));
  const out: HomeWorth[] = [];
  for (const [id, sales] of homes) {
    const [county, area] = id.split('|');
    const index = m.indexes.get(`${county}|${area}`) ?? m.indexes.get(`${county}|county:${county}`);
    if (!index) continue;
    const last = sales[0];
    const lastPrice = last.new_build ? last.price * NEW_BUILD_VAT : last.price;
    const own = bringForward(index, lastPrice, yearOf(last.date), now);

    // Neighbours: other homes on the street sold in the last three years, brought to today
    let neighbours: number[] = [];
    if (last.street_slug) {
      const { rows: near } = await db.query<{ price: number; date: string; new_build: boolean }>(
        `SELECT price, sold_date::text AS date, new_build FROM register_sales
          WHERE street_slug = $1 AND address_key <> $2 AND price >= ${MARKET_PRICE}
            AND sold_date >= CURRENT_DATE - INTERVAL '3 years'`,
        [last.street_slug, key.key]
      );
      neighbours = near.map((n) => bringForward(index, n.new_build ? n.price * NEW_BUILD_VAT : n.price, yearOf(n.date), now));
    }
    // Planning: an extension or attic granted since the last sale (Dublin's registers only)
    let extended: HomeWorth['extended'] = null;
    if (county === 'Dublin') {
      const { rows: plans } = await db
        .query<{ decided: string; kinds: string[] }>(
          `SELECT decision_date::text AS decided, kinds FROM planning_applications
            WHERE home_key = $1 AND decision IN ('granted','part') AND decision_date > $2::date
              AND kinds && ARRAY['extension','attic'] AND ($3::text IS NULL OR district IS NULL OR district = $3)
            ORDER BY decision_date LIMIT 1`,
          [key.key, last.date, last.district]
        )
        .catch(() => ({ rows: [] as Array<{ decided: string; kinds: string[] }> }));
      if (plans[0]) {
        const kinds = plans[0].kinds.filter((k) => k === 'extension' || k === 'attic');
        extended = { year: Number(plans[0].decided.slice(0, 4)), work: kinds.join(' and ') };
      }
    }
    const mid = blendWithStreet(own, neighbours) * (extended ? EXTENSION_UPLIFT : 1);
    const acc = m.accuracy.get(county) ?? m.accuracy.get('ALL') ?? null;
    const range = rangeAround(mid, acc?.bands ?? [], now - yearOf(last.date));
    const round = (v: number) => Math.round(v / 1000) * 1000;
    out.push({
      address: tidyAddress(last.address),
      county,
      areaName: areaNameOf(county, last.district, last.address),
      lastSale: { price: last.price, date: last.date, newBuild: last.new_build },
      previous: sales.slice(1, 6).map((s) => ({ price: s.price, date: s.date })),
      estimate: {
        mid: round(mid),
        low: round(range.low),
        high: round(range.high),
        areaChangePct: (own / lastPrice - 1) * 100,
        // Only the neighbours the blend used, and only when there were enough to use
        neighbours: alikeNeighbours(own, neighbours).length >= 3 ? alikeNeighbours(own, neighbours).length : 0,
      },
      extended,
      accuracy: acc ? { medianAbs: acc.medianAbs, within10: acc.within10, tested: acc.tested } : null,
      streetSlug: last.street_slug,
    });
  }
  // When the visitor names a place (a district or town), only homes there
  const named = address.includes(',') || /dublin\s*\d/i.test(address);
  const here = named ? out.filter((h) => sameArea(h.address, address) || h.areaName.toLowerCase().split(',')[0].trim() === address.split(',').slice(1).join(' ').trim().toLowerCase()) : out;
  here.sort((a, b) => b.lastSale.date.localeCompare(a.lastSale.date));
  return { homes: here.slice(0, 8), reason: here.length ? undefined : 'not_found' };
}

/** The headline accuracy for the page. */
export async function worthAccuracy() {
  const m = await model();
  return m ? { all: m.accuracy.get('ALL') ?? null, dublin: m.accuracy.get('Dublin') ?? null } : null;
}
