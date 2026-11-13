#!/usr/bin/env node
/**
 * Google PageSpeed Insights for key pages: Lighthouse scores and, where
 * Chrome has enough real visits, Core Web Vitals from real users.
 *
 *   node scripts/seo/pagespeed.mjs [--strategy mobile|desktop] [path ...]
 *
 * Set PAGESPEED_API_KEY for higher rate limits (works without one for a few
 * pages at a time).
 */
const ORIGIN = process.env.SITE_URL ?? 'https://irishpropertydata.com';
const args = process.argv.slice(2);
const strategyIndex = args.indexOf('--strategy');
const strategy = strategyIndex >= 0 ? args[strategyIndex + 1] : 'mobile';
const paths = args.filter((a, i) => !a.startsWith('--') && i !== strategyIndex + 1);
const targets = paths.length ? paths : ['/', '/areas/dublin-8', '/reports', '/blog'];

const score = (v) => (v === undefined || v === null ? ' – ' : String(Math.round(v * 100)).padStart(3));
const ms = (a) => a?.displayValue ?? '–';

console.log(`PageSpeed Insights (${strategy}) for ${ORIGIN}\n`);
console.log('page                         perf  a11y  best   seo   LCP       TBT       CLS     field (real users)');
for (const path of targets) {
  const params = new URLSearchParams({ url: `${ORIGIN}${path}`, strategy });
  for (const c of ['performance', 'accessibility', 'best-practices', 'seo']) params.append('category', c);
  if (process.env.PAGESPEED_API_KEY) params.set('key', process.env.PAGESPEED_API_KEY);
  try {
    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`, {
      signal: AbortSignal.timeout(120_000),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? res.status);
    const cats = data.lighthouseResult.categories;
    const audits = data.lighthouseResult.audits;
    const field = data.loadingExperience?.metrics;
    const fieldText = field
      ? `LCP ${field.LARGEST_CONTENTFUL_PAINT_MS?.category ?? '?'}, INP ${field.INTERACTION_TO_NEXT_PAINT?.category ?? '?'}, CLS ${field.CUMULATIVE_LAYOUT_SHIFT_SCORE?.category ?? '?'}`
      : 'not enough visits yet';
    console.log(
      `${path.padEnd(28)} ${score(cats.performance?.score)}   ${score(cats.accessibility?.score)}   ${score(cats['best-practices']?.score)}   ${score(cats.seo?.score)}   ${ms(audits['largest-contentful-paint']).padEnd(9)} ${ms(audits['total-blocking-time']).padEnd(9)} ${ms(audits['cumulative-layout-shift']).padEnd(7)} ${fieldText}`
    );
    const failing = Object.values(audits)
      .filter((a) => a.score !== null && a.score < 0.9 && a.details?.type === 'opportunity')
      .sort((a, b) => (b.details.overallSavingsMs ?? 0) - (a.details.overallSavingsMs ?? 0))
      .slice(0, 3);
    for (const a of failing) console.log(`    ↳ ${a.title}${a.displayValue ? ` (${a.displayValue})` : ''}`);
  } catch (error) {
    console.log(`${path.padEnd(28)} failed: ${error.message}`);
  }
}
