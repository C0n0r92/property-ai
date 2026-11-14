/**
 * One identity per home across every dataset (see dashboard/src/lib/real-price/homes.ts).
 *
 * 1. Tag register sales, listings, planning applications and our sales with
 *    a home_id, a county at a time. Dublin's register, listings and sales are
 *    resolved together so they agree; planning on its own (memory).
 * 2. Reconcile in SQL (the rules of homes.ts reconcileHomes): the same
 *    Eircode is the same home, and a house and street that is exactly one
 *    home on the register takes the other sources' records of it.
 * 3. Rebuild the homes table from everything tagged.
 *
 *   npm run build-homes
 */
import { homeIdentities, type HomeRecord } from '../../dashboard/src/lib/real-price/homes.ts';
import { pool, runJob } from './db.ts';

type Table = 'register_sales' | 'listings' | 'planning_applications' | 'sales';

interface Rec extends HomeRecord {
  table: Table;
  /** Primary key; listings use source|source_id */
  id: string;
  current: string | null;
}

async function tag(table: Table, recs: Array<{ id: string; homeId: string | null }>) {
  const where = table === 'listings' ? "(t.source || '|' || t.source_id) = v.id" : 't.id = v.id';
  await pool.query(
    `UPDATE ${table} t SET home_id = v.home_id
       FROM (SELECT unnest($1::text[]) AS id, unnest($2::text[]) AS home_id) v
      WHERE ${where}`,
    [recs.map((r) => r.id), recs.map((r) => r.homeId)]
  );
}

const load = async (sql: string, table: Table, params: unknown[] = []): Promise<Rec[]> =>
  (await pool.query<{ id: string; address: string; district: string | null; home_id: string | null }>(sql, params)).rows.map((r) => ({
    table,
    id: r.id,
    address: r.address,
    district: r.district,
    current: r.home_id,
  }));

/** Tag one batch of records, sending updates in chunks so they never pile up. */
async function tagBatch(recs: Rec[], county: string, changed: Record<string, number>) {
  const ids = homeIdentities(recs, county);
  const pending: Partial<Record<Table, Array<{ id: string; homeId: string | null }>>> = {};
  let identified = 0;
  for (let i = 0; i < recs.length; i++) {
    const r = recs[i];
    const homeId = ids[i]?.homeId ?? null;
    if (homeId) identified++;
    if (homeId === r.current) continue;
    const list = (pending[r.table] ??= []);
    list.push({ id: r.id, homeId });
    if (list.length >= 5000) {
      await tag(r.table, list);
      changed[r.table] += list.length;
      pending[r.table] = [];
    }
  }
  for (const [table, list] of Object.entries(pending)) {
    if (!list?.length) continue;
    await tag(table as Table, list);
    changed[table] += list.length;
  }
  return identified;
}

/** The reconciliation rules, in SQL. Returns how many records moved home. */
async function reconcile(): Promise<number> {
  let moved = 0;
  // 1. Listings with the Eircode of a register sale belong to that sale's home
  moved +=
    (
      await pool.query(
        `UPDATE listings l SET home_id = r.home_id
           FROM register_sales r
          WHERE l.eircode IS NOT NULL AND r.eircode IS NOT NULL AND r.home_id IS NOT NULL
            AND upper(replace(l.eircode, ' ', '')) = upper(replace(r.eircode, ' ', ''))
            AND r.county = 'Dublin' AND l.home_id IS DISTINCT FROM r.home_id`
      )
    ).rowCount ?? 0;
  // 2. A house and street that is one home on the county's register
  for (const table of ['listings', 'planning_applications', 'sales'] as const) {
    moved +=
      (
        await pool.query(
          `WITH single AS (
             SELECT county, split_part(home_id, '|', 3) AS key, min(home_id) AS home_id
               FROM register_sales WHERE home_id IS NOT NULL
              GROUP BY county, split_part(home_id, '|', 3)
             HAVING count(DISTINCT home_id) = 1
           )
           UPDATE ${table} t SET home_id = s.home_id
             FROM single s
            WHERE t.home_id IS NOT NULL
              AND split_part(t.home_id, '|', 1) = s.county
              AND split_part(t.home_id, '|', 3) = s.key
              AND t.home_id <> s.home_id
              AND NOT EXISTS (SELECT 1 FROM register_sales r WHERE r.home_id = t.home_id)`
        )
      ).rowCount ?? 0;
  }
  // Matched sales follow their register sale
  moved +=
    (
      await pool.query(
        `UPDATE sales s SET home_id = r.home_id FROM register_sales r
          WHERE s.register_id = r.id AND s.home_id IS DISTINCT FROM r.home_id`
      )
    ).rowCount ?? 0;
  return moved;
}

/** Rebuild the homes table from every tagged record. */
async function rebuildHomes(): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM homes');
    const { rowCount } = await client.query(
      `INSERT INTO homes (home_id, county, area_key, address_key, address, street_slug, sales, listings, planning, last_sold, last_price)
       SELECT home_id,
              split_part(home_id, '|', 1),
              split_part(home_id, '|', 2),
              split_part(home_id, '|', 3),
              -- the newest way a sale or listing wrote it, else any
              coalesce((array_agg(address ORDER BY d DESC NULLS LAST) FILTER (WHERE t IN ('r', 'l')))[1], min(address)),
              (array_agg(street_slug ORDER BY t) FILTER (WHERE street_slug IS NOT NULL))[1],
              count(*) FILTER (WHERE t = 'r'),
              count(*) FILTER (WHERE t = 'l'),
              count(*) FILTER (WHERE t = 'p'),
              max(d) FILTER (WHERE t = 'r'),
              (array_agg(price ORDER BY d DESC) FILTER (WHERE t = 'r'))[1]
         FROM (
           SELECT home_id, address, sold_date AS d, price, 'r' AS t, street_slug FROM register_sales WHERE home_id IS NOT NULL
           UNION ALL SELECT home_id, address, last_seen::date, NULL, 'l', NULL FROM listings WHERE home_id IS NOT NULL
           UNION ALL SELECT home_id, address, NULL, NULL, 'p', street_slug FROM planning_applications WHERE home_id IS NOT NULL
         ) everything
        GROUP BY home_id`
    );
    // Web addresses: house and street, area, and a short hash of the id so two homes never share one
    await client.query(
      `UPDATE homes SET slug = trim(both '-' from lower(regexp_replace(
         address_key || ' ' ||
         CASE WHEN area_key ~ '^d[0-9]' THEN 'dublin ' || substr(area_key, 2)
              WHEN area_key LIKE 'county:%' THEN 'co ' || split_part(area_key, ':', 2)
              ELSE area_key END,
         '[^A-Za-z0-9]+', '-', 'g'))) || '-' || substr(md5(home_id), 1, 5)`
    );
    await client.query('COMMIT');
    return rowCount ?? 0;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function buildHomes(): Promise<Record<string, unknown>> {
  const counties = (await pool.query<{ county: string }>('SELECT DISTINCT county FROM register_sales ORDER BY county')).rows.map(
    (r) => r.county
  );
  const changed: Record<string, number> = { register_sales: 0, listings: 0, planning_applications: 0, sales: 0 };
  let records = 0;
  let identified = 0;
  for (const county of counties) {
    const batch = await load(
      'SELECT id, address, district, home_id FROM register_sales WHERE county = $1 ORDER BY id',
      'register_sales',
      [county]
    );
    if (county === 'Dublin') {
      batch.push(
        ...(await load(
          "SELECT source || '|' || source_id AS id, address, district, home_id FROM listings ORDER BY 1",
          'listings'
        )),
        ...(await load(
          "SELECT id, address, CASE WHEN dublin_postcode ~* '^d?[0-9]' THEN 'd' || lower(regexp_replace(dublin_postcode, '^[dD]', '')) END AS district, home_id FROM sales ORDER BY id",
          'sales'
        ))
      );
    }
    records += batch.length;
    identified += await tagBatch(batch, county, changed);
    if (county === 'Dublin') {
      const planning = await load('SELECT id, address, district, home_id FROM planning_applications ORDER BY id', 'planning_applications');
      records += planning.length;
      identified += await tagBatch(planning, county, changed);
    }
  }
  const reconciled = await reconcile();
  const homes = await rebuildHomes();
  return { records, identified, reconciled, homes, changed };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runJob('build-homes', () => buildHomes());
  await pool.end();
}
