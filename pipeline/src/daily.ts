/**
 * The daily run, in dependency order. Each step is recorded in ingest_runs;
 * one failing does not stop the next.
 *
 *  1. Fresh data: the register (every county), its backfill, listings, planning.
 *  2. Streets, then homes: one identity per home across every dataset.
 *  3. Pairing (by home), then the worth indexes.
 */
import { pool, runJob } from './db.ts';
import { ingestListings } from './ingest-listings.ts';
import { backfillRegister, ingestRegister } from './ingest-register.ts';
import { matchSales } from './match.ts';
import { buildStreets } from './build-streets.ts';
import { ingestPlanning } from './ingest-planning.ts';
import { buildHomes } from './build-homes.ts';
import { buildWorth } from './build-worth.ts';
import { buildTrackRecord } from './build-track-record.ts';

const year = new Date().getFullYear();
await runJob('ingest-register', () => ingestRegister([year - 1, year]));
// Earlier years for counties added since; a slice a day until every county reaches 2010
await runJob('backfill-register', () => backfillRegister(20));
await runJob('ingest-listings', () => ingestListings());
await runJob('build-streets', () => buildStreets());
// After the streets, so applications take the register's street for the same home
await runJob('ingest-planning', () => ingestPlanning());
// Every record gets its home; then sales and listings pair up by home
await runJob('build-homes', () => buildHomes());
await runJob('match', () => matchSales());
// The track record from the day's pairs, so the web server never has to work it out
await runJob('build-track-record', () => buildTrackRecord());
await runJob('build-worth', () => buildWorth());
await pool.end();
