#!/bin/bash
# Weekly scraping orchestration script
# Runs planning data scrapers
# Schedule: Every Sunday at 3am

echo "======================================="
echo "📅 Weekly Property Scrape - $(date)"
echo "======================================="

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "ERROR: .env file not found!"
    exit 1
fi

# Function to run command with timing
run_with_timing() {
    local cmd="$1"
    local name="$2"
    echo ""
    echo "$(date '+%H:%M:%S') - Starting $name..."
    local start_time=$(date +%s)

    if eval "$cmd"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo "$(date '+%H:%M:%S') - ✅ $name completed in ${duration}s"
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo "$(date '+%H:%M:%S') - ❌ $name failed after ${duration}s"
        return 1
    fi
}

# Track failures
failures=0

echo ""
echo "=== TypeScript Scrapers ==="

# Planning applications from Dublin councils (ArcGIS)
run_with_timing "npm run scrape:planning" "Planning Applications Scraper" || ((failures++))

# An Bord Pleanala strategic housing decisions
run_with_timing "npm run scrape:abp" "An Bord Pleanala Scraper" || ((failures++))

echo ""
echo "======================================="
echo "Weekly scrape completed at $(date)"
if [ $failures -gt 0 ]; then
    echo "⚠️  $failures scraper(s) failed"
    exit 1
else
    echo "✅ All weekly scrapers completed successfully"
    exit 0
fi
