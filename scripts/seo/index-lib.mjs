/** Pure helpers for the indexing scripts (tested in index-lib.test.mjs). */

const unescape = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/** Every <url> in a sitemap, with its lastmod (null when absent). */
export function parseSitemap(xml) {
  return [...String(xml).matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .map(([, body]) => {
      const loc = body.match(/<loc>\s*([^<]+?)\s*<\/loc>/)?.[1];
      const lastmod = body.match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/)?.[1] ?? null;
      return loc ? { loc: unescape(loc), lastmod } : null;
    })
    .filter(Boolean);
}

/** URLs whose lastmod is on or after `since`. Undated URLs are skipped. */
export function changedSince(entries, since) {
  return entries.filter((e) => e.lastmod && new Date(e.lastmod) >= since).map((e) => e.loc);
}

// States that mean something is wrong with the page, not that Google is just slow
const PROBLEM = /404|soft 404|redirect|server error|5xx|blocked|noindex|excluded by|duplicate|alternate page|unauthorized|403/i;

/**
 * Count inspection results by coverage state, and pick out
 *  - problems: FAIL verdicts or states that need a fix (404, noindex, duplicate…)
 *  - failed:   inspections that errored (quota, network)
 */
export function summarise(results) {
  const byState = {};
  const problems = [];
  const failed = [];
  let indexed = 0;
  for (const r of results) {
    const state = r.error ? 'Inspection failed' : r.coverageState || 'Unknown';
    byState[state] = (byState[state] ?? 0) + 1;
    if (r.error) failed.push(r);
    else if (r.verdict === 'PASS') indexed++;
    else if (r.verdict === 'FAIL' || PROBLEM.test(state)) problems.push(r);
  }
  const sorted = Object.fromEntries(Object.entries(byState).sort((a, b) => b[1] - a[1]));
  return { checked: results.length, indexed, byState: sorted, problems, failed };
}

/**
 * Every "key" URL, plus `share` of the bulk URLs (street pages), a different
 * slice each day so all are covered over ceil(bulk / share) days.
 */
export function dailySlice(urls, isBulk, share, day = Math.floor(Date.now() / 86_400_000)) {
  const key = urls.filter((u) => !isBulk(u));
  const bulk = urls.filter(isBulk).sort();
  if (bulk.length <= share) return [...key, ...bulk];
  const start = (day * share) % bulk.length;
  const slice = bulk.slice(start, start + share);
  if (slice.length < share) slice.push(...bulk.slice(0, share - slice.length));
  return [...key, ...slice];
}

/** Street pages and street listings: the bulk of the sitemap. */
export const isStreetPage = (url) => /\/streets\/.+/.test(url);
