#!/usr/bin/env node
/**
 * Visual check: loads pages in a real browser at desktop and phone widths and
 * reports what a person would notice.
 *
 *   node scripts/visual-check.mjs [baseUrl] [path ...] [--out dir]
 *
 * baseUrl defaults to http://localhost:3457; paths default to the main page
 * types. For each page and width: scrolls through it (so lazy 3D scenes and
 * animations run), then checks
 *   - sideways overflow, naming the element that sticks out
 *   - JavaScript errors and failed same-site requests
 *   - how long the page took to settle
 * and saves a top-of-page and a full-page screenshot to --out (default: a
 * temporary folder, printed at the end). Exits 1 if anything is wrong.
 *
 * Uses the Playwright installed for the scraper (scraper/node_modules).
 */
import { mkdtempSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(join(root, 'scraper', 'package.json'));
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const out = outIndex >= 0 ? args[outIndex + 1] : mkdtempSync(join(tmpdir(), 'visual-check-'));
mkdirSync(out, { recursive: true });
const rest = args.filter((a, i) => a !== '--out' && i !== outIndex + 1);
const base = (rest.find((a) => /^https?:\/\//.test(a)) ?? 'http://localhost:3457').replace(/\/+$/, '');
const paths = rest.filter((a) => a.startsWith('/'));
const targets = paths.length
  ? paths
  : ['/', '/areas', '/areas/dublin-8', '/reports', '/blog', '/blog/dublin-bidding-wars-analysis', '/real-price/report?sample=1'];

const VIEWPORTS = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false },
  { name: 'phone', viewport: { width: 390, height: 844 }, isMobile: true },
];

const problems = [];
const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: vp.viewport, isMobile: vp.isMobile, hasTouch: vp.isMobile });
  // Answer the cookie banner so it does not cover screenshots
  await context.addInitScript(() => localStorage.setItem('ipd-analytics-consent', 'denied'));
  for (const path of targets) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(`JS error: ${e.message.slice(0, 160)}`));
    page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text().slice(0, 160)}`));
    page.on('response', (r) => {
      if (r.status() >= 400 && r.url().startsWith(base)) errors.push(`${r.status()} ${r.url().replace(base, '')}`);
    });

    const started = Date.now();
    try {
      await page.goto(base + path, { waitUntil: 'networkidle', timeout: 90_000 });
    } catch (error) {
      problems.push(`${vp.name} ${path}: did not load (${error.message.split('\n')[0]})`);
      await page.close();
      continue;
    }
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 600) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(120);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    const settled = Date.now() - started;

    const overflow = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth <= width + 1) return null;
      const culprits = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= width + 1) continue;
        let clipped = false;
        for (let a = el.parentElement; a; a = a.parentElement) {
          if (getComputedStyle(a).overflowX !== 'visible') {
            clipped = true;
            break;
          }
        }
        if (!clipped) culprits.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} (${Math.round(r.right)}px)`);
      }
      return { scrollWidth: document.documentElement.scrollWidth, width, culprits: culprits.slice(0, 4) };
    });

    const name = `${vp.name}${path.replace(/[^a-z0-9]+/gi, '_') || '_home'}`;
    await page.screenshot({ path: join(out, `${name}-top.png`) });
    await page.screenshot({ path: join(out, `${name}-full.png`), fullPage: true });

    const notes = [];
    if (overflow) notes.push(`overflows sideways (${overflow.scrollWidth}px on a ${overflow.width}px screen): ${overflow.culprits.join(', ')}`);
    for (const e of [...new Set(errors)].slice(0, 5)) notes.push(e);
    for (const n of notes) problems.push(`${vp.name} ${path}: ${n}`);
    console.log(`${notes.length ? '✗' : '✓'} ${vp.name.padEnd(7)} ${path.padEnd(42)} ${String(settled).padStart(6)} ms  ${Math.round(height)}px tall`);
    await page.close();
  }
  await context.close();
}
await browser.close();

console.log(`\nScreenshots: ${out}`);
if (problems.length) {
  console.log(`\nProblems (${problems.length}):`);
  for (const p of problems) console.log(`  ${p}`);
  process.exitCode = 1;
} else {
  console.log('No problems found.');
}
