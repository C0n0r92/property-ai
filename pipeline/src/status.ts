/** Print what the database holds and how the last runs went. */
import { pool } from './db.ts';

const one = async (sql: string) => (await pool.query(sql)).rows[0];
console.log('sales          ', await one("SELECT count(*)::int AS rows, max(sold_date)::text AS newest, count(*) FILTER (WHERE source = 'matched')::int AS matched FROM sales"));
console.log('register_sales ', await one('SELECT count(*)::int AS rows, min(sold_date)::text AS oldest, max(sold_date)::text AS newest FROM register_sales'));
console.log('listings       ', await one("SELECT count(*)::int AS rows, count(*) FILTER (WHERE source = 'myhome')::int AS myhome, max(last_seen)::text AS last_seen FROM listings"));
const runs = await pool.query("SELECT job, to_char(started_at, 'YYYY-MM-DD HH24:MI') AS started, ok, COALESCE(error, stats::text) AS result FROM ingest_runs ORDER BY id DESC LIMIT 8");
console.table(runs.rows.map((r) => ({ ...r, result: String(r.result).slice(0, 110) })));
await pool.end();
