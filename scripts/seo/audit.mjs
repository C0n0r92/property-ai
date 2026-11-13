#!/usr/bin/env node
/**
 * SEO audit: crawls every URL in the sitemap and checks what a search engine
 * would. No dependencies.
 *
 *   node scripts/seo/audit.mjs [baseUrl] [--json report.json] [--limit N]
 *
 * baseUrl defaults to https://irishpropertydata.com. Exits 1 if any error is
 * found (warnings alone do not fail), so it can run in CI.
 *
 * Per page: status 200 with no redirect, response time and size, <title> and
 * meta description lengths, a self-referencing canonical, no noindex, one h1,
 * Open Graph title/description/image (the image must load), JSON-LD that
 * parses, html lang, images without alt text, and how many words of text.
 * Across the site: duplicate titles and descriptions, and every internal link
 * followed once: links that 404 are errors, links that redirect are warnings
 * (they waste crawl budget and dilute ranking signals).
 */

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const base = (args.find((a) => /^https?:\/\//.test(a)) ?? 'https://irishpropertydata.com').replace(/\/+$/, '');
const jsonOut = flag('--json');
const limit = Number(flag('--limit') ?? Infinity);
const CONCURRENCY = 6;
const UA = 'IPD-SEO-Audit/1.0 (+https://irishpropertydata.com)';

const issues = [];
const issue = (level, url, check, detail) => issues.push({ level, url, check, detail });

async function get(url, { redirect = 'manual' } = {}) {
  const started = performance.now();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { redirect, headers: { 'user-agent': UA } });
      const body = res.headers.get('content-type')?.includes('text') || res.headers.get('content-type')?.includes('xml')
        ? await res.text()
        : (await res.arrayBuffer(), '');
      return { status: res.status, location: res.headers.get('location'), headers: res.headers, body, ms: Math.round(performance.now() - started) };
    } catch (error) {
      if (attempt === 2) return { status: 0, error: String(error), body: '', ms: 0, headers: new Headers() };
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

async function pool(items, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await worker(items[i], i);
      }
    })
  );
  return results;
}

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&nbsp;/g, ' ');
const meta = (html, attr, name) => {
  const re = new RegExp(`<meta[^>]+${attr}="${name}"[^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  return tag ? decode(tag.match(/content="([^"]*)"/i)?.[1] ?? '') : null;
};
const normalise = (u) => {
  const url = new URL(u, base);
  url.hash = '';
  return url.href.replace(/\/$/, url.pathname === '/' ? '/' : '');
};

function textWords(html) {
  const main = html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html;
  return decode(
    main
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .split(/\s+/)
    .filter((w) => /[a-z0-9€]/i.test(w)).length;
}

async function main() {
  console.log(`SEO audit of ${base}\n`);

  // robots.txt
  const robots = await get(`${base}/robots.txt`);
  if (robots.status !== 200) issue('error', '/robots.txt', 'robots', `status ${robots.status}`);
  else {
    if (!/sitemap:\s*\S+/i.test(robots.body)) issue('error', '/robots.txt', 'robots', 'no Sitemap line');
    if (/^disallow:\s*\/\s*$/im.test(robots.body)) issue('error', '/robots.txt', 'robots', 'disallows the whole site');
  }

  // sitemap
  const sitemap = await get(`${base}/sitemap.xml`);
  if (sitemap.status !== 200) {
    issue('error', '/sitemap.xml', 'sitemap', `status ${sitemap.status}`);
    return finish([]);
  }
  const urls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]).trim());
  const local = urls.map((u) => u.replace(/^https?:\/\/[^/]+/, base)).slice(0, limit);
  if (urls.some((u) => !u.startsWith('https://irishpropertydata.com'))) {
    issue('warning', '/sitemap.xml', 'sitemap', 'contains URLs outside https://irishpropertydata.com');
  }
  console.log(`${urls.length} URLs in the sitemap${local.length < urls.length ? `, checking ${local.length}` : ''}\n`);

  const links = new Map(); // internal link -> first page it was seen on
  const ogImages = new Map();
  const pages = await pool(local, async (url) => {
    const res = await get(url);
    const path = url.replace(base, '') || '/';
    const page = { url: path, status: res.status, ms: res.ms, kb: Math.round(res.body.length / 1024) };
    if (res.status !== 200) {
      issue('error', path, 'status', res.location ? `${res.status} redirect to ${res.location}` : `status ${res.status}`);
      return page;
    }
    const html = res.body;
    if (res.ms > 2500) issue('warning', path, 'speed', `server took ${res.ms} ms`);
    if (page.kb > 600) issue('warning', path, 'size', `HTML is ${page.kb} KB`);

    page.title = decode(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '');
    if (!page.title) issue('error', path, 'title', 'missing');
    else if (page.title.length > 70) issue('warning', path, 'title', `${page.title.length} characters (shown cut off past ~60): "${page.title}"`);
    else if (page.title.length < 20) issue('warning', path, 'title', `only ${page.title.length} characters: "${page.title}"`);

    page.description = meta(html, 'name', 'description') ?? '';
    if (!page.description) issue('error', path, 'description', 'missing');
    else if (page.description.length > 165) issue('warning', path, 'description', `${page.description.length} characters (cut off past ~155)`);
    else if (page.description.length < 70) issue('warning', path, 'description', `only ${page.description.length} characters`);

    const canonical = html.match(/<link[^>]+rel="canonical"[^>]*>/i)?.[0]?.match(/href="([^"]+)"/)?.[1];
    if (!canonical) issue('error', path, 'canonical', 'missing');
    else if (normalise(canonical).replace(/^https?:\/\/[^/]+/, '') !== normalise(url).replace(/^https?:\/\/[^/]+/, '')) {
      issue('error', path, 'canonical', `points elsewhere: ${canonical}`);
    } else if (!canonical.startsWith('https://irishpropertydata.com')) {
      issue('warning', path, 'canonical', `not on the live domain: ${canonical}`);
    }

    const robotsMeta = meta(html, 'name', 'robots') ?? '';
    if (/noindex/i.test(robotsMeta)) issue('error', path, 'robots', 'page is noindex but listed in the sitemap');

    const h1s = [...html.matchAll(/<h1[\s>][\s\S]*?<\/h1>/gi)];
    if (h1s.length !== 1) issue(h1s.length ? 'warning' : 'error', path, 'h1', `${h1s.length} h1 headings`);

    if (!/<html[^>]+lang="[^"]+"/i.test(html)) issue('warning', path, 'lang', 'html has no lang');

    for (const [prop, level] of [['og:title', 'warning'], ['og:description', 'warning'], ['og:image', 'error']]) {
      const v = meta(html, 'property', prop);
      if (!v) issue(level, path, 'open graph', `${prop} missing`);
      else if (prop === 'og:image') {
        const img = v.replace(/^https?:\/\/[^/]+/, base);
        if (!ogImages.has(img)) ogImages.set(img, path);
      }
    }
    if (!meta(html, 'name', 'twitter:card')) issue('warning', path, 'open graph', 'twitter:card missing');

    const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
    page.schema = [];
    for (const block of ld) {
      try {
        const data = JSON.parse(block[1]);
        const types = (data['@graph'] ?? [data]).map((d) => d['@type']).flat();
        page.schema.push(...types);
      } catch {
        issue('error', path, 'structured data', 'JSON-LD does not parse');
      }
    }
    if (!page.schema.length) issue('warning', path, 'structured data', 'none');

    const noAlt = [...html.matchAll(/<img\b(?![^>]*\balt=)[^>]*>/gi)].length;
    if (noAlt) issue('warning', path, 'images', `${noAlt} images without alt text`);

    page.words = textWords(html);
    if (page.words < 250) issue('warning', path, 'thin content', `${page.words} words of text`);

    for (const m of html.matchAll(/<a\b[^>]*href="([^"#][^"]*)"/gi)) {
      const href = decode(m[1]);
      if (/^(mailto:|tel:|javascript:)/i.test(href)) continue;
      // Cloudflare rewrites email addresses into this decoder link; it works in browsers
      if (href.startsWith('/cdn-cgi/')) continue;
      let abs;
      try {
        abs = new URL(href, url);
      } catch {
        issue('error', path, 'links', `unparseable link ${href}`);
        continue;
      }
      if (abs.origin !== new URL(base).origin && abs.hostname !== 'irishpropertydata.com') continue;
      const key = `${base}${abs.pathname}${abs.search}`;
      if (!links.has(key)) links.set(key, path);
    }
    return page;
  });

  // Every Open Graph image loads
  await pool([...ogImages], async ([img, path]) => {
    const res = await get(img, { redirect: 'follow' });
    if (res.status !== 200) issue('error', path, 'open graph', `og:image ${img.replace(base, '')} returns ${res.status}`);
  });

  // Every internal link, once
  const inSitemap = new Set(local.map((u) => normalise(u)));
  const toCheck = [...links].filter(([u]) => !inSitemap.has(normalise(u)));
  await pool(toCheck, async ([link, from]) => {
    const res = await get(link);
    const shortLink = link.replace(base, '');
    if (res.status >= 400 || res.status === 0) issue('error', from, 'broken link', `${shortLink} returns ${res.status}`);
    else if (res.status >= 300) issue('warning', from, 'redirecting link', `${shortLink} redirects to ${res.location}`);
  });

  // Duplicates across pages
  for (const field of ['title', 'description']) {
    const seen = new Map();
    for (const p of pages) if (p?.[field]) seen.set(p[field], [...(seen.get(p[field]) ?? []), p.url]);
    for (const [value, where] of seen) {
      if (where.length > 1) issue('warning', where.join(', '), `duplicate ${field}`, `"${value.slice(0, 80)}"`);
    }
  }

  return finish(pages, links.size);
}

function finish(pages, linkCount = 0) {
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');
  const ok = pages.filter((p) => p?.status === 200);
  const avg = (k) => (ok.length ? Math.round(ok.reduce((n, p) => n + (p[k] ?? 0), 0) / ok.length) : 0);

  console.log(`Pages: ${pages.length} checked, ${ok.length} OK · average ${avg('ms')} ms, ${avg('kb')} KB, ${avg('words')} words · ${linkCount} internal links followed`);
  const byCheck = new Map();
  for (const i of issues) byCheck.set(`${i.level} · ${i.check}`, (byCheck.get(`${i.level} · ${i.check}`) ?? 0) + 1);
  if (byCheck.size) {
    console.log('\nIssues by kind:');
    for (const [k, n] of [...byCheck].sort()) console.log(`  ${String(n).padStart(4)}  ${k}`);
  }
  for (const [label, list] of [['ERRORS', errors], ['WARNINGS', warnings]]) {
    if (!list.length) continue;
    console.log(`\n${label} (${list.length})`);
    for (const i of list.slice(0, 60)) console.log(`  [${i.check}] ${i.url}: ${i.detail}`);
    if (list.length > 60) console.log(`  … and ${list.length - 60} more (see --json)`);
  }
  if (!issues.length) console.log('\nNo issues found.');

  if (jsonOut) {
    import('node:fs').then((fs) =>
      fs.writeFileSync(jsonOut, JSON.stringify({ base, checkedAt: new Date().toISOString(), pages, issues }, null, 2))
    );
  }
  process.exitCode = errors.length ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 2;
});
