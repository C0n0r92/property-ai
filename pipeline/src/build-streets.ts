/**
 * Tag every register sale with its street, then rebuild the `streets` table:
 * one row per street with enough market sales for a page of its own.
 *
 *   npm run build-streets
 */
import { assignStreets, isBulkSale, streetSlug } from '../../dashboard/src/lib/real-price/streets.ts';
import { pool, runJob } from './db.ts';

/** A street needs this many market sales since 2010 for a page. */
export const MIN_STREET_SALES = 10;
/** Non-market transfers (part shares and the like) are left out, as in the price model. */
const MARKET_PRICE = 50_000;
const THREE_YEARS_MS = 3 * 365.25 * 86_400_000;

const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

type Published = Record<string, unknown>;

/** One county: tag its sales with their streets and return its streets with enough sales. */
async function streetsForCounty(county: string) {
  const { rows } = await pool.query<{ id: string; address: string; price: number; date: string; street_slug: string | null }>(
    // A fixed order: ties in the street votes then fall the same way every run
    'SELECT id, address, price, sold_date::text AS date, street_slug FROM register_sales WHERE county = $1 ORDER BY id',
    [county]
  );
  const assigned = assignStreets(rows.map((r) => r.address), county);

  // 1. Tag sales whose street changed (all of them the first time)
  const changed: Array<{ id: string; slug: string | null }> = [];
  rows.forEach((r, i) => {
    const slug = assigned[i]?.slug ?? null;
    if (slug !== r.street_slug) changed.push({ id: r.id, slug });
  });
  for (let i = 0; i < changed.length; i += 5000) {
    const chunk = changed.slice(i, i + 5000);
    await pool.query(
      `UPDATE register_sales r SET street_slug = v.slug
         FROM (SELECT unnest($1::text[]) AS id, unnest($2::text[]) AS slug) v
        WHERE r.id = v.id`,
      [chunk.map((c) => c.id), chunk.map((c) => c.slug)]
    );
  }

  // 2. One row per street with enough market sales
  const cutoff = Date.now() - THREE_YEARS_MS;
  const streets = new Map<
    string,
    { streetKey: string; areaKey: string; areaLabel: string; names: Map<string, number>; dates: string[]; recent: number[] }
  >();
  // Each street's median, to leave out blocks of homes sold in one transaction
  const pricesBySlug = new Map<string, number[]>();
  rows.forEach((r, i) => {
    const a = assigned[i];
    if (a && r.price >= MARKET_PRICE) pricesBySlug.set(a.slug, [...(pricesBySlug.get(a.slug) ?? []), r.price]);
  });
  const medians = new Map([...pricesBySlug].map(([slug, prices]) => [slug, median(prices)]));

  rows.forEach((r, i) => {
    const a = assigned[i];
    if (!a || r.price < MARKET_PRICE || isBulkSale(r.address, r.price, medians.get(a.slug) ?? 0)) return;
    const s = streets.get(a.slug) ?? {
      streetKey: a.streetKey,
      areaKey: a.areaKey,
      areaLabel: a.areaLabel,
      names: new Map<string, number>(),
      dates: [],
      recent: [],
    };
    s.names.set(a.name, (s.names.get(a.name) ?? 0) + 1);
    s.dates.push(r.date);
    if (new Date(r.date).getTime() >= cutoff) s.recent.push(r.price);
    streets.set(a.slug, s);
  });

  const published: Published[] = [...streets.entries()]
    .filter(([, s]) => s.dates.length >= MIN_STREET_SALES)
    .map(([slug, s]) => {
      // The most common spelling; on a tie the fuller one ("Avenue" over "Ave")
      const name = [...s.names.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0][0];
      const dates = s.dates.sort();
      // A split estate name ("The Avenue" in Ridgewood, Swords) is labelled with its estate; the area is the rest
      const split = slug !== streetSlug(s.streetKey, s.areaKey);
      return {
        slug,
        name,
        street_key: s.streetKey,
        area_key: s.areaKey,
        area_label: s.areaLabel,
        area_name: split ? s.areaLabel.slice(s.areaLabel.indexOf(', ') + 2) : s.areaLabel,
        county,
        sales: dates.length,
        first_sale: dates[0],
        last_sale: dates[dates.length - 1],
        median_recent: s.recent.length >= 3 ? median(s.recent) : null,
        recent_sales: s.recent.length,
      };
    });
  return { published, sales: rows.length, tagged: assigned.filter(Boolean).length, retagged: changed.length, streets: streets.size };
}

export async function buildStreets(): Promise<Record<string, unknown>> {
  const counties = (await pool.query<{ county: string }>('SELECT DISTINCT county FROM register_sales ORDER BY county')).rows.map(
    (r) => r.county
  );
  const published: Published[] = [];
  const totals = { sales: 0, tagged: 0, retagged: 0, streets: 0 };
  for (const county of counties) {
    const result = await streetsForCounty(county);
    published.push(...result.published);
    totals.sales += result.sales;
    totals.tagged += result.tagged;
    totals.retagged += result.retagged;
    totals.streets += result.streets;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM streets');
    for (let i = 0; i < published.length; i += 2000) {
      await client.query(
        `INSERT INTO streets (slug, name, street_key, area_key, area_label, area_name, county, sales, first_sale, last_sale,
                              median_recent, recent_sales)
         SELECT slug, name, street_key, area_key, area_label, area_name, county, sales, first_sale, last_sale, median_recent,
                recent_sales
           FROM json_to_recordset($1::json) AS t(slug text, name text, street_key text, area_key text, area_label text,
                area_name text, county text, sales int, first_sale date, last_sale date, median_recent int, recent_sales int)
         -- A slug can't repeat across counties (outside Dublin it carries the county), but never fail on one
         ON CONFLICT (slug) DO NOTHING`,
        [JSON.stringify(published.slice(i, i + 2000))]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return { ...totals, counties: counties.length, published: published.length };
}

// Run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await runJob('build-streets', () => buildStreets());
  await pool.end();
}
