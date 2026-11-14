/**
 * The one search box: an address, an Eircode or a Daft/MyHome link, to the
 * home it is (its page) or, for a listing we don't hold, the price check.
 */
import { isEircode } from './schema';
import { parseListingLink } from './listing-link';
import { lookUpListing } from './listing-lookup';
import { resolveHomes } from './home-lookup';
import { getPool } from './pool';
import type { SalesStore } from './store';

export interface HomeHit {
  slug: string;
  address: string;
  county: string;
  sales: number;
  lastSold: string | null;
  lastPrice: number | null;
}

export type SearchAnswer =
  | { kind: 'homes'; homes: HomeHit[] }
  /** A listing link whose home we can't place: go to the price check with what the link told us */
  | { kind: 'check'; href: string; address: string | null }
  | { kind: 'none'; reason: 'no_number' | 'not_found' | 'bad_link' };

const looksLikeLink = (q: string) => /(daft\.ie|myhome\.ie)\//i.test(q);

async function hitsFor(homeIds: string[]): Promise<HomeHit[]> {
  const db = getPool();
  if (!db || !homeIds.length) return [];
  const { rows } = await db.query<{ slug: string; address: string; county: string; sales: number; last_sold: string | null; last_price: number | null }>(
    `SELECT slug, address, county, sales, last_sold::text, last_price FROM homes WHERE home_id = ANY($1) AND slug IS NOT NULL
      ORDER BY sales DESC, last_sold DESC NULLS LAST LIMIT 12`,
    [homeIds]
  );
  return rows.map((r) => ({ slug: r.slug, address: r.address, county: r.county, sales: r.sales, lastSold: r.last_sold, lastPrice: r.last_price }));
}

export async function searchHomes(query: string, store: SalesStore): Promise<SearchAnswer> {
  const q = query.trim();
  const db = getPool();

  // A listing link: the listing's home if we hold the listing, else the price check with what the link says
  if (looksLikeLink(q)) {
    const link = parseListingLink(q);
    if (!link) return { kind: 'none', reason: 'bad_link' };
    if (db) {
      const { rows } = await db.query<{ home_id: string | null }>(
        'SELECT home_id FROM listings WHERE source = $1 AND source_id = $2',
        [link.site === 'daft' ? 'daft_legacy' : 'myhome', link.id]
      );
      const hits = await hitsFor(rows.map((r) => r.home_id).filter((h): h is string => !!h));
      if (hits.length) return { kind: 'homes', homes: hits };
    }
    const answer = await lookUpListing(link, store);
    const fromAddress = answer.listing?.address ? await resolveHomes(answer.listing.address, 'Dublin') : [];
    if (fromAddress.length === 1) return { kind: 'homes', homes: await hitsFor([fromAddress[0].home_id]) };
    const h = answer.home;
    const params = new URLSearchParams();
    if (h.areaKey) params.set('area', h.areaKey);
    if (h.typeGroup) params.set('type', h.typeGroup);
    if (h.beds) params.set('beds', String(h.beds));
    if (h.askingPrice) params.set('asking', String(h.askingPrice));
    return { kind: 'check', href: `/?${params}#check`, address: answer.listing?.address ?? link.address };
  }

  // An Eircode: the home a sale or listing recorded it for
  if (isEircode(q) && db) {
    const code = q.replace(/\s/g, '').toUpperCase();
    const { rows } = await db.query<{ home_id: string }>(
      `SELECT home_id FROM register_sales WHERE upper(replace(eircode, ' ', '')) = $1 AND home_id IS NOT NULL
       UNION SELECT home_id FROM listings WHERE upper(replace(eircode, ' ', '')) = $1 AND home_id IS NOT NULL`,
      [code]
    );
    const hits = await hitsFor(rows.map((r) => r.home_id));
    return hits.length ? { kind: 'homes', homes: hits } : { kind: 'none', reason: 'not_found' };
  }

  // An address: the homes it could be
  if (!/\d/.test(q.split(',')[0] ?? '')) return { kind: 'none', reason: 'no_number' };
  const homes = await resolveHomes(q);
  const hits = await hitsFor(homes.map((h) => h.home_id));
  return hits.length ? { kind: 'homes', homes: hits } : { kind: 'none', reason: 'not_found' };
}
