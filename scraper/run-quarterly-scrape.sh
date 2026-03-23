#!/bin/bash
# Quarterly data import orchestration script
# Runs Python importers for infrequently-updated data
# Schedule: 1st of Jan, Apr, Jul, Oct at 5am

echo "======================================="
echo "📊 Quarterly Data Import - $(date)"
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

# Check Python environment
PIPELINE_DIR="$(dirname "$SCRIPT_DIR")/data-pipeline"

if [ ! -d "$PIPELINE_DIR" ]; then
    echo "ERROR: data-pipeline directory not found at $PIPELINE_DIR"
    exit 1
fi

cd "$PIPELINE_DIR"

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Function to run Python importer with timing
run_python_importer() {
    local importer="$1"
    local name="$2"
    echo ""
    echo "$(date '+%H:%M:%S') - Starting $name..."
    local start_time=$(date +%s)

    if python run_all.py --importer "$importer"; then
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
echo "=== Quarterly Data Importers ==="

# GTFS transit data (TFI)
run_python_importer "gtfs" "TFI GTFS Transit Data" || ((failures++))

# OPW flood zones
run_python_importer "flood" "OPW Flood Zone Data" || ((failures++))

echo ""
echo "======================================="
echo "Quarterly import completed at $(date)"
if [ $failures -gt 0 ]; then
    echo "⚠️  $failures importer(s) failed"
    exit 1
else
    echo "✅ All quarterly importers completed successfully"
    exit 0
fi
