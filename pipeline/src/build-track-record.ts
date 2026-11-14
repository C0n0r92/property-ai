/**
 * The track record, worked out here once a day rather than by the web
 * server (dashboard/src/lib/real-price/track-record.ts has the method).
 *
 *   npx tsx src/build-track-record.ts
 */
import { cleanSale, type RawSale, type Sale } from '../../dashboard/src/lib/real-price/model.ts';
import { computeTrackRecord, TRACK_EVERY } from '../../dashboard/src/lib/real-price/track-record.ts';
import { pool, runJob } from './db.ts';

export async function buildTrackRecord(): Promise<Record<string, unknown>> {
  const { rows } = await pool.query<RawSale>(
    `SELECT address, sold_date::text AS "soldDate", sold_price AS "soldPrice", asking_price AS "askingPrice",
            beds, property_type AS "propertyType", dublin_postcode AS "dublinPostcode", sqm AS "areaSqm", lat, lng
       FROM sales`
  );
  const now = Date.now();
  const sales = rows.map((r) => cleanSale(r, now)).filter((s): s is Sale => s !== null);
  const asOf = sales.reduce((max, s) => Math.max(max, s.t), 0);
  const record = computeTrackRecord(sales, asOf, 12, TRACK_EVERY);
  await pool.query(
    `INSERT INTO track_records (id, record, computed_at) VALUES (1, $1, NOW())
     ON CONFLICT (id) DO UPDATE SET record = EXCLUDED.record, computed_at = NOW()`,
    [JSON.stringify(record)]
  );
  return { sales: sales.length, tested: record.overall.tested, insideRangePct: Math.round(record.overall.insideRangePct) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runJob('build-track-record', () => buildTrackRecord());
  await pool.end();
}
