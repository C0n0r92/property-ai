/**
 * Load sales from the Property Price Register (open data published by the
 * Property Services Regulatory Authority) into register_sales, one file per
 * county and year.
 *
 * Usage: npm run ingest:register                    # last year and this year, every county
 *        npm run ingest:register -- --all           # every year since 2010, every county
 *        npm run ingest:register -- --backfill 8    # earlier years for counties not yet
 *                                                   # loaded, for up to 8 minutes
 */
import { createHash } from 'node:crypto';
import { addressKey } from '../../dashboard/src/lib/real-price/address.ts';
import { bulkInsert, pool, runJob } from './db.ts';

const BASE = 'https://www.propertypriceregister.ie/website/npsra/ppr/npsra-ppr.nsf/Downloads';
const thisYear = new Date().getFullYear();
const ALL_YEARS = Array.from({ length: thisYear - 2009 }, (_, i) => 2010 + i);
const years = process.argv.includes('--all') ? ALL_YEARS : [thisYear - 1, thisYear];

/** The register's county names, as in its file names. Dublin first. */
export const COUNTIES = [
  'Dublin', 'Kildare', 'Meath', 'Wicklow', 'Louth', 'Cork', 'Galway', 'Limerick', 'Waterford', 'Wexford',
  'Kilkenny', 'Carlow', 'Laois', 'Offaly', 'Westmeath', 'Longford', 'Cavan', 'Monaghan', 'Donegal', 'Sligo',
  'Leitrim', 'Roscommon', 'Mayo', 'Clare', 'Tipperary', 'Kerry',
];

const titleCase = (text: string) =>
  text
    .toLowerCase()
    .replace(/(^|[\s,.'-])([a-z])/g, (_, lead, letter) => lead + letter.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();

export async function ingestRegister(yearList: number[], counties: string[] = COUNTIES) {
  const stats: Record<string, unknown> = {};
  for (const county of counties) {
    for (const year of yearList) {
      stats[`${county} ${year}`] = await ingestFile(county, year);
    }
  }
  return stats;
}

/**
 * Earlier years for counties that have only recent sales (or none), a county
 * at a time, until the time is up; the next run carries on.
 */
export async function backfillRegister(minutes: number) {
  const until = Date.now() + minutes * 60_000;
  const { rows } = await pool.query<{ county: string; oldest: string }>(
    'SELECT county, MIN(sold_date)::text AS oldest FROM register_sales GROUP BY county'
  );
  const oldest = new Map(rows.map((r) => [r.county, Number(r.oldest.slice(0, 4))]));
  const stats: Record<string, unknown> = {};
  for (const county of COUNTIES) {
    const from = oldest.get(county);
    if (from !== undefined && from <= 2010) continue;
    for (const year of ALL_YEARS.filter((y) => from === undefined || y < from).reverse()) {
      if (Date.now() > until) return { ...stats, stopped: 'time up; the next run continues' };
      stats[`${county} ${year}`] = await ingestFile(county, year);
    }
  }
  return stats;
}

async function ingestFile(county: string, year: number) {
  const file = `PPR-${year}-${county}.csv`;
  const response = await fetch(`${BASE}/${file}/$FILE/${file}`);
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  const text = new TextDecoder('latin1').decode(await response.arrayBuffer());

  const rows = [];
  const ids = new Set<string>();
  for (const line of text.split(/\r?\n/).slice(1)) {
    const cells = [...line.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
    if (cells.length < 8) continue;
    const [day, month, yyyy] = cells[0].split('/');
    const price = Math.round(parseFloat(cells[4].replace(/[^0-9.]/g, '')));
    // "Not Full Market Price" sales (transfers, part shares) would mislead buyers
    if (!yyyy || !Number.isFinite(price) || cells[5] === 'Yes') continue;
    const soldDate = `${yyyy}-${month}-${day}`;
    // Dublin's ids stay as they were; other counties' include the county, as addresses repeat across counties
    const idSource = county === 'Dublin' ? `${soldDate}|${cells[1]}|${price}` : `${county}|${soldDate}|${cells[1]}|${price}`;
    const id = createHash('sha1').update(idSource).digest('hex').slice(0, 20);
    if (ids.has(id)) continue;
    ids.add(id);
    const parsed = addressKey(cells[1]);
    const key = parsed.key;
    const district = county === 'Dublin' ? parsed.district : null;
    rows.push({
      id,
      sold_date: soldDate,
      address: titleCase(cells[1]),
      address_key: key,
      district,
      eircode: cells[3].replace(/\s/g, '').toUpperCase() || null,
      price,
      county,
      // New homes are listed VAT-exclusive, so their price is not comparable
      new_build: cells[6] === 'Yes' || /^new/i.test(cells[7]),
    });
  }
  const written = await bulkInsert(
    'register_sales',
    {
      id: 'text', sold_date: 'date', address: 'text', address_key: 'text', district: 'text',
      eircode: 'text', price: 'integer', county: 'text', new_build: 'boolean',
    },
    rows,
    'ON CONFLICT (id) DO NOTHING'
  );
  return { read: rows.length, new: written };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const backfill = process.argv.indexOf('--backfill');
  if (backfill >= 0) await runJob('backfill-register', () => backfillRegister(Number(process.argv[backfill + 1] ?? 8)));
  else await runJob('ingest-register', () => ingestRegister(years));
  await pool.end();
}
