/**
 * Pair register sales (what a home sold for) with listings (what it asked),
 * and write each pair to `sales`, the table the pricing model reads.
 *
 * A pair needs: the same house and street, agreement on the area, a sale date
 * that fits the listing's time on the market, and a believable price ratio.
 */
import { addressKey, sameArea } from '../../dashboard/src/lib/real-price/address.ts';
import { bulkInsert, pool, runJob } from './db.ts';

const DAY = 86_400_000;

export async function matchSales(since = '2025-06-01') {
  const { rows } = await pool.query(
    `SELECT r.id AS register_id, r.sold_date::text, r.address AS register_address, r.price, r.district AS r_district,
            r.eircode AS register_eircode,
            l.source, l.source_id, l.address AS listing_address, l.asking_price, l.property_type, l.beds, l.baths,
            l.sqm, l.lat, l.lng, l.first_seen::text, l.last_seen::text, l.sale_agreed,
            COUNT(*) OVER (PARTITION BY l.address_key) AS key_rows,
            COUNT(*) OVER (PARTITION BY r.id) AS listings_for_sale
       FROM register_sales r
       JOIN listings l ON l.address_key = r.address_key
      WHERE r.sold_date >= $1 AND NOT r.new_build
        AND NOT EXISTS (SELECT 1 FROM sales s WHERE s.register_id = r.id)`,
    [since]
  );

  // Older records already hold some of these sales: do not add them twice
  const legacy = new Set(
    (await pool.query("SELECT address, sold_date::text FROM sales WHERE source = 'daft_legacy' AND sold_date >= $1", [since])).rows.map(
      (s) => `${addressKey(s.address).key}|${s.sold_date.slice(0, 7)}`
    )
  );

  const best = new Map<string, (typeof rows)[number]>();
  let rejected = 0;
  for (const row of rows) {
    const key = addressKey(row.register_address);
    const sold = Date.parse(row.sold_date);
    const ratio = row.price / row.asking_price;
    // A "sale agreed" listing stays on the site for months after the sale
    // closes, so its sale can pre-date the day we first saw it
    const lead = row.sale_agreed ? 240 : 14;
    // The two sources often name neighbouring areas for the same home
    // ("Saggart" and "Citywest"). When the house and street appear only once
    // on each side, that is accepted as the same home.
    const onlyCandidate = Number(row.key_rows) === 1 && Number(row.listings_for_sale) === 1;
    const ok =
      key.specific &&
      (sameArea(row.listing_address, row.register_address) || onlyCandidate) &&
      sold >= Date.parse(row.first_seen) - lead * DAY &&
      sold <= Date.parse(row.last_seen) + 400 * DAY &&
      ratio >= 0.6 &&
      ratio <= 1.8 &&
      !legacy.has(`${key.key}|${row.sold_date.slice(0, 7)}`);
    if (!ok) {
      rejected++;
      continue;
    }
    const current = best.get(row.register_id);
    if (!current || row.last_seen > current.last_seen) best.set(row.register_id, row);
  }

  // One listing can only have sold once: keep its earliest matching sale
  const byListing = new Map<string, (typeof rows)[number]>();
  for (const row of best.values()) {
    const id = `${row.source}:${row.source_id}`;
    const current = byListing.get(id);
    if (!current || row.sold_date < current.sold_date) byListing.set(id, row);
  }

  const pairs = [...byListing.values()].map((row) => ({
    id: `match:${row.register_id}`,
    source: 'matched',
    address: row.register_address,
    eircode: row.register_eircode,
    property_type: row.property_type,
    beds: row.beds,
    baths: row.baths,
    sqm: row.sqm,
    asking_price: row.asking_price,
    sold_price: row.price,
    sold_date: row.sold_date,
    lat: row.lat,
    lng: row.lng,
    dublin_postcode: row.r_district ? row.r_district.toUpperCase() : null,
    listing_source: row.source,
    listing_id: row.source_id,
    register_id: row.register_id,
  }));

  const written = await bulkInsert(
    'sales',
    {
      id: 'text', source: 'text', address: 'text', eircode: 'text', property_type: 'text', beds: 'smallint',
      baths: 'smallint', sqm: 'real', asking_price: 'integer', sold_price: 'integer', sold_date: 'date',
      lat: 'double precision', lng: 'double precision', dublin_postcode: 'text', listing_source: 'text',
      listing_id: 'text', register_id: 'text',
    },
    pairs,
    'ON CONFLICT DO NOTHING'
  );
  return { candidates: rows.length, rejected, pairs: pairs.length, newSales: written };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // --since YYYY-MM-DD widens the window, e.g. after importing older archived listings
  const since = process.argv.indexOf('--since');
  await runJob('match', () => matchSales(since > 0 ? process.argv[since + 1] : undefined));
  await pool.end();
}
