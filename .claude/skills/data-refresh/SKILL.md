---
name: data-refresh
description: Refresh the housing data end to end (register import, MyHome listings, web-archive backfill, matching), check the model's accuracy on it, and copy it to the production database. Use when asked to update, backfill or "get new data into" the site, or after changing the matching logic.
---

# Data refresh

All housing data lives in Postgres. The local copy is a Docker container; production is the DigitalOcean Managed Postgres `gaff-db`. Production already updates itself nightly (the `daily-data` job in `.do/app.yaml`), so a manual refresh is for backfills and logic changes.

## Steps (from the repository root)

1. `docker compose up -d db`, then `cd pipeline`.
2. `npm run daily` imports the register, collects listings and matches them. It takes about 10 minutes, mostly the polite 2.5-second delay between listing pages.
3. Backfill (optional, slow, run in the background): `ARCHIVE_DELAY_MS=1500 npm run ingest:archive -- --source wayback --from 2024-01-01`. It saves only at the end, and pages already fetched are cached in `pipeline/.cache/archive`, so re-runs are cheap. If the archive answers HTTP 429 it stops; run it again later.
4. `npm run match` twice. The second pass picks up pairs the first one unlocks.
5. `npm run status` shows row counts and recent runs.
6. **Accuracy check** (the site quotes these numbers):
   - Run `pipeline/scripts/export-sales.sh /tmp/sales.json`, then `SALES_FILE=/tmp/sales.json node scripts/backtest-real-price.mjs 2025 3`.
   - Update `dashboard/src/lib/real-price/backtest.ts` if the figures moved.
7. **Copy to production:**
   - Production's firewall allows only the app. Add your IP first: `doctl databases firewalls append fe40b553-cda8-4a96-82eb-b91eceb0ad2a --rule ip_addr:<ip>`.
   - Run `TARGET_DATABASE_URL="$(doctl databases connection fe40b553-cda8-4a96-82eb-b91eceb0ad2a --format URI --no-header)" pipeline/scripts/copy-to-remote.sh`.
   - The script keeps production's visitor tables (`real_price_homes`, `real_price_leads`) and prints row counts on both sides; they must match.
   - Remove your IP afterwards with `doctl databases firewalls remove <db> --uuid <rule>`.
8. The site reloads sales within the hour, or immediately on the next deploy.

## Watch out for
- Never print the connection string. Pipe it straight from doctl.
- Use Postgres 16 tools for restore (the script already does). Version 17 tools fail against the version 16 server.
- Monthly sale counts by `sold_date` show gaps. Winter 2025–26 was thin before the archive backfill.
