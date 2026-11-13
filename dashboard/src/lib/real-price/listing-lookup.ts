/**
 * Turning a pasted listing link into the home to check: found in our
 * listings (collected nightly from MyHome.ie), or failing that, whatever the
 * link itself says.
 */
import { sameArea } from './address';
import type { ListingLink } from './listing-link';
import { extractAreas, toTypeGroup, type TypeGroup } from './model';
import { getPool } from './pool';
import type { SalesStore } from './store';

export interface ListingAnswer {
  /** found: the listing is in our records; partial: only what the link says */
  status: 'found' | 'partial';
  home: {
    areaKey?: string;
    typeGroup?: TypeGroup;
    beds?: number;
    askingPrice?: number;
  };
  listing?: {
    address: string;
    saleAgreed: boolean;
    listedSince: string;
    /** Asking price changes, oldest first; only when it has changed */
    priceHistory: Array<{ date: string; price: number }>;
  };
  /** What the visitor still has to tell us */
  missing: Array<'area' | 'type' | 'beds' | 'asking'>;
}

interface Row {
  source: string;
  source_id: string;
  address: string;
  district: string | null;
  property_type: string | null;
  beds: number | null;
  asking_price: number;
  sale_agreed: boolean;
  first_seen: string;
}

const COLUMNS = `source, source_id, address, district, property_type, beds, asking_price, sale_agreed, first_seen::text`;

/** The first of the address's areas that the price check knows. */
function areaFor(address: string, district: string | null, store: SalesStore): string | undefined {
  const fromAddress = extractAreas(address, district).map((a) => a.key);
  return fromAddress.find((key) => store.areaLabels.has(key));
}

function typeFor(propertyType: string | null): TypeGroup | null {
  if (/penthouse/i.test(propertyType ?? '')) return 'apartment';
  return toTypeGroup(propertyType);
}

async function findRow(link: ListingLink): Promise<Row | null> {
  const db = getPool();
  if (!db) return null;
  if (link.site === 'myhome') {
    const { rows } = await db.query<Row>(
      `SELECT ${COLUMNS} FROM listings WHERE source = 'myhome' AND source_id = $1`,
      [link.id]
    );
    if (rows[0]) return rows[0];
  }
  // The same home is usually listed on both sites: match on the address
  if (!/\d/.test(link.streetKey)) return null;
  const { rows } = await db.query<Row>(
    `SELECT ${COLUMNS} FROM listings
      WHERE address_key = $1 AND last_seen >= CURRENT_DATE - 60
      ORDER BY last_seen DESC LIMIT 10`,
    [link.streetKey]
  );
  return (
    rows.find((r) =>
      link.district && r.district ? r.district === link.district : sameArea(r.address, link.address)
    ) ?? null
  );
}

async function priceHistory(row: Row): Promise<Array<{ date: string; price: number }>> {
  const db = getPool();
  if (!db) return [];
  const { rows } = await db.query<{ date: string; price: number }>(
    `SELECT seen_on::text AS date, price FROM listing_prices
      WHERE source = $1 AND source_id = $2 ORDER BY seen_on`,
    [row.source, row.source_id]
  );
  // Keep only the days the price changed
  return rows.filter((r, i) => i === 0 || r.price !== rows[i - 1].price);
}

export async function lookUpListing(link: ListingLink, store: SalesStore): Promise<ListingAnswer> {
  const row = await findRow(link).catch((error) => {
    console.error('Listing lookup failed:', error);
    return null;
  });

  const home: ListingAnswer['home'] = {};
  let listing: ListingAnswer['listing'];

  if (row) {
    home.areaKey = areaFor(row.address, row.district, store) ?? areaFor(link.address, link.district, store);
    home.typeGroup = typeFor(row.property_type) ?? link.typeHint ?? undefined;
    if (row.beds && row.beds >= 1 && row.beds <= 10) home.beds = row.beds;
    if (row.asking_price >= 50_000 && row.asking_price <= 20_000_000) home.askingPrice = row.asking_price;
    const history = await priceHistory(row).catch(() => []);
    listing = {
      address: row.address,
      saleAgreed: row.sale_agreed,
      listedSince: row.first_seen,
      priceHistory: history.length > 1 ? history : [],
    };
  } else {
    home.areaKey = areaFor(link.address, link.district, store);
    if (link.typeHint) home.typeGroup = link.typeHint;
  }

  const missing: ListingAnswer['missing'] = [];
  if (!home.areaKey) missing.push('area');
  if (!home.typeGroup) missing.push('type');
  if (!home.beds) missing.push('beds');
  if (!home.askingPrice) missing.push('asking');

  return { status: row ? 'found' : 'partial', home, listing, missing };
}
