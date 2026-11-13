/**
 * Download recent Dublin sales from the Property Price Register (open data
 * published by the Property Services Regulatory Authority) and write a compact
 * file for the dashboard.
 *
 * Usage: node scripts/update-ppr.mjs
 * Output: dashboard/public/ppr-dublin.json
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = 'https://www.propertypriceregister.ie/website/npsra/ppr/npsra-ppr.nsf/Downloads';
const thisYear = new Date().getFullYear();
const years = [thisYear - 1, thisYear];

const titleCase = (text) =>
  text
    .toLowerCase()
    .replace(/(^|[\s,.'-])([a-z])/g, (_, lead, letter) => lead + letter.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();

function parseRow(line) {
  const cells = [...line.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
  if (cells.length < 8) return null;
  const [day, month, year] = cells[0].split('/');
  const price = Math.round(parseFloat(cells[4].replace(/[^0-9.]/g, '')));
  if (!year || !Number.isFinite(price)) return null;
  // "Not Full Market Price" sales (transfers, part shares) would mislead buyers
  if (cells[5] === 'Yes') return null;
  return {
    d: `${year}-${month}-${day}`,
    a: titleCase(cells[1]),
    e: cells[3].replace(/\s/g, '').toUpperCase() || null,
    p: price,
    // New homes are listed VAT-exclusive, so their price is not comparable
    n: cells[6] === 'Yes' || /^new/i.test(cells[7]),
  };
}

const sales = [];
for (const year of years) {
  const file = `PPR-${year}-Dublin.csv`;
  const response = await fetch(`${BASE}/${file}/$FILE/${file}`);
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  const text = new TextDecoder('latin1').decode(await response.arrayBuffer());
  const rows = text.split(/\r?\n/).slice(1).map(parseRow).filter(Boolean);
  console.log(`${file}: ${rows.length} sales`);
  sales.push(...rows);
}

sales.sort((a, b) => b.d.localeCompare(a.d));
const out = fileURLToPath(new URL('../dashboard/public/ppr-dublin.json', import.meta.url));
writeFileSync(out, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), sales }));
console.log(`Wrote ${sales.length} sales (${sales[sales.length - 1].d} to ${sales[0].d}) to ${out}`);
