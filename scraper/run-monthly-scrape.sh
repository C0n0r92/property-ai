#!/bin/bash
# Monthly data import orchestration script
# Runs Python importers for official data sources
# Schedule: 1st of every month at 4am

echo "======================================="
echo "📆 Monthly Data Import - $(date)"
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
echo "=== Python Data Importers ==="

# CSO housing statistics
run_python_importer "cso" "CSO Housing Statistics (HPM09, HSA15, BHA02)" || ((failures++))

# BPFI mortgage data
run_python_importer "bpfi" "BPFI Mortgage Data" || ((failures++))

# BER matching (run matching against existing BER data)
run_python_importer "ber" "BER Certificate Matching" || ((failures++))

echo ""
echo "======================================="
echo "Monthly import completed at $(date)"
if [ $failures -gt 0 ]; then
    echo "⚠️  $failures importer(s) failed"
    exit 1
else
    echo "✅ All monthly importers completed successfully"
    exit 0
fi
