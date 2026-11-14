// node --test scripts/ads/ads-lib.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { areaAd, buildRows, checkAd, COLUMNS, fit, LIMITS, pathPart, toCsv } from './ads-lib.mjs';

const site = 'https://irishpropertydata.com';
const accuracy = { insideRangePct: 78, medianModelErrorPct: 4.9, medianAskingErrorPct: 7.4 };
const dublin = { medianOverAskingPct: 8.2, shareAboveAsking: 0.81 };
const area = { label: 'Dublin 6W', slug: 'dublin-6w', medianOverAskingPct: 12.6, shareAboveAsking: 0.86, medianPrice: 652_000 };
const longArea = { ...area, label: 'Dun Laoghaire Rathdown County', slug: 'dlr' };

test('fit keeps texts within the limit, without repeats', () => {
  assert.deepEqual(fit(['ok', 'x'.repeat(31), 'OK', 'fine'], 30, 15), ['ok', 'fine']);
  assert.deepEqual(fit(['a', 'b', 'c'], 30, 2), ['a', 'b']);
});

test('every headline, description and path is within Google’s limits', () => {
  for (const ad of [areaAd(area, site, accuracy), areaAd(longArea, site, accuracy), checkAd(site, dublin, accuracy)]) {
    assert.ok(ad.headlines.length >= 3 && ad.headlines.length <= 15, `headlines: ${ad.headlines.length}`);
    assert.ok(ad.descriptions.length >= 2 && ad.descriptions.length <= 4, `descriptions: ${ad.descriptions.length}`);
    for (const h of ad.headlines) assert.ok(h.length <= LIMITS.headline, h);
    for (const d of ad.descriptions) assert.ok(d.length <= LIMITS.description, d);
    assert.ok(ad.path1.length <= LIMITS.path && ad.path2.length <= LIMITS.path);
  }
});

test('area ads quote the area’s own figures and link to its page', () => {
  const ad = areaAd(area, site, accuracy);
  assert.ok(ad.headlines.includes('Dublin 6W: +12.6% Over Asking'));
  assert.ok(ad.headlines.includes('86% Sold Above Asking'));
  assert.equal(ad.finalUrl, 'https://irishpropertydata.com/areas/dublin-6w');
  assert.equal(ad.path2, 'dublin-6w');
});

test('path segments', () => {
  assert.equal(pathPart('Dún Laoghaire Rathdown'), 'd-n-laoghaire-r');
  assert.equal(pathPart('Dublin 8'), 'dublin-8');
});

test('everything is created paused, so importing never spends', () => {
  const rows = buildRows({ site, campaign: 'IPD Search', budget: 10, dublin, areas: [area], accuracy });
  const statuses = rows.map((r) => r.Status || r['Campaign status']).filter(Boolean);
  assert.ok(statuses.length > 5);
  assert.ok(statuses.every((s) => s === 'Paused'));
  assert.equal(rows[0]['Campaign status'], 'Paused');
  assert.ok(rows.some((r) => r['Criterion type'] === 'Campaign negative' && r.Keyword === 'rent'));
});

test('CSV quoting and header', () => {
  const csv = toCsv([{ Campaign: 'A, "B"', Keyword: 'x' }], ['Campaign', 'Keyword']);
  assert.equal(csv, 'Campaign,Keyword\n"A, ""B""",x\n');
  assert.ok(toCsv([], COLUMNS).startsWith('Campaign,Campaign type,Campaign daily budget'));
});
