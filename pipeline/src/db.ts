import pg from 'pg';
import { pgConfig } from './pg-config.ts';

const LOCAL = 'postgres://gaff:gaff@localhost:55432/gaff';
const url = process.env.DATABASE_URL ?? LOCAL;

// TLS settings come from pgConfig (see there for why not from the URL)
export const pool = new pg.Pool({ ...pgConfig(url), max: 4 });

/**
 * Insert many rows in chunks. `columns` maps column name to Postgres type;
 * `conflict` is the full ON CONFLICT clause.
 */
export async function bulkInsert(
  table: string,
  columns: Record<string, string>,
  rows: Array<Record<string, unknown>>,
  conflict: string
): Promise<number> {
  const names = Object.keys(columns);
  const shape = names.map((n) => `"${n}" ${columns[n]}`).join(', ');
  let written = 0;
  for (let i = 0; i < rows.length; i += 2000) {
    const chunk = rows.slice(i, i + 2000);
    const result = await pool.query(
      `INSERT INTO ${table} (${names.join(', ')})
       SELECT ${names.join(', ')} FROM json_to_recordset($1::json) AS t(${shape})
       ${conflict}`,
      [JSON.stringify(chunk)]
    );
    written += result.rowCount ?? 0;
  }
  return written;
}

/** Run a named job, recording its outcome in ingest_runs. */
export async function runJob(job: string, work: () => Promise<Record<string, unknown>>): Promise<void> {
  const { rows } = await pool.query('INSERT INTO ingest_runs (job) VALUES ($1) RETURNING id', [job]);
  const id = rows[0].id;
  try {
    const stats = await work();
    await pool.query('UPDATE ingest_runs SET finished_at = NOW(), ok = TRUE, stats = $2 WHERE id = $1', [id, stats]);
    console.log(`${job}: ok`, JSON.stringify(stats));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await pool.query('UPDATE ingest_runs SET finished_at = NOW(), ok = FALSE, error = $2 WHERE id = $1', [id, message]);
    console.error(`${job}: failed:`, message);
    process.exitCode = 1;
  }
}

export const today = () => new Date().toISOString().slice(0, 10);
