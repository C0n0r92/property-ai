#!/usr/bin/env bash
# Copy the local database (docker compose service "db") into a managed one.
#
#   TARGET_DATABASE_URL="postgres://doadmin:...@host:25060/defaultdb?sslmode=require" \
#     pipeline/scripts/copy-to-remote.sh
#
# Everything is copied except real_price_homes, real_price_leads and
# sold_alerts: those hold addresses and email addresses visitors gave. Local test rows never go
# to production, and production's own rows are never overwritten.
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

# Visitors' records (addresses at checkout, email requests, sold-price
# alerts) live only in production. A table the target already has is left
# untouched; on a fresh database only its (empty) structure is copied.
VISITOR_TABLES="real_price_homes real_price_leads sold_alerts"
SKIP=()
for t in $VISITOR_TABLES; do
  HAS="$(docker run --rm postgres:16-alpine psql "$TARGET_DATABASE_URL" -Atc \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$t'")"
  if [[ "$HAS" == "1" ]]; then
    # Its id sequence too: restoring it with --clean would try to drop the
    # sequence the target's table still uses, and stop the copy part-way
    SKIP+=(--exclude-table="$t" --exclude-table="${t}_*_seq")
    echo "Keeping the target's own $t ($(docker run --rm postgres:16-alpine psql "$TARGET_DATABASE_URL" -Atc "SELECT count(*) FROM $t") rows)."
  else
    SKIP+=(--exclude-table-data="$t")
  fi
done

echo "Copying..."
docker compose exec -T db pg_dump -U gaff -d gaff --format=custom --no-owner --no-privileges "${SKIP[@]}" \
  | docker run --rm -i postgres:16-alpine pg_restore --no-owner --no-privileges --clean --if-exists \
    --exit-on-error -d "$TARGET_DATABASE_URL"

echo "Managed database row counts:"
docker run --rm postgres:16-alpine psql "$TARGET_DATABASE_URL" -Atc \
  "SELECT 'sales ' || count(*) FROM sales UNION ALL SELECT 'register_sales ' || count(*) FROM register_sales UNION ALL SELECT 'listings ' || count(*) FROM listings UNION ALL SELECT 'listing_prices ' || count(*) FROM listing_prices"
