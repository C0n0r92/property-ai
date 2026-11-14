#!/usr/bin/env node
/**
 * Where every page in the sitemap stands with Google.
 *
 *   node scripts/seo/index-status.mjs [--submit-sitemap] [--json out.json] [--limit N]
 *
 * --submit-sitemap  resubmit sitemap.xml in Search Console first, so Google
 *                   rereads it (the closest thing to "request indexing" the API allows)
 * --json            write every page's result to a file
 * --limit           inspect only the first N pages
 * --budget N        inspect every page outside /streets/ and a rotating slice of
 *                   street pages, N in all (Google allows 2,000 a day)
 *
 * Inspects each URL with the URL Inspection API and prints how many are
 * indexed, the count per coverage state, and the pages with a real problem
 * (404, noindex, redirect error, Google picked another canonical…). Exits 1
 * when there are such problems, so a scheduled run emails the owner. Pages
 * Google simply has not reached yet are reported, not treated as failures.
 * In GitHub Actions the summary also goes to the job summary.
 */
import { appendFileSync, writeFileSync } from 'node:fs';
import { googleJson, googleToken } from './google-token.mjs';
import { dailySlice, isStreetPage, parseSitemap, summarise } from './index-lib.mjs';

const SITE = 'sc-domain:irishpropertydata.com';
const ORIGIN = 'https://irishpropertydata.com';
const SITEMAP = `${ORIGIN}/sitemap.xml`;
const api = 'https://searchconsole.googleapis.com';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const limit = Number(opt('--limit') ?? Infinity);
const budget = opt('--budget') ? Number(opt('--budget')) : null;
const jsonOut = opt('--json');

const token = googleToken(['https://www.googleapis.com/auth/webmasters']);
const site = encodeURIComponent(SITE);

if (args.includes('--submit-sitemap')) {
  const res = await fetch(`${api}/webmasters/v3/sites/${site}/sitemaps/${encodeURIComponent(SITEMAP)}`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}` },
  });
  console.log(`Sitemap resubmitted: ${res.status === 204 || res.ok ? 'ok' : `${res.status} ${await res.text()}`}`);
  if (!res.ok) process.exitCode = 1;
}

const sitemapRes = await fetch(SITEMAP, { signal: AbortSignal.timeout(60_000) });
const entries = parseSitemap(await sitemapRes.text());
if (!entries.length) {
  console.error(`No URLs in ${SITEMAP} (HTTP ${sitemapRes.status})`);
  process.exit(1);
}
const every = entries.map((e) => e.loc);
const keyCount = every.filter((u) => !isStreetPage(u)).length;
const urls = (budget !== null ? dailySlice(every, isStreetPage, Math.max(0, budget - keyCount)) : every).slice(0, limit);
if (urls.length < every.length) console.log(`Inspecting ${urls.length} of ${every.length} pages today (key pages and a rotating slice of street pages)`);

async function inspect(url) {
  try {
    const r = await googleJson(`${api}/v1/urlInspection/index:inspect`, token, {
      method: 'POST',
      body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE }),
    });
    const s = r.inspectionResult?.indexStatusResult ?? {};
    return {
      url,
      verdict: s.verdict,
      coverageState: s.coverageState,
      lastCrawlTime: s.lastCrawlTime ?? null,
      googleCanonical: s.googleCanonical ?? null,
      robotsTxtState: s.robotsTxtState,
      pageFetchState: s.pageFetchState,
    };
  } catch (error) {
    return { url, error: error.message };
  }
}

// A few at a time: well under the 600-a-minute limit
const results = [];
for (let i = 0; i < urls.length; i += 4) {
  results.push(...(await Promise.all(urls.slice(i, i + 4).map(inspect))));
}

const s = summarise(results);
const path = (u) => u.replace(ORIGIN, '') || '/';
const lines = [
  `## Google index: ${s.indexed} of ${s.checked} pages checked today are indexed (sitemap: ${every.length})`,
  '',
  '| Coverage state | Pages |',
  '| --- | ---: |',
  ...Object.entries(s.byState).map(([state, n]) => `| ${state} | ${n} |`),
  '',
];
if (s.problems.length) {
  lines.push(`### ${s.problems.length} page(s) need a fix`, '');
  for (const p of s.problems) {
    const canonical = p.googleCanonical && p.googleCanonical !== p.url ? ` (Google's canonical: ${path(p.googleCanonical)})` : '';
    lines.push(`- \`${path(p.url)}\`: ${p.coverageState ?? p.verdict}${canonical}`);
  }
  lines.push('');
}
if (s.failed.length) lines.push(`${s.failed.length} inspection(s) failed: ${s.failed[0].error}`, '');

const report = lines.join('\n');
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ at: new Date().toISOString(), ...s, results }, null, 2));

// Fail only on real problems, or when nothing could be inspected at all
if (s.problems.length || s.failed.length === s.checked) process.exitCode = 1;
