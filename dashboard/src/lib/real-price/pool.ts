import { Pool } from 'pg';
import { pgConfig } from './pg-config';

let pool: Pool | null | undefined;

/** One shared connection pool, created on first use from DATABASE_URL. */
export function getPool(): Pool | null {
  if (pool !== undefined) return pool;
  const connectionString = process.env.DATABASE_URL;
  // TLS settings come from pgConfig (see there for why not from the URL)
  pool = connectionString ? new Pool({ ...pgConfig(connectionString), max: 5 }) : null;
  return pool;
}
