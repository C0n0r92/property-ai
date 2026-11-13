import { Pool } from 'pg';

let pool: Pool | null | undefined;

/** One shared connection pool, created on first use from DATABASE_URL. */
export function getPool(): Pool | null {
  if (pool !== undefined) return pool;
  const connectionString = process.env.DATABASE_URL;
  pool = connectionString
    ? new Pool({
        connectionString,
        max: 5,
        // Managed Postgres requires TLS; DATABASE_SSL=disable is for local development
        ssl: process.env.DATABASE_SSL === 'disable' ? false : { rejectUnauthorized: false },
      })
    : null;
  return pool;
}
