/**
 * Collect Dublin homes for sale from MyHome.ie search pages: address, asking
 * price, beds, size, type and location. This is where fresh asking prices
 * come from; the register later supplies what each home sold for.
 *
 * Polite by design: it reads robots.txt first and stops if these pages are
 * disallowed, identifies itself honestly, makes one request every few
 * seconds, and stops at once if the site answers 403 or 429.
 *
 * Usage: npm run ingest:listings [-- --max 5]
 */
import { addressKey } from '../../dashboard/src/lib/real-price/address.ts';
import { bulkInsert, pool, runJob, today } from './db.ts';

const SITE = 'https://www.myhome.ie';
const PATH = '/residential/dublin/property-for-sale';
const USER_AGENT = process.env.LISTINGS_USER_AGENT ?? 'PropertyDataBot/1.0 (Dublin market research; polite crawl)';
const DELAY_MS = Number(process.env.LISTINGS_DELAY_MS ?? 2500);
const maxArg = process.argv.indexOf('--max');
const MAX_PAGES = maxArg > 0 ? Number(process.argv[maxArg + 1]) : 400;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const headers = { 'User-Agent': USER_AGENT, Accept: 'text/html' };

/** True if robots.txt (for all agents) allows the plain page and ?page=N. */
async function allowedByRobots(): Promise<boolean> {
  const response = await fetch(`${SITE}/robots.txt`, { headers });
  if (!response.ok) return false;
  const lines = (await response.text()).split(/\r?\n/).map((l) => l.trim());
  let inAll = false;
  const rules: Array<{ allow: boolean; pattern: string }> = [];
  for (const line of lines) {
    const agent = line.match(/^user-agent:\s*(.+)$/i);
    if (agent) inAll = agent[1].trim() === '*';
    const rule = line.match(/^(allow|disallow):\s*(\S*)/i);
    if (inAll && rule && rule[2]) rules.push({ allow: rule[1].toLowerCase() === 'allow', pattern: rule[2] });
  }
  const verdict = (path: string) => {
    // Longest matching rule wins, as in the robots standard
    let best: { allow: boolean; pattern: string } | null = null;
    for (const rule of rules) {
      const regex = new RegExp(
        '^' + rule.pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$')
      );
      if (regex.test(path) && (!best || rule.pattern.length > best.pattern.length)) best = rule;
    }
    return best ? best.allow : true;
  };
  return verdict(PATH) && verdict(`${PATH}?page=2`);
}

interface Result {
  PropertyId: number;
  DisplayAddress?: string;
  PriceAsString?: string;
  NumberOfBeds?: number;
  NumberOfBathrooms?: number;
  SizeStringMeters?: number;
  PropertyType?: string;
  IsSaleAgreed?: boolean;
  BrochureUrl?: string;
  BrochureMap?: { latitude?: number; longitude?: number };
}

async function fetchPage(page: number): Promise<{ results: Result[]; total: number }> {
  const url = `${SITE}${PATH}${page > 1 ? `?page=${page}` : ''}`;
  const response = await fetch(url, { headers });
  if (response.status === 403 || response.status === 429) {
    throw new Error(`Site refused the request (HTTP ${response.status}). Stopping.`);
  }
  if (!response.ok) throw new Error(`Page ${page}: HTTP ${response.status}`);
  const html = await response.text();
  const state = html.match(/<script id="ng-state" type="application\/json">([\s\S]*?)<\/script>/);
  if (!state) throw new Error(`Page ${page}: listing data not found. The page layout may have changed.`);
  const parsed = JSON.parse(state[1]) as Record<string, { SearchResults?: Result[]; ResultCount?: number }>;
  const key = Object.keys(parsed).find((k) => k.startsWith('SEARCH_RESOLVER'));
  if (!key) throw new Error(`Page ${page}: search results not found. The page layout may have changed.`);
  return { results: parsed[key].SearchResults ?? [], total: parsed[key].ResultCount ?? 0 };
}

/** "€560,000" -> 560000. Ranges, "POA" and "From" prices are skipped. */
function parsePrice(text: string | undefined): number | null {
  if (!text || !/^€[\d,]+$/.test(text.trim())) return null;
  const value = Number(text.replace(/[^\d]/g, ''));
  return value >= 50_000 && value <= 20_000_000 ? value : null;
}

export async function ingestListings(maxPages = MAX_PAGES) {
  if (!(await allowedByRobots())) {
    throw new Error('robots.txt does not allow these pages. Nothing was collected.');
  }
  const day = today();
  const rows = new Map<string, Record<string, unknown>>();
  let pages = 0;
  let skipped = 0;
  let total = 0;

  for (let page = 1; page <= maxPages; page++) {
    let fetched;
    try {
      fetched = await fetchPage(page);
    } catch (error) {
      if (String(error).includes('refused')) throw error;
      await sleep(DELAY_MS * 4); // one retry for a transient failure
      fetched = await fetchPage(page);
    }
    pages++;
    total = fetched.total || total;
    if (fetched.results.length === 0) break;
    for (const r of fetched.results) {
      const price = parsePrice(r.PriceAsString);
      if (!r.PropertyId || !r.DisplayAddress || !price) {
        skipped++;
        continue;
      }
      const { key, district } = addressKey(r.DisplayAddress);
      const beds = r.NumberOfBeds && r.NumberOfBeds > 0 && r.NumberOfBeds <= 20 ? r.NumberOfBeds : null;
      const baths = r.NumberOfBathrooms && r.NumberOfBathrooms > 0 && r.NumberOfBathrooms <= 20 ? r.NumberOfBathrooms : null;
      const sqm = r.SizeStringMeters && r.SizeStringMeters >= 10 && r.SizeStringMeters <= 2000 ? r.SizeStringMeters : null;
      const lat = r.BrochureMap?.latitude || null;
      const lng = r.BrochureMap?.longitude || null;
      rows.set(String(r.PropertyId), {
        source: 'myhome', source_id: String(r.PropertyId), address: r.DisplayAddress.trim(),
        address_key: key, district, eircode: null, property_type: r.PropertyType ?? null,
        beds, baths, sqm, lat, lng, asking_price: price, sale_agreed: Boolean(r.IsSaleAgreed),
        url: r.BrochureUrl ? `${SITE}${r.BrochureUrl}` : null, first_seen: day, last_seen: day,
      });
    }
    if (total && page * 20 >= total) break;
    await sleep(DELAY_MS);
  }

  const list = [...rows.values()];
  // Record a price point for new listings and for any whose price changed
  const known = new Map<string, number>(
    (
      await pool.query("SELECT source_id, asking_price FROM listings WHERE source = 'myhome' AND source_id = ANY($1)", [
        list.map((l) => l.source_id),
      ])
    ).rows.map((r) => [r.source_id, r.asking_price])
  );
  const pricePoints = list
    .filter((l) => known.get(l.source_id as string) !== l.asking_price)
    .map((l) => ({ source: 'myhome', source_id: l.source_id, seen_on: day, price: l.asking_price }));

  await bulkInsert(
    'listings',
    {
      source: 'text', source_id: 'text', address: 'text', address_key: 'text', district: 'text', eircode: 'text',
      property_type: 'text', beds: 'smallint', baths: 'smallint', sqm: 'real', lat: 'double precision',
      lng: 'double precision', asking_price: 'integer', sale_agreed: 'boolean', url: 'text',
      first_seen: 'date', last_seen: 'date',
    },
    list,
    `ON CONFLICT (source, source_id) DO UPDATE SET
       last_seen = EXCLUDED.last_seen, asking_price = EXCLUDED.asking_price,
       sale_agreed = EXCLUDED.sale_agreed, address = EXCLUDED.address,
       address_key = EXCLUDED.address_key, district = EXCLUDED.district,
       property_type = EXCLUDED.property_type, beds = EXCLUDED.beds, baths = EXCLUDED.baths,
       sqm = EXCLUDED.sqm, lat = EXCLUDED.lat, lng = EXCLUDED.lng, url = EXCLUDED.url`
  );
  await bulkInsert(
    'listing_prices',
    { source: 'text', source_id: 'text', seen_on: 'date', price: 'integer' },
    pricePoints,
    'ON CONFLICT (source, source_id, seen_on) DO UPDATE SET price = EXCLUDED.price'
  );

  return {
    pages, siteTotal: total, collected: list.length, skippedNoPrice: skipped,
    newListings: list.length - known.size, priceChanges: pricePoints.length - (list.length - known.size),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runJob('ingest-listings', () => ingestListings());
  await pool.end();
}
