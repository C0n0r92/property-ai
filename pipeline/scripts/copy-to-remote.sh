#!/usr/bin/env bash
# Copy the local database (docker compose service "db") into a managed one.
#
#   TARGET_DATABASE_URL="postgres://doadmin:...@host:25060/defaultdb?sslmode=require" \
#     pipeline/scripts/copy-to-remote.sh
#
# Everything is copied except the rows of real_price_homes and
# real_price_leads: those hold addresses and email addresses typed in while
# testing locally, and production starts with them empty.
#
# Existing tables in the target are replaced, so it can be re-run. Run it from
# the repository root. Needs Docker; no local Postgres tools are required.
set -euo pipefail

if [[ -z "${TARGET_DATABASE_URL:-}" ]]; then
  echo "Set TARGET_DATABASE_URL to the managed database's connection string." >&2
  exit 1
fi
case "$TARGET_DATABASE_URL" in
  *localhost*|*127.0.0.1*) echo "TARGET_DATABASE_URL points at this machine; expected the managed database." >&2; exit 1 ;;
esac

echo "Local row counts:"
docker compose exec -T db psql -U gaff -d gaff -Atc \
  "SELECT 'sales ' || count(*) FROM sales UNION ALL SELECT 'register_sales ' || count(*) FROM register_sales UNION ALL SELECT 'listings ' || count(*) FROM listings UNION ALL SELECT 'listing_prices ' || count(*) FROM listing_prices"

echo "Copying..."
docker compose exec -T db pg_dump -U gaff -d gaff --format=custom --no-owner --no-privileges \
    --exclude-table-data=real_price_homes --exclude-table-data=real_price_leads \
  | docker run --rm -i postgres:16-alpine pg_restore --no-owner --no-privileges --clean --if-exists \
    --exit-on-error -d "$TARGET_DATABASE_URL"

echo "Managed database row counts:"
docker run --rm postgres:16-alpine psql "$TARGET_DATABASE_URL" -Atc \
  "SELECT 'sales ' || count(*) FROM sales UNION ALL SELECT 'register_sales ' || count(*) FROM register_sales UNION ALL SELECT 'listings ' || count(*) FROM listings UNION ALL SELECT 'listing_prices ' || count(*) FROM listing_prices"
