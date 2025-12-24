#!/bin/bash
# Daily scraping orchestration script
# Runs scrapers sequentially to avoid anti-bot detection

echo "======================================="
echo "🏠 Daily Property Scrape - $(date)"
echo "======================================="

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | xargs)
else
    echo "ERROR: .env file not found!"
    exit 1
fi

# Function to run command with timing
run_with_timing() {
    local cmd="$1"
    local name="$2"
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

# Run scrapers sequentially (anti-bot friendly)
failures=0

run_with_timing "npm run scrape:sold" "Sold Properties Scraper" || ((failures++))
run_with_timing "npm run scrape:listings" "Property Listings Scraper" || ((failures++))
run_with_timing "npm run scrape:rentals" "Rental Listings Scraper" || ((failures++))

if [ $failures -eq 0 ]; then
    run_with_timing "npm run consolidate" "Data Consolidation"
else
    echo "$(date '+%H:%M:%S') - ⚠️  Skipping consolidation due to scraper failures"
fi

echo "======================================="
echo "Daily scrape completed at $(date)"
if [ $failures -gt 0 ]; then
    echo "⚠️  $failures scraper(s) failed"
    exit 1
else
    echo "✅ All scrapers completed successfully"
    exit 0
fi


