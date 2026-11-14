/**
 * What our data shows that buyers cannot easily get elsewhere: earlier sales
 * of the same home and street (Property Price Register since 2010), what an
 * asking-price cut means for the final price, round versus just-under asking
 * prices, and how long homes take from listing to completed sale.
 *
 * Market-wide figures are worked out in SQL and cached for six hours; the
 * per-report lookups run when a report opens. Everything returns null or
 * empty without a database, so pages still render from the seed file.
 */
import { addressKey, sameArea } from './address';
import { getPool } from './pool';

export interface MarketInsights {
  /** Homes we matched that had sold before, and how their price changed */
  repeat: { matched: number; withEarlier: number; medianGainPct: number; medianYears: number; homesSoldTwice: number };
  /** Matched sales whose asking price was cut, against those left unchanged */
  cuts: {
    cutCount: number;
    averageCutPct: number;
    cutMedianOverAskingPct: number;
    cutShareAbove: number;
    unchangedCount: number;
    unchangedMedianOverAskingPct: number;
    unchangedShareAbove: number;
  };
  /** Asking prices just under a round €50,000 step against round ones, since 2024 */
  roundPricing: {
    underCount: number;
    underMedianOverAskingPct: number;
    underShareAbove: number;
    roundCount: number;
    roundMedianOverAskingPct: number;
    roundShareAbove: number;
  };
  /** Days from first listed to the sale being registered (completion) */
  timeline: { count: number; p25: number; median: number; p75: number };
}

const SIX_HOURS = 6 * 60 * 60 * 1000;
let cached: { at: number; value: MarketInsights | null } | null = null;

const num = (v: unknown) => Number(v ?? 0);

async function loadMarketInsights(): Promise<MarketInsights | null> {
  const db = getPool();
  if (!db) return null;

  const repeat = await db.query(`
    WITH s AS (
      SELECT s.id, s.sold_date, s.sold_price, r.address_key k, r.district d
        FROM sales s JOIN register_sales r ON r.id = s.register_id
       WHERE r.address_key ~ '^[0-9]' AND r.county = 'Dublin'),
    p AS (
      SELECT DISTINCT ON (s.id) s.id, s.sold_price, s.sold_date, r2.price prev_price, r2.sold_date prev_date
        FROM s JOIN register_sales r2
          ON r2.address_key = s.k AND coalesce(r2.district, '') = coalesce(s.d, '') AND r2.sold_date < s.sold_date - 180
         AND r2.county = 'Dublin'
       ORDER BY s.id, r2.sold_date DESC)
    SELECT (SELECT count(*) FROM sales WHERE register_id IS NOT NULL) matched,
           count(*) with_earlier,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY sold_price::numeric / prev_price) gain,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY (sold_date - prev_date) / 365.25) years,
           (SELECT count(*) FROM (SELECT 1 FROM register_sales WHERE address_key ~ '^[0-9]' AND county = 'Dublin'
              GROUP BY address_key, district HAVING count(*) > 1) t) twice
      FROM p`);

  const cuts = await db.query(`
    WITH h AS (
      SELECT s.sold_price, s.asking_price final_ask,
             (SELECT price FROM listing_prices p WHERE p.source = s.listing_source AND p.source_id = s.listing_id
               ORDER BY seen_on LIMIT 1) first_ask
        FROM sales s WHERE s.listing_id IS NOT NULL)
    SELECT first_ask > final_ask AS cut, count(*) n,
           avg((first_ask - final_ask)::numeric / first_ask) avg_cut,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY sold_price::numeric / final_ask) ratio,
           avg((sold_price > final_ask)::int) above
      FROM h WHERE first_ask IS NOT NULL AND first_ask >= final_ask
     GROUP BY 1`);

  const round = await db.query(`
    SELECT CASE WHEN asking_price % 50000 = 0 THEN 'round' ELSE 'under' END band, count(*) n,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY sold_price::numeric / asking_price) ratio,
           avg((sold_price > asking_price)::int) above
      FROM sales
     WHERE sold_date >= DATE '2024-01-01' AND asking_price BETWEEN 200000 AND 1500000
       AND (asking_price % 50000 = 0 OR asking_price % 50000 BETWEEN 45000 AND 49999)
     GROUP BY 1`);

  const timeline = await db.query(`
    SELECT count(*) n,
           percentile_cont(0.25) WITHIN GROUP (ORDER BY d) p25,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY d) p50,
           percentile_cont(0.75) WITHIN GROUP (ORDER BY d) p75
      FROM (SELECT s.sold_date - l.first_seen d
              FROM sales s JOIN listings l ON l.source = s.listing_source AND l.source_id = s.listing_id
             WHERE l.first_seen > DATE '2023-06-01' AND s.sold_date - l.first_seen BETWEEN 14 AND 730) t`);

  const r = repeat.rows[0];
  const cut = cuts.rows.find((x) => x.cut === true);
  const same = cuts.rows.find((x) => x.cut === false);
  const under = round.rows.find((x) => x.band === 'under');
  const roundRow = round.rows.find((x) => x.band === 'round');
  const t = timeline.rows[0];
  if (!r || !cut || !same || !under || !roundRow || !t) return null;

  return {
    repeat: {
      matched: num(r.matched),
      withEarlier: num(r.with_earlier),
      medianGainPct: (num(r.gain) - 1) * 100,
      medianYears: num(r.years),
      homesSoldTwice: num(r.twice),
    },
    cuts: {
      cutCount: num(cut.n),
      averageCutPct: num(cut.avg_cut) * 100,
      cutMedianOverAskingPct: (num(cut.ratio) - 1) * 100,
      cutShareAbove: num(cut.above),
      unchangedCount: num(same.n),
      unchangedMedianOverAskingPct: (num(same.ratio) - 1) * 100,
      unchangedShareAbove: num(same.above),
    },
    roundPricing: {
      underCount: num(under.n),
      underMedianOverAskingPct: (num(under.ratio) - 1) * 100,
      underShareAbove: num(under.above),
      roundCount: num(roundRow.n),
      roundMedianOverAskingPct: (num(roundRow.ratio) - 1) * 100,
      roundShareAbove: num(roundRow.above),
    },
    timeline: { count: num(t.n), p25: Math.round(num(t.p25)), median: Math.round(num(t.p50)), p75: Math.round(num(t.p75)) },
  };
}

export async function getMarketInsights(): Promise<MarketInsights | null> {
  if (cached && Date.now() - cached.at < SIX_HOURS) return cached.value;
  try {
    cached = { at: Date.now(), value: await loadMarketInsights() };
  } catch (error) {
    console.error('Market insights failed:', error);
    cached = { at: Date.now(), value: cached?.value ?? null };
  }
  return cached.value;
}

/** Where an asking price sits against the €50,000 steps buyers search in. */
export function roundBand(asking: number): 'round' | 'under' | 'other' {
  const r = asking % 50_000;
  if (r === 0) return 'round';
  if (r >= 45_000) return 'under';
  return 'other';
}

export interface RegisterEntry {
  date: string;
  address: string;
  price: number;
}

/** "BUTTERFIELD AVE" from "3 BUTTERFIELD AVE" or "APT 4 RATH GAEL" */
function streetOf(key: string): string | null {
  const street = key.replace(/^(?:APT|UNIT|FLAT|NO)\s+/, '').replace(/^\d+[A-Z]?\s+/, '');
  return street && street !== key.replace(/^(?:APT|UNIT|FLAT|NO)\s+/, '') ? street : null;
}

/**
 * The register's sales of this home, and of every home on its street, since
 * 2010. Needs the address given at checkout; null without a database. An
 * address with no house number ("Rialto Cottages, Dublin 8") gives the
 * street's sales only.
 */
export async function homeAndStreetHistory(
  address: string
): Promise<{ home: RegisterEntry[]; street: RegisterEntry[]; streetName: string; specific: boolean } | null> {
  const db = getPool();
  if (!db) return null;
  const key = addressKey(address);
  const street = key.specific ? streetOf(key.key) : key.key.trim() || null;
  if (!street || street.split(' ').length < 2) return null;

  const { rows } = await db.query<{ date: string; address: string; price: number; address_key: string; district: string | null }>(
    `SELECT sold_date::text date, address, price, address_key, district FROM register_sales
      WHERE regexp_replace(address_key, '^(APT|UNIT|FLAT|NO) ', '') ~ ('^[0-9]+[A-Z]? ' || $1 || '$')
        -- Part-shares and other non-market transfers, as the price model leaves out
        AND price >= 50000 AND county = 'Dublin'
        AND ($2::text IS NULL OR district = $2 OR district IS NULL)
      ORDER BY sold_date DESC LIMIT 400`,
    [street.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), key.district]
  );
  const here = rows.filter((r) => (key.district ? r.district === key.district : sameArea(r.address, address)));
  const own = key.key.replace(/^(?:APT|UNIT|FLAT|NO)\s+/, '');
  return {
    streetName: street,
    specific: key.specific,
    home: key.specific
      ? here
          .filter((r) => r.address_key.replace(/^(?:APT|UNIT|FLAT|NO)\s+/, '') === own)
          .map(({ date, address: a, price }) => ({ date, address: a, price }))
      : [],
    street: here.map(({ date, address: a, price }) => ({ date, address: a, price })),
  };
}

/**
 * When each comparable sale had last sold before, from the register (keyed
 * "address|soldDate"). Homes with no earlier sale are left out.
 */
export async function earlierSales(
  sales: Array<{ address: string; soldDate: string }>
): Promise<Record<string, { date: string; price: number }>> {
  const db = getPool();
  if (!db || !sales.length) return {};
  const keyed = sales.map((s) => ({ ...s, key: addressKey(s.address) })).filter((s) => s.key.specific);
  if (!keyed.length) return {};
  const { rows } = await db.query<{ address_key: string; district: string | null; date: string; price: number }>(
    `SELECT address_key, district, sold_date::text date, price FROM register_sales WHERE address_key = ANY($1) AND county = 'Dublin'`,
    [[...new Set(keyed.map((s) => s.key.key))]]
  );
  const out: Record<string, { date: string; price: number }> = {};
  for (const s of keyed) {
    const before = new Date(Date.parse(s.soldDate) - 180 * 86_400_000).toISOString().slice(0, 10);
    const match = rows
      .filter((r) => r.address_key === s.key.key && (!s.key.district || !r.district || r.district === s.key.district) && r.date < before)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (match) out[`${s.address}|${s.soldDate}`] = { date: match.date, price: match.price };
  }
  return out;
}

/** The home's own listing, if we have it, and whether its asking price was cut. */
export async function listingCut(address: string): Promise<{ first: number; latest: number; since: string } | null> {
  const db = getPool();
  if (!db) return null;
  const key = addressKey(address);
  if (!key.specific) return null;
  const { rows } = await db.query<{ source: string; source_id: string; district: string | null }>(
    `SELECT source, source_id, district FROM listings
      WHERE regexp_replace(address_key, '^(APT|UNIT|FLAT|NO) ', '') = $1 AND last_seen >= CURRENT_DATE - 120
      ORDER BY last_seen DESC LIMIT 5`,
    [key.key.replace(/^(?:APT|UNIT|FLAT|NO)\s+/, '')]
  );
  const listing = rows.find((r) => !key.district || !r.district || r.district === key.district);
  if (!listing) return null;
  const prices = await db.query<{ price: number; seen_on: string }>(
    `SELECT price, seen_on::text FROM listing_prices WHERE source = $1 AND source_id = $2 ORDER BY seen_on`,
    [listing.source, listing.source_id]
  );
  const list = prices.rows;
  if (list.length < 2 || list[0].price <= list[list.length - 1].price) return null;
  return { first: list[0].price, latest: list[list.length - 1].price, since: list[0].seen_on };
}
