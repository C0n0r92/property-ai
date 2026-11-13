/**
 * Load Dublin sales from the Property Price Register (open data published by
 * the Property Services Regulatory Authority) into register_sales.
 *
 * Usage: npm run ingest:register            # last year and this year
 *        npm run ingest:register -- --all   # every year since 2010
 */
import { createHash } from 'node:crypto';
import { addressKey } from '../../dashboard/src/lib/real-price/address.ts';
import { bulkInsert, pool, runJob } from './db.ts';

const BASE = 'https://www.propertypriceregister.ie/website/npsra/ppr/npsra-ppr.nsf/Downloads';
const thisYear = new Date().getFullYear();
const years = process.argv.includes('--all')
  ? Array.from({ length: thisYear - 2009 }, (_, i) => 2010 + i)
  : [thisYear - 1, thisYear];

const titleCase = (text: string) =>
  text
    .toLowerCase()
    .replace(/(^|[\s,.'-])([a-z])/g, (_, lead, letter) => lead + letter.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();

export async function ingestRegister(yearList: number[]) {
  const stats: Record<string, unknown> = {};
  for (const year of yearList) {
    const file = `PPR-${year}-Dublin.csv`;
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
      const id = createHash('sha1').update(`${soldDate}|${cells[1]}|${price}`).digest('hex').slice(0, 20);
      if (ids.has(id)) continue;
      ids.add(id);
      const { key, district } = addressKey(cells[1]);
      rows.push({
        id,
        sold_date: soldDate,
        address: titleCase(cells[1]),
        address_key: key,
        district,
        eircode: cells[3].replace(/\s/g, '').toUpperCase() || null,
        price,
        // New homes are listed VAT-exclusive, so their price is not comparable
        new_build: cells[6] === 'Yes' || /^new/i.test(cells[7]),
      });
    }
    const written = await bulkInsert(
      'register_sales',
      {
        id: 'text', sold_date: 'date', address: 'text', address_key: 'text', district: 'text',
        eircode: 'text', price: 'integer', new_build: 'boolean',
      },
      rows,
      'ON CONFLICT (id) DO NOTHING'
    );
    stats[year] = { read: rows.length, new: written };
  }
  return stats;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runJob('ingest-register', () => ingestRegister(years));
  await pool.end();
}
