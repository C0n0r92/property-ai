// node --test scripts/seo
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changedSince, parseSitemap, summarise } from './index-lib.mjs';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://irishpropertydata.com/</loc><changefreq>daily</changefreq></url>
<url><loc>https://irishpropertydata.com/areas</loc><lastmod>2026-11-06T00:00:00.000Z</lastmod></url>
<url>
<loc>https://irishpropertydata.com/blog/a&amp;b</loc>
<lastmod>2026-11-12</lastmod>
</url>
</urlset>`;

test('parseSitemap reads every url with its lastmod, unescaping entities', () => {
  assert.deepEqual(parseSitemap(xml), [
    { loc: 'https://irishpropertydata.com/', lastmod: null },
    { loc: 'https://irishpropertydata.com/areas', lastmod: '2026-11-06T00:00:00.000Z' },
    { loc: 'https://irishpropertydata.com/blog/a&b', lastmod: '2026-11-12' },
  ]);
});

test('parseSitemap of an empty or broken document is empty', () => {
  assert.deepEqual(parseSitemap(''), []);
  assert.deepEqual(parseSitemap('<html>not a sitemap</html>'), []);
});

test('changedSince keeps urls modified on or after the date and skips undated ones', () => {
  const entries = parseSitemap(xml);
  assert.deepEqual(changedSince(entries, new Date('2026-11-10T00:00:00Z')), ['https://irishpropertydata.com/blog/a&b']);
  assert.deepEqual(changedSince(entries, new Date('2026-11-06T00:00:00Z')).length, 2);
  assert.deepEqual(changedSince(entries, new Date('2026-12-01T00:00:00Z')), []);
});

test('summarise counts states and separates real problems from waiting pages', () => {
  const s = summarise([
    { url: 'a', verdict: 'PASS', coverageState: 'Submitted and indexed' },
    { url: 'b', verdict: 'NEUTRAL', coverageState: 'Discovered - currently not indexed' },
    { url: 'c', verdict: 'NEUTRAL', coverageState: 'Discovered - currently not indexed' },
    { url: 'd', verdict: 'FAIL', coverageState: 'Not found (404)' },
    { url: 'e', error: '429 Quota exceeded' },
  ]);
  assert.equal(s.checked, 5);
  assert.equal(s.indexed, 1);
  assert.deepEqual(s.byState, {
    'Discovered - currently not indexed': 2,
    'Submitted and indexed': 1,
    'Not found (404)': 1,
    'Inspection failed': 1,
  });
  assert.deepEqual(s.problems.map((p) => p.url), ['d']);
  assert.deepEqual(s.failed.map((p) => p.url), ['e']);
});

test('summarise flags pages Google chose another canonical for', () => {
  const s = summarise([
    { url: 'https://x/a', verdict: 'NEUTRAL', coverageState: 'Duplicate, Google chose different canonical than user', googleCanonical: 'https://x/b' },
  ]);
  assert.deepEqual(s.problems.map((p) => p.url), ['https://x/a']);
});

test('dailySlice: key pages always, a rotating share of the rest, covering everything over the days', async () => {
  const { dailySlice } = await import('./index-lib.mjs');
  const urls = ['/a', '/b', ...Array.from({ length: 10 }, (_, i) => `/streets/s${i}`)];
  const isBulk = (u) => u.startsWith('/streets/');
  const day0 = dailySlice(urls, isBulk, 4, 0);
  assert.deepEqual(day0.slice(0, 2), ['/a', '/b']);
  assert.equal(day0.length, 6);
  const seen = new Set();
  for (let day = 0; day < 3; day++) dailySlice(urls, isBulk, 4, day).filter(isBulk).forEach((u) => seen.add(u));
  assert.equal(seen.size, 10);
  // No more than everything
  assert.equal(dailySlice(urls, isBulk, 50, 0).length, 12);
});
