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
  /**
   * When the listing itself is not in our records: the type and size were
   * taken from other homes for sale on the same street
   */
  inferredFrom?: { street: string; count: number };
  /**
   * An estimated asking price, when the listing's own is unknown: the middle
   * of what homes of the same type and size on the same street ask (for sale
   * now) or asked (sold in the last two years)
   */
  estimatedAsking?: { value: number; count: number; low: number; high: number; basis: 'for-sale' | 'sold' };
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
  // The same home is usually listed on both sites: match on the address.
  // MyHome writes flats as "Apt 89 Rath Gael", so the flat prefix is ignored.
  if (!link.streetKeys.length) return null;
  const { rows } = await db.query<Row & { street: string }>(
    `SELECT ${COLUMNS}, regexp_replace(address_key, '^(APT|UNIT|FLAT|NO) ', '') AS street FROM listings
      WHERE regexp_replace(address_key, '^(APT|UNIT|FLAT|NO) ', '') = ANY($1)
        AND last_seen >= CURRENT_DATE - 60
      ORDER BY last_seen DESC LIMIT 20`,
    [link.streetKeys]
  );
  const sameDistrict = (r: Row) =>
    link.district && r.district ? r.district === link.district : sameArea(r.address, link.address);
  // The longest (most specific) street name that matches wins
  for (const key of link.streetKeys) {
    const found = rows.find((r) => r.street === key && sameDistrict(r));
    if (found) return found;
  }
  return null;
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

/**
 * Homes for sale now on the same street (same district or area), for when
 * the pasted listing itself is not in our records: what type and size they
 * mostly are.
 */
async function streetNeighbours(link: ListingLink): Promise<{ street: string; rows: Row[] } | null> {
  const db = getPool();
  const shortest = link.streetKeys[link.streetKeys.length - 1];
  if (!db || !shortest) return null;
  const street = shortest.replace(/^\d+[A-Z]?\s+/, '');
  if (street.split(' ').length < 2) return null;
  const { rows } = await db.query<Row>(
    `SELECT ${COLUMNS} FROM listings
      WHERE regexp_replace(address_key, '^(APT|UNIT|FLAT|NO) ', '') ~ ('^[0-9]+[A-Z]? ' || $1 || '$')
        AND last_seen >= CURRENT_DATE - 120
      ORDER BY last_seen DESC LIMIT 40`,
    [street.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')]
  );
  const here = rows.filter((r) =>
    link.district && r.district ? r.district === link.district : sameArea(r.address, link.address)
  );
  // One row per home (a listing can be collected more than once)
  const homes = [...new Map(here.map((r) => [`${r.source}:${r.source_id}`, r])).values()];
  return homes.length ? { street: street.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()), rows: homes } : null;
}

function middle(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Asking prices of homes like this one on the same street that sold in the last two years. */
async function streetSoldAskings(street: string, link: ListingLink, type: TypeGroup | undefined, beds: number | undefined): Promise<number[]> {
  const db = getPool();
  if (!db || !type || !beds) return [];
  const { rows } = await db.query<{ address: string; asking_price: number; property_type: string | null; beds: number | null }>(
    `SELECT address, asking_price, property_type, beds FROM sales
      WHERE lower(address) LIKE $1 AND sold_date >= CURRENT_DATE - 730 AND beds = $2
      LIMIT 60`,
    [`%${street.toLowerCase()}%`, beds]
  );
  return rows
    .filter((r) => typeFor(r.property_type) === type && sameArea(r.address, link.address))
    .map((r) => r.asking_price);
}

function mostCommon<T>(values: T[]): T | undefined {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
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

  // Not in our records: take the type and size from the street's other homes for sale
  let inferredFrom: ListingAnswer['inferredFrom'];
  if (!row && (!home.typeGroup || !home.beds)) {
    const neighbours = await streetNeighbours(link).catch(() => null);
    if (neighbours) {
      const types = neighbours.rows.map((r) => typeFor(r.property_type)).filter((t): t is TypeGroup => t !== null);
      const beds = neighbours.rows.map((r) => r.beds).filter((b): b is number => !!b && b >= 1 && b <= 10);
      const type = home.typeGroup ?? mostCommon(types);
      // Bedrooms only from homes of the same type
      const sameTypeBeds = neighbours.rows
        .filter((r) => typeFor(r.property_type) === type && r.beds)
        .map((r) => r.beds as number);
      const bed = mostCommon(sameTypeBeds.length ? sameTypeBeds : beds);
      if (type || bed) {
        if (!home.typeGroup && type) home.typeGroup = type;
        if (!home.beds && bed) home.beds = bed;
        home.areaKey ??= areaFor(neighbours.rows[0].address, neighbours.rows[0].district, store);
        inferredFrom = { street: neighbours.street, count: neighbours.rows.length };
      }
    }
  }

  // No asking price: estimate it from homes of the same type and size on the same street
  let estimatedAsking: ListingAnswer['estimatedAsking'];
  if (!home.askingPrice && home.typeGroup && home.beds) {
    const neighbours = await streetNeighbours(link).catch(() => null);
    const forSale = (neighbours?.rows ?? [])
      .filter((r) => typeFor(r.property_type) === home.typeGroup && r.beds === home.beds)
      .map((r) => r.asking_price)
      .filter((p) => p >= 50_000 && p <= 20_000_000);
    let basis: 'for-sale' | 'sold' = 'for-sale';
    let prices = forSale;
    if (prices.length < 2 && neighbours) {
      prices = await streetSoldAskings(neighbours.street, link, home.typeGroup, home.beds).catch(() => []);
      basis = 'sold';
    }
    if (prices.length >= 2) {
      const value = Math.round(middle(prices) / 5000) * 5000;
      home.askingPrice = value;
      estimatedAsking = { value, count: prices.length, low: Math.min(...prices), high: Math.max(...prices), basis };
    }
  }

  const missing: ListingAnswer['missing'] = [];
  if (!home.areaKey) missing.push('area');
  if (!home.typeGroup) missing.push('type');
  if (!home.beds) missing.push('beds');
  if (!home.askingPrice) missing.push('asking');

  return { status: row ? 'found' : 'partial', home, listing, missing, inferredFrom, estimatedAsking };
}
