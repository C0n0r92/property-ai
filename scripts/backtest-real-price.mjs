/**
 * Backtest the Real Price model against sales it has not seen.
 *
 * For every Nth sale in the test year, predict its sale price from its asking
 * price using only sales that closed before it, then check how often the real
 * price landed inside the predicted ranges.
 *
 * Usage: node scripts/backtest-real-price.mjs [testYear] [sampleEvery]
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cleanSale, selectComparables, predict } from '../dashboard/src/lib/real-price/model.ts';

const DAY_MS = 86_400_000;
const testYear = process.argv[2] ?? '2025';
const sampleEvery = Number(process.argv[3] ?? 3);

const dataPath = fileURLToPath(new URL('../dashboard/public/data.json', import.meta.url));
const raw = JSON.parse(readFileSync(dataPath, 'utf-8')).properties;
const sales = raw.map((r) => cleanSale(r, Date.now())).filter(Boolean);
const test = sales
  .filter((s) => s.soldDate.startsWith(testYear) && s.typeGroup && s.areaKeys.length > 0)
  .filter((_, i) => i % sampleEvery === 0);

const median = (values) => {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

let predicted = 0;
let in80 = 0;
let in50 = 0;
const modelError = [];
const askingError = [];
const tiers = {};

for (const s of test) {
  const query = { areaKey: s.areaKeys[0], typeGroup: s.typeGroup, beds: s.beds ?? undefined, askingPrice: s.askingPrice };
  const { comps, tier } = selectComparables(sales, query, s.t - DAY_MS);
  if (tier === 'none') continue;
  const p = predict(comps, s.askingPrice);
  predicted++;
  tiers[tier] = (tiers[tier] ?? 0) + 1;
  if (s.soldPrice >= p.low && s.soldPrice <= p.high) in80++;
  if (s.soldPrice >= p.likelyLow && s.soldPrice <= p.likelyHigh) in50++;
  modelError.push(Math.abs(p.mid - s.soldPrice) / s.soldPrice);
  askingError.push(Math.abs(s.askingPrice - s.soldPrice) / s.soldPrice);
}

const pct = (v) => `${(v * 100).toFixed(1)}%`;
console.log(JSON.stringify({
  testYear,
  cleanSales: sales.length,
  tested: test.length,
  predicted,
  insideFullRange: pct(in80 / predicted),
  insideLikelyRange: pct(in50 / predicted),
  medianErrorModel: pct(median(modelError)),
  medianErrorAskingPrice: pct(median(askingError)),
  tiers,
}, null, 2));
