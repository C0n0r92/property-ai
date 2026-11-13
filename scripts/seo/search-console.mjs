#!/usr/bin/env node
/**
 * What Google does with the site, from Search Console.
 *
 *   node scripts/seo/search-console.mjs [--days 28] [--inspect /,/areas,/areas/dublin-8]
 *
 * Prints clicks, impressions, CTR and position for the period; top queries
 * and pages; sitemap status; and, for the pages given to --inspect (default:
 * a handful of key pages), whether Google has indexed them, when it last
 * crawled them and which canonical it chose.
 */
import { googleJson, googleToken } from './google-token.mjs';

const SITE = 'sc-domain:irishpropertydata.com';
const ORIGIN = 'https://irishpropertydata.com';
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const days = Number(opt('--days', 28));
const inspect = opt('--inspect', '/,/areas,/areas/dublin-8,/reports,/blog').split(',').filter(Boolean);
const site = encodeURIComponent(SITE);
const api = 'https://searchconsole.googleapis.com';

const day = (offset) => new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const pad = (s, n) => String(s).slice(0, n).padEnd(n);

const token = googleToken(['https://www.googleapis.com/auth/webmasters.readonly']);
// Search Console data lags about two days
const range = { startDate: day(days + 2), endDate: day(2) };
const query = (body) =>
  googleJson(`${api}/webmasters/v3/sites/${site}/searchAnalytics/query`, token, {
    method: 'POST',
    body: JSON.stringify({ ...range, ...body }),
  });

console.log(`Search Console: ${SITE}, ${range.startDate} to ${range.endDate}\n`);

const totals = (await query({}))?.rows?.[0];
if (totals) {
  console.log(
    `Clicks ${totals.clicks} · impressions ${totals.impressions} · CTR ${pct(totals.ctr)} · average position ${totals.position.toFixed(1)}\n`
  );
} else {
  console.log('No search traffic recorded in this period.\n');
}

for (const [dimension, label] of [
  ['query', 'Top queries'],
  ['page', 'Top pages'],
]) {
  const rows = (await query({ dimensions: [dimension], rowLimit: 15 }))?.rows ?? [];
  if (!rows.length) continue;
  console.log(`${label}`);
  console.log(`  ${pad('', 58)} ${pad('clicks', 7)} ${pad('impr.', 7)} ${pad('ctr', 7)} pos`);
  for (const r of rows) {
    const key = r.keys[0].replace(ORIGIN, '') || '/';
    console.log(`  ${pad(key, 58)} ${pad(r.clicks, 7)} ${pad(r.impressions, 7)} ${pad(pct(r.ctr), 7)} ${r.position.toFixed(1)}`);
  }
  console.log('');
}

const sitemaps = (await googleJson(`${api}/webmasters/v3/sites/${site}/sitemaps`, token))?.sitemap ?? [];
console.log('Sitemaps');
for (const s of sitemaps) {
  const counts = (s.contents ?? []).map((c) => `${c.submitted ?? 0} submitted${c.indexed ? `, ${c.indexed} indexed` : ''}`).join('; ');
  console.log(
    `  ${s.path}: last read ${s.lastDownloaded?.slice(0, 10) ?? 'not yet'}${s.isPending ? ' (pending)' : ''} · ${s.errors ?? 0} errors, ${s.warnings ?? 0} warnings${counts ? ` · ${counts}` : ''}`
  );
}

console.log('\nIndex status');
for (const path of inspect) {
  const url = `${ORIGIN}${path}`;
  try {
    const r = await googleJson(`${api}/v1/urlInspection/index:inspect`, token, {
      method: 'POST',
      body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE }),
    });
    const s = r.inspectionResult?.indexStatusResult ?? {};
    const canonical = s.googleCanonical && s.googleCanonical !== url ? ` · Google's canonical: ${s.googleCanonical}` : '';
    console.log(
      `  ${pad(path, 32)} ${s.verdict ?? '?'} · ${s.coverageState ?? ''}${s.lastCrawlTime ? ` · crawled ${s.lastCrawlTime.slice(0, 10)}` : ''}${canonical}`
    );
  } catch (error) {
    console.log(`  ${pad(path, 32)} inspection failed: ${error.message}`);
  }
}
