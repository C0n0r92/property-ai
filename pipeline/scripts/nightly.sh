#!/usr/bin/env bash
# Nightly data run on this machine: register import, listing collection and
# matching (npm run daily), into the local database unless DATABASE_URL says
# otherwise. Scheduled from crontab:
#
#   15 1 * * * /Users/conormcloughlin/property-ai/pipeline/scripts/nightly.sh
#
# Output goes to pipeline/logs/nightly-YYYY-MM-DD.log; logs older than 30
# days are removed. In production the same work runs as the "daily-data"
# scheduled job in .do/app.yaml, and this script is no longer needed.
set -uo pipefail

# cron starts with a bare PATH
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

PIPELINE="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(dirname "$PIPELINE")"
LOGS="$PIPELINE/logs"
mkdir -p "$LOGS"
LOG="$LOGS/nightly-$(date +%F).log"

# Only one run at a time
LOCK="$LOGS/.nightly.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "$(date '+%F %T') another nightly run is still going; skipping" >>"$LOG"
  exit 0
fi
trap 'rmdir "$LOCK"' EXIT

find "$LOGS" -name 'nightly-*.log' -mtime +30 -delete 2>/dev/null

{
  echo "=== nightly run $(date '+%F %T')"

  if [[ -z "${DATABASE_URL:-}" ]]; then
    # The local database runs in Docker; start it if it is not up
    if ! docker info >/dev/null 2>&1; then
      echo "Docker is not running, so the local database is unavailable. Stopping."
      exit 1
    fi
    (cd "$ROOT" && docker compose up -d --wait db) || { echo "Could not start the database."; exit 1; }
  fi

  cd "$PIPELINE" && npm run -s daily
  status=$?
  npm run -s status 2>&1 | head -4
  echo "=== finished $(date '+%F %T') (exit $status)"
  exit $status
} >>"$LOG" 2>&1
