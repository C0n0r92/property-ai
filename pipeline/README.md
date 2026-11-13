# Data pipeline

Everything about housing records lives in one Postgres database. The web app
reads from it; these jobs write to it.

| Table | What it holds | Written by |
|---|---|---|
| `sales` | Asking price and sold price for the same home. The pricing model reads this. | `import:legacy`, `match` |
| `register_sales` | Every Dublin sale in the Property Price Register since 2010 (sold price only). | `ingest:register` |
| `listings`, `listing_prices` | Homes for sale with asking price, and each price change. | `ingest:listings` |
| `real_price_homes`, `real_price_leads` | Addresses given at checkout, and email requests. | the web app |
| `ingest_runs` | One row per job run, with counts or the error. | every job |

## How new data arrives

1. `ingest:register` downloads the register's Dublin files (open data).
2. `ingest:listings` reads MyHome.ie's Dublin for-sale search pages. It checks
   `robots.txt` first, identifies itself, makes one request every 2.5 seconds
   and stops if the site answers 403 or 429.
3. `match` pairs a register sale with the listing for the same address. Each
   pair becomes a row in `sales`.

`npm run daily` runs all three in order. The web app reloads `sales` from the
database every hour, so new pairs appear without a redeploy.

## Commands

```bash
docker compose up -d db          # local database (from the repository root)
npm run migrate                  # apply db/*.sql
npm run import:legacy            # one-off: load dashboard/public/data.json
npm run ingest:register -- --all # one-off: every year since 2010
npm run daily                    # register + listings + match
npm run status                   # row counts and recent runs
```

## Filling the production database

The local database holds more than a fresh bootstrap can rebuild (listing
prices recovered from web archives), so production is filled by copying it:

```bash
# from the repository root, after creating the "gaff-db" Managed Postgres cluster
TARGET_DATABASE_URL="postgres://doadmin:...@host:25060/defaultdb?sslmode=require" \
  pipeline/scripts/copy-to-remote.sh
```

It copies every table except the addresses and email addresses typed in
while testing, prints row counts on both sides, and can be re-run.

## Running every night

`scripts/nightly.sh` runs `npm run daily` and logs to `pipeline/logs/`. On
this machine it is scheduled from crontab at 01:15 (the Mac has to be awake
and Docker running). In production the `daily-data` job in `.do/app.yaml`
does the same at 05:30 Dublin time, and the local schedule can be removed.

## Filling an empty database from scratch

```bash
DATABASE_URL="postgres://..." npm run bootstrap
```

This applies the schema, loads the existing records, imports the whole
register, collects current listings and pairs them. It takes about 15 minutes
and can be re-run safely.

`DATABASE_URL` selects the database; without it the jobs use the local
container. Set `DATABASE_SSL=disable` for a database without TLS.

## The old scrapers

`scraper/` holds the earlier Daft.ie scrapers. Daft now puts those pages
behind a security check that refuses automated visitors, so they no longer
run and nothing here depends on them.
