---
name: deploy-check
description: Ship a change to irishpropertydata.com and confirm it works in production. Use when asked to deploy, release or "push live", or after merging. Covers tests, push, watching the DigitalOcean deployment, and post-deploy checks.
---

# Deploy and verify

The app (`irish-property-data`, id `6bf616a8-5bef-45c4-b458-c45331aedf05`) builds from GitHub and deploys on every push to its branch (see `doctl apps spec get <id>`, which is `main` once the feature branch is merged).

1. **Before pushing:** from `dashboard/`, run
   - `npx vitest run`
   - `npx tsc --noEmit -p .` (ignore errors under `.next/`, which are stale generated types)
   - `npx eslint` on the files you changed.
2. **Commit and push.** Never push to `main` without the user's review.
3. **Watch the deploy:** poll `doctl apps list-deployments <id> -o json` until the phase is ACTIVE or ERROR (usually 4–6 minutes). On ERROR, read the logs:
   - `doctl apps logs <id> web --type deploy --deployment <dep>`
   - `doctl apps logs <id> migrate --type deploy --deployment <dep>`
4. **Then check production:**
   - `curl` the changed pages for status 200.
   - `node scripts/seo/audit.mjs https://irishpropertydata.com` (the seo-check skill).
   - `node scripts/visual-check.mjs https://irishpropertydata.com /changed/path` (the visual-check skill).
   - If pages were added or changed: `gh workflow run seo-audit.yml`, which resubmits the sitemap to Google, sends changed pages to IndexNow and checks every page's index status. It also runs daily at 07:15 UTC.

Lessons from past deploys:
- **Health check redirects.** The platform's health check calls the container by internal IP over plain http. Middleware must not redirect requests without `x-forwarded-proto`, and `/api/health` is excluded.
- **Pre-built pages see no database.** The Docker build has no database. Any page that reads sales data needs `export const dynamic = "force-dynamic"`, or it ships seed-file figures.
- **Markdown needs `.dockerignore` care.** `.dockerignore` drops `*.md`; blog articles are re-included explicitly, so keep that rule if you add Markdown content.
- **Build-time settings:** `NEXT_PUBLIC_*` values are build-time. Changing them needs a rebuild, not just a restart.
