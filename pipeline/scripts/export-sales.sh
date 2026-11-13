#!/usr/bin/env bash
# Export the local sales table as the JSON the accuracy test reads.
#   pipeline/scripts/export-sales.sh sales.json
#   SALES_FILE=sales.json node scripts/backtest-real-price.mjs 2025 3
set -euo pipefail
out="${1:?usage: export-sales.sh <output.json>}"
docker compose exec -T db psql -U gaff -d gaff -At -c "SELECT json_agg(t) FROM (
  SELECT address, sold_date::text AS \"soldDate\", sold_price AS \"soldPrice\", asking_price AS \"askingPrice\",
         beds, property_type AS \"propertyType\", dublin_postcode AS \"dublinPostcode\", sqm AS \"areaSqm\"
    FROM sales) t" > "$out"
echo "Wrote $(wc -c < "$out" | tr -d ' ') bytes to $out"
