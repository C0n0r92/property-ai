---
name: seo-check
description: Audit and report on irishpropertydata.com SEO. Use after deploys, when adding pages, or when asked how the site is doing in search. Runs the crawl audit, Search Console report and PageSpeed check, then fixes what they find.
---

# SEO check

Run from the repository root.

1. `node scripts/seo/audit.mjs https://irishpropertydata.com` crawls every sitemap URL. It exits 1 on errors: non-200 pages, a missing or wrong canonical, a missing og:image, or broken links. Fix errors first. Warnings cover long titles (>70 characters), descriptions (>165), slow pages, thin text and redirecting internal links.
2. `node scripts/seo/search-console.mjs` shows clicks, queries, sitemap status and per-page index status. It needs gcloud logged in as the owner; it acts as zero-analytics@ipd-2025-481921.iam.gserviceaccount.com.
3. `node scripts/seo/pagespeed.mjs` shows Lighthouse scores and real-user Core Web Vitals.
4. After publishing new pages, run `node scripts/seo/indexnow.mjs` to tell Bing and other IndexNow engines straight away. For Google, request indexing in Search Console (there is no API for that button; the Indexing API is only for job and livestream pages, so don't use it).
5. `node scripts/seo/index-status.mjs [--submit-sitemap] [--limit N]` checks every sitemap page with the URL Inspection API (quota 2,000 a day) and lists pages with real problems (404, noindex, redirect, duplicate). The daily `SEO audit` GitHub workflow runs it with `--submit-sitemap`; its job summary shows the index count. "Discovered/crawled – currently not indexed" is Google being slow or judging the page thin, not an error: if a page stays there for weeks, make it more distinct or link to it more.

The audit also runs daily on GitHub (`.github/workflows/seo-audit.yml`); a failed run means production has an SEO error.

Conventions in this codebase:
- Pages that read sales data use `export const dynamic = "force-dynamic"`. The Docker build has no database, so pre-built pages would show seed data.
- Every page sets `alternates.canonical`. Share images come from `src/lib/og-card.tsx` via `opengraph-image.tsx` files.
- Titles that already include keywords use `title: { absolute }`, kept to 60 characters or fewer.
- Retired blog articles go in `RETIRED` in `src/lib/blog.ts`, mapped to the page that replaces them.
