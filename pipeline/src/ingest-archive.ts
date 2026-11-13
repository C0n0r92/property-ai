/**
 * Recover past asking prices from two public web archives: the Internet
 * Archive's Wayback Machine and Common Crawl.
 *
 * They hold dated copies of MyHome.ie's Dublin for-sale search
 * pages. Each copy carries the same listing data as the live page, so a
 * home's asking price can be read as it stood on the day of the copy. That
 * fills in homes that were listed and sold while nothing was collecting.
 *
 * It asks the archive's index which copies exist, reads each one once (kept
 * in .cache/archive so a re-run costs the archive nothing), and stores the
 * listings. Run `npm run match` afterwards to pair them with the register.
 *
 * Usage: npm run ingest:archive [-- --from 2025-06-01] [-- --max 50] [-- --source wayback|commoncrawl]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { gunzipSync } from 'zlib';
import { fileURLToPath } from 'url';
import { addressKey } from '../../dashboard/src/lib/real-price/address.ts';
import { bulkInsert, pool, runJob } from './db.ts';

const USER_AGENT = process.env.LISTINGS_USER_AGENT ?? 'PropertyDataBot/1.0 (Dublin market research; polite crawl)';
const DELAY_MS = Number(process.env.ARCHIVE_DELAY_MS ?? 1200);
const CACHE = join(dirname(fileURLToPath(import.meta.url)), '..', '.cache', 'archive');
const SITE = 'https://www.myhome.ie';

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const headers = { 'User-Agent': USER_AGENT };

interface Capture {
  timestamp: string; // YYYYMMDDhhmmss
  url: string;
  /** Set for Common Crawl copies: where the page sits inside the crawl's files. */
  warc?: { filename: string; offset: number; length: number };
}

export interface ArchivedResult {
  PropertyId?: number;
  DisplayAddress?: string;
  PriceAsString?: string;
  NumberOfBeds?: number;
  NumberOfBathrooms?: number;
  SizeStringMeters?: number;
  PropertyType?: string;
  PropertyClass?: string;
  IsSaleAgreed?: boolean;
  BrochureUrl?: string;
  Eircode?: string;
  ActivatedOn?: string;
  BrochureMap?: { latitude?: number; longitude?: number };
}

/** Every archived copy of a Dublin for-sale search page since `from`. */
async function listCaptures(from: string): Promise<Capture[]> {
  const query = new URLSearchParams({
    url: 'myhome.ie/residential/dublin*',
    from: from.replace(/-/g, ''),
    output: 'json',
    fl: 'timestamp,original',
    collapse: 'digest',
    limit: '50000',
  });
  const response = await fetch(`https://web.archive.org/cdx/search/cdx?${query}&filter=statuscode:200&filter=mimetype:text/html`, { headers });
  if (!response.ok) throw new Error(`Archive index: HTTP ${response.status}`);
  const rows = (await response.json()) as string[][];
  return rows
    .slice(1)
    .map(([timestamp, url]) => ({ timestamp, url }))
    .filter((c) => /for-sale/.test(c.url) && !/to-rent|\/brochure\//.test(c.url));
}

/**
 * Copies of the same pages held by Common Crawl, a second public web
 * archive. Its index server is often busy, so a crawl that cannot be listed
 * is skipped and picked up on the next run.
 */
async function listCommonCrawl(from: string): Promise<Capture[]> {
  const info = await fetch('https://index.commoncrawl.org/collinfo.json', { headers });
  if (!info.ok) return [];
  const crawls = ((await info.json()) as Array<{ id: string; to?: string }>).filter((c) => !c.to || c.to.slice(0, 10) >= from);
  const captures: Capture[] = [];
  for (const crawl of crawls) {
    const address = `https://index.commoncrawl.org/${crawl.id}-index?url=${encodeURIComponent('myhome.ie/residential/dublin*')}&output=json`;
    let text = '';
    for (let attempt = 0; attempt < 3 && !text; attempt++) {
      const response = await fetch(address, { headers }).catch(() => null);
      // A dropped connection mid-download counts as a failed attempt
      if (response?.ok) text = await response.text().catch(() => '');
      else if (response?.status === 404) break; // nothing held for this crawl
      else await sleep(15_000);
    }
    let found = 0;
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      const r = JSON.parse(line) as Record<string, string>;
      if (r.status !== '200' || !/for-sale/.test(r.url) || /to-rent|\/brochure\//.test(r.url)) continue;
      captures.push({
        timestamp: r.timestamp, url: r.url,
        warc: { filename: r.filename, offset: Number(r.offset), length: Number(r.length) },
      });
      found++;
    }
    console.log(`${crawl.id}: ${text ? found : 'index unavailable, skipped'}`);
    await sleep(DELAY_MS);
  }
  return captures;
}

const decode = (text: string) =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Pages archived before late 2025 carry no embedded data, only the listing
 * cards themselves: a link to the home, its price, address, a strip of
 * beds / baths / size, and the home type.
 */
export function parseCards(html: string): ArchivedResult[] {
  const results: ArchivedResult[] = [];
  const card =
    /href="(\/residential\/brochure\/[^"\/]+\/(\d+))"[^>]*>\s*<h2 class="card-title[^"]*"[^>]*>([^<]*)<\/h2>\s*<h3[^>]*>([^<]*)<\/h3>([\s\S]{0,3000}?)<\/a>/g;
  // Drop the framework's own markers so the cards read as plain HTML
  const plain = html.replace(/\s_ng(?:content|host)-[\w-]+=""/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '');
  for (const m of plain.matchAll(card)) {
    const rest = m[5];
    const strip = (label: string) => {
      const found = rest.match(new RegExp(`aria-label="${label}"[^>]*>(?:\\s*<[^>]+>)*\\s*([\\d.]+)`));
      return found ? Number(found[1]) : undefined;
    };
    const type = [...rest.matchAll(/<span[^>]*>([^<]+)<\/span>\s*<br/g)].pop()?.[1];
    results.push({
      PropertyId: Number(m[2]),
      BrochureUrl: m[1],
      PriceAsString: decode(m[3]),
      DisplayAddress: decode(m[4]),
      NumberOfBeds: strip('Beds'),
      NumberOfBathrooms: strip('Bath'),
      SizeStringMeters: strip('Size'),
      PropertyType: type ? decode(type) : undefined,
      IsSaleAgreed: /sale agreed/i.test(rest),
    });
  }
  return results;
}

/** Pull the search results out of a page, whichever layout it has. Empty if there are none. */
export function parseSearchPage(html: string): ArchivedResult[] {
  const state = html.match(/<script id="ng-state" type="application\/json">([\s\S]*?)<\/script>/);
  if (state) {
    try {
      const parsed = JSON.parse(state[1]) as Record<string, { SearchResults?: ArchivedResult[] }>;
      const key = Object.keys(parsed).find((k) => k.startsWith('SEARCH_RESOLVER'));
      if (key && parsed[key].SearchResults?.length) return parsed[key].SearchResults!;
    } catch {
      // fall through to the cards
    }
  }
  return parseCards(html);
}

/** One archived page's results, from the local cache or the archive. */
async function readCapture(capture: Capture): Promise<{ results: ArchivedResult[]; fetched: boolean }> {
  const file = join(CACHE, `${capture.warc ? 'cc-' : ''}${capture.timestamp}-${Buffer.from(capture.url).toString('base64url').slice(-80)}.json`);
  if (existsSync(file)) return { results: JSON.parse(readFileSync(file, 'utf-8')), fetched: false };

  if (capture.warc) {
    const { filename, offset, length } = capture.warc;
    const response = await fetch(`https://data.commoncrawl.org/${filename}`, {
      headers: { ...headers, Range: `bytes=${offset}-${offset + length - 1}` },
    });
    if (response.status === 429 || response.status === 503) {
      throw new Error('The archive asked us to slow down (HTTP 429). Stopping; run again later.');
    }
    if (!response.ok) return { results: [], fetched: true };
    const results = parseSearchPage(gunzipSync(Buffer.from(await response.arrayBuffer())).toString('utf-8'));
    writeFileSync(file, JSON.stringify(results));
    return { results, fetched: true };
  }

  // "id_" asks for the page exactly as it was captured, without the archive's toolbar
  const address = `https://web.archive.org/web/${capture.timestamp}id_/${capture.url}`;
  let response = await fetch(address, { headers });
  if (response.status === 429 || response.status >= 500) {
    await sleep(30_000);
    response = await fetch(address, { headers });
  }
  if (response.status === 429) throw new Error('The archive asked us to slow down (HTTP 429). Stopping; run again later.');
  const results = response.ok ? parseSearchPage(await response.text()) : [];
  // A missing copy is cached as empty too, so it is not asked for again
  if (response.ok || response.status === 404) writeFileSync(file, JSON.stringify(results));
  return { results, fetched: true };
}

function parsePrice(text: string | undefined): number | null {
  if (!text || !/^€[\d,]+$/.test(text.trim())) return null;
  const value = Number(text.replace(/[^\d]/g, ''));
  return value >= 50_000 && value <= 20_000_000 ? value : null;
}

const inRange = (v: number | undefined, lo: number, hi: number) => (v && v >= lo && v <= hi ? v : null);
const isEircode = (v: string | undefined) => (v && /^[A-Z]\d[\dW][0-9A-Z]{4}$/.test(v) ? v : null);

export interface ArchivedListing {
  row: Record<string, unknown>;
  prices: Map<string, number>; // day -> asking price
}

/**
 * Fold one page's results into the running set of listings. A listing seen
 * in several copies keeps its earliest and latest dates, and the price from
 * its latest copy.
 */
export function foldResults(listings: Map<string, ArchivedListing>, results: ArchivedResult[], day: string): number {
  let kept = 0;
  for (const r of results) {
    const price = parsePrice(r.PriceAsString);
    if (!r.PropertyId || !r.DisplayAddress || !price) continue;
    if (r.PropertyClass && r.PropertyClass !== 'ResidentialForSale') continue;
    if (!/dublin/i.test(r.DisplayAddress)) continue;
    kept++;
    const id = String(r.PropertyId);
    // The site's own "went live" date, when it is earlier than the copy
    const activated = /^\d{4}-\d{2}-\d{2}/.test(r.ActivatedOn ?? '') ? r.ActivatedOn!.slice(0, 10) : day;
    const firstSeen = activated < day ? activated : day;
    const existing = listings.get(id);
    if (existing) {
      existing.prices.set(day, price);
      if (firstSeen < (existing.row.first_seen as string)) existing.row.first_seen = firstSeen;
      if (day < (existing.row.last_seen as string)) continue;
    }
    const { key, district } = addressKey(r.DisplayAddress);
    listings.set(id, {
      prices: existing?.prices ?? new Map([[day, price]]),
      row: {
        source: 'myhome', source_id: id, address: r.DisplayAddress.trim(), address_key: key, district,
        eircode: isEircode(r.Eircode), property_type: r.PropertyType ?? null,
        beds: inRange(r.NumberOfBeds, 1, 20), baths: inRange(r.NumberOfBathrooms, 1, 20),
        sqm: inRange(r.SizeStringMeters, 10, 2000),
        lat: r.BrochureMap?.latitude || null, lng: r.BrochureMap?.longitude || null,
        asking_price: price, sale_agreed: Boolean(r.IsSaleAgreed),
        url: r.BrochureUrl ? `${SITE}${r.BrochureUrl}` : null,
        first_seen: existing && (existing.row.first_seen as string) < firstSeen ? existing.row.first_seen : firstSeen,
        last_seen: day,
      },
    });
  }
  return kept;
}

export async function ingestArchive(from: string, max: number) {
  mkdirSync(CACHE, { recursive: true });
  const source = arg('--source') ?? 'all';
  const captures = [
    ...(source !== 'commoncrawl' ? await listCaptures(from) : []),
    ...(source !== 'wayback' ? await listCommonCrawl(from) : []),
  ].slice(0, max);
  const listings = new Map<string, ArchivedListing>();
  let read = 0;
  let empty = 0;
  let failed = 0;
  let stoppedEarly = false;

  for (const capture of captures) {
    const day = `${capture.timestamp.slice(0, 4)}-${capture.timestamp.slice(4, 6)}-${capture.timestamp.slice(6, 8)}`;
    try {
      const { results, fetched } = await readCapture(capture);
      if (foldResults(listings, results, day) === 0) empty++;
      read++;
      if (read % 100 === 0) console.log(`${read}/${captures.length} copies read, ${listings.size} listings so far`);
      if (fetched) await sleep(DELAY_MS);
    } catch (error) {
      if (String(error).includes('slow down')) {
        // Keep what has been read; the rest is picked up on the next run
        console.warn(`Stopped early after ${read} copies: the archive asked us to slow down.`);
        stoppedEarly = true;
        break;
      }
      failed++;
      await sleep(DELAY_MS * 4);
    }
  }

  const rows = [...listings.values()].map((l) => l.row);
  const before = Number((await pool.query("SELECT COUNT(*) FROM listings WHERE source = 'myhome'")).rows[0].count);
  await bulkInsert(
    'listings',
    {
      source: 'text', source_id: 'text', address: 'text', address_key: 'text', district: 'text', eircode: 'text',
      property_type: 'text', beds: 'smallint', baths: 'smallint', sqm: 'real', lat: 'double precision',
      lng: 'double precision', asking_price: 'integer', sale_agreed: 'boolean', url: 'text',
      first_seen: 'date', last_seen: 'date',
    },
    rows,
    // Archived copies are older than what the live collector has seen, so
    // they only widen the dates; the newest sighting keeps the price.
    `ON CONFLICT (source, source_id) DO UPDATE SET
       first_seen = LEAST(listings.first_seen, EXCLUDED.first_seen),
       last_seen = GREATEST(listings.last_seen, EXCLUDED.last_seen),
       eircode = COALESCE(listings.eircode, EXCLUDED.eircode),
       asking_price = CASE WHEN EXCLUDED.last_seen >= listings.last_seen THEN EXCLUDED.asking_price ELSE listings.asking_price END,
       sale_agreed = CASE WHEN EXCLUDED.last_seen >= listings.last_seen THEN EXCLUDED.sale_agreed ELSE listings.sale_agreed END`
  );
  const pricePoints = [...listings.entries()].flatMap(([id, l]) =>
    [...l.prices].map(([seen_on, price]) => ({ source: 'myhome', source_id: id, seen_on, price }))
  );
  await bulkInsert(
    'listing_prices',
    { source: 'text', source_id: 'text', seen_on: 'date', price: 'integer' },
    pricePoints,
    'ON CONFLICT (source, source_id, seen_on) DO NOTHING'
  );
  const after = Number((await pool.query("SELECT COUNT(*) FROM listings WHERE source = 'myhome'")).rows[0].count);

  return {
    from, stoppedEarly, copiesListed: captures.length, copiesRead: read, copiesWithoutListings: empty, copiesFailed: failed,
    listingsFound: rows.length, newListings: after - before, pricePoints: pricePoints.length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runJob('ingest-archive', () => ingestArchive(arg('--from') ?? '2025-06-01', Number(arg('--max') ?? 50_000)));
  await pool.end();
}
