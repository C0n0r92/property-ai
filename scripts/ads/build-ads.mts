/**
 * Write a Google Ads Editor import for the price check, from the live figures.
 *
 *   DATABASE_URL=... npx tsx scripts/ads/build-ads.mts [--budget 10] [--min-sales 80]
 *
 * Writes ads-export/irishpropertydata-search.csv (UTF-8, for a spreadsheet)
 * and ads-export/irishpropertydata-search.txt (UTF-16, tab-separated: the
 * format Google Ads Editor on a Mac imports). Import with Account > Import >
 * From file, review, then post. Everything arrives Paused.
 * Re-run monthly: the area figures in the ads change with the market.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildAreaIndex } from '../../dashboard/src/lib/real-price/area-page';
import { getSalesStore } from '../../dashboard/src/lib/real-price/store';
import { computeTrackRecord } from '../../dashboard/src/lib/real-price/track-record';
// @ts-expect-error plain JavaScript module
import { buildRows, COLUMNS, toCsv } from './ads-lib.mjs';

const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
};
const budget = arg('--budget', 10);
const minSales = arg('--min-sales', 80);
const SITE = 'https://irishpropertydata.com';

const store = await getSalesStore();
const index = buildAreaIndex(store);
const areas = index
  .filter((a) => a.kind === 'district' || a.count >= minSales)
  .sort((a, b) => (a.kind === b.kind ? b.count - a.count : a.kind === 'district' ? -1 : 1))
  .map((a) => ({
    label: a.label,
    slug: a.slug,
    medianOverAskingPct: a.medianOverAskingPct,
    shareAboveAsking: a.shareAboveAsking,
    medianPrice: a.medianPrice,
  }));

// Dublin as a whole, last 12 months
const lastYear = store.sales.filter((s) => s.t >= store.asOf - 365 * 86_400_000).map((s) => s.ratio).sort((a, b) => a - b);
const dublinProfile = {
  medianOverAskingPct: (lastYear[Math.floor(lastYear.length / 2)] - 1) * 100,
  shareAboveAsking: lastYear.filter((r) => r > 1.0001).length / lastYear.length,
};
const record = computeTrackRecord(store.sales, store.asOf, 12, 2).overall;
const accuracy = {
  insideRangePct: Math.round(record.insideRangePct),
  medianModelErrorPct: record.medianModelErrorPct,
  medianAskingErrorPct: record.medianAskingErrorPct,
};

const rows = buildRows({
  site: SITE,
  campaign: 'IPD Search: Dublin price check',
  budget,
  dublin: { medianOverAskingPct: dublinProfile.medianOverAskingPct, shareAboveAsking: dublinProfile.shareAboveAsking },
  areas,
  accuracy,
});

mkdirSync('ads-export', { recursive: true });
const csv = toCsv(rows, COLUMNS);
writeFileSync('ads-export/irishpropertydata-search.csv', `﻿${csv}`);
// Tab-separated UTF-16 little-endian with a byte order mark, as Ads Editor on a Mac expects
const tsv = [COLUMNS.join('\t'), ...rows.map((r: Record<string, string>) => COLUMNS.map((c: string) => (r[c] ?? '').replace(/[\t\n]/g, ' ')).join('\t'))].join('\r\n');
writeFileSync('ads-export/irishpropertydata-search.txt', Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(tsv, 'utf16le')]));
console.log(`${rows.length} rows: 1 campaign, ${areas.length + 1} ad groups, budget €${budget}/day, all Paused.`);
console.log(`Accuracy quoted: ${accuracy.insideRangePct}% in range, ${accuracy.medianModelErrorPct.toFixed(1)}% vs ${accuracy.medianAskingErrorPct.toFixed(1)}%.`);
process.exit(0);
