/**
 * The daily run: refresh the register, collect listings, then pair them.
 * Each step is recorded in ingest_runs; one failing does not stop the next.
 */
import { pool, runJob } from './db.ts';
import { ingestListings } from './ingest-listings.ts';
import { ingestRegister } from './ingest-register.ts';
import { matchSales } from './match.ts';

const year = new Date().getFullYear();
await runJob('ingest-register', () => ingestRegister([year - 1, year]));
await runJob('ingest-listings', () => ingestListings());
await runJob('match', () => matchSales());
await pool.end();
