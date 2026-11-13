/**
 * One-off: load the existing data.json (sales and listings collected up to
 * early 2026) into the database. Safe to re-run: existing rows are kept.
 *
 * Usage: npm run import:legacy [path/to/data.json]
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { addressKey } from '../../dashboard/src/lib/real-price/address.ts';
import { bulkInsert, pool, runJob } from './db.ts';

const file = process.argv[2] ?? fileURLToPath(new URL('../../dashboard/public/data.json', import.meta.url));
const hash = (text: string) => createHash('sha1').update(text).digest('hex').slice(0, 20);
const int = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);
// Scraped room counts and floor areas include junk such as 202518 beds
const rooms = (v: unknown) => (typeof v === 'number' && v > 0 && v <= 20 ? Math.round(v) : null);
const area = (v: unknown) => (typeof v === 'number' && v >= 10 && v <= 2000 ? v : null);
const validDate = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const t = Date.parse(v);
  if (!Number.isFinite(t) || t < Date.parse('2010-01-01') || t > Date.now()) return null;
  return new Date(t).toISOString().slice(0, 10);
};

await runJob('import-legacy', async () => {
  const data = JSON.parse(readFileSync(file, 'utf-8'));

  const sales = [];
  for (const p of data.properties ?? []) {
    const soldDate = validDate(p.soldDate);
    if (!p.address || !soldDate || !(p.soldPrice > 0) || !(p.askingPrice > 0)) continue;
    sales.push({
      id: `daft:${p.id ?? hash(`${p.address}|${soldDate}|${p.soldPrice}`)}`,
      source: 'daft_legacy',
      address: p.address,
      eircode: p.eircode ? String(p.eircode).replace(/\s/g, '').toUpperCase() : null,
      property_type: p.propertyType || null,
      beds: rooms(p.beds),
      baths: rooms(p.baths),
      sqm: area(p.areaSqm),
      asking_price: int(p.askingPrice),
      sold_price: int(p.soldPrice),
      sold_date: soldDate,
      lat: p.latitude ?? null,
      lng: p.longitude ?? null,
      dublin_postcode: p.dublinPostcode ?? null,
    });
  }
  const salesWritten = await bulkInsert(
    'sales',
    {
      id: 'text', source: 'text', address: 'text', eircode: 'text', property_type: 'text',
      beds: 'smallint', baths: 'smallint', sqm: 'real', asking_price: 'integer', sold_price: 'integer',
      sold_date: 'date', lat: 'double precision', lng: 'double precision', dublin_postcode: 'text',
    },
    sales,
    'ON CONFLICT (id) DO NOTHING'
  );

  const listings = [];
  const prices = [];
  const seen = new Set<string>();
  for (const l of data.listings ?? []) {
    const first = validDate(l.firstSeenDate);
    const last = validDate(l.lastSeenDate) ?? first;
    if (!l.address || !first || !last || !(l.askingPrice > 0)) continue;
    const sourceId = String(l.sourceUrl?.match(/\/(\d+)$/)?.[1] ?? l.id ?? hash(l.address));
    if (seen.has(sourceId)) continue;
    seen.add(sourceId);
    const { key, district } = addressKey(l.address);
    listings.push({
      source: 'daft_legacy', source_id: sourceId, address: l.address, address_key: key, district,
      eircode: null, // legacy listing Eircodes came from geocoding and are unreliable
      property_type: l.propertyType || null, beds: rooms(l.beds), baths: rooms(l.baths),
      sqm: area(l.areaSqm),
      lat: l.latitude ?? null, lng: l.longitude ?? null, asking_price: int(l.askingPrice),
      sale_agreed: false, url: l.sourceUrl ?? null, first_seen: first, last_seen: last,
    });
    const byDay = new Map<string, number>();
    for (const h of l.priceHistory ?? []) {
      const day = validDate(h.date);
      if (day && h.price > 0) byDay.set(day, Math.round(h.price));
    }
    let previous: number | null = null;
    for (const [day, price] of [...byDay].sort()) {
      if (price !== previous) prices.push({ source: 'daft_legacy', source_id: sourceId, seen_on: day, price });
      previous = price;
    }
  }
  const listingsWritten = await bulkInsert(
    'listings',
    {
      source: 'text', source_id: 'text', address: 'text', address_key: 'text', district: 'text', eircode: 'text',
      property_type: 'text', beds: 'smallint', baths: 'smallint', sqm: 'real', lat: 'double precision',
      lng: 'double precision', asking_price: 'integer', sale_agreed: 'boolean', url: 'text',
      first_seen: 'date', last_seen: 'date',
    },
    listings,
    'ON CONFLICT (source, source_id) DO NOTHING'
  );
  const pricesWritten = await bulkInsert(
    'listing_prices',
    { source: 'text', source_id: 'text', seen_on: 'date', price: 'integer' },
    prices,
    'ON CONFLICT DO NOTHING'
  );

  return { salesRead: sales.length, salesWritten, listingsRead: listings.length, listingsWritten, pricesWritten };
});
await pool.end();
