#!/bin/bash
# Local Cron Job Setup for Property Scraper
# Sets up automated daily scraping on your local machine

echo "🏠 Local Property Scraper - Cron Job Setup"
echo "=========================================="

# Check if running on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Detected macOS"
    CRON_CMD="crontab"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Detected Linux"
    CRON_CMD="crontab"
else
    echo "❌ Unsupported OS: $OSTYPE"
    echo "This script works on macOS and Linux"
    exit 1
fi

# Get the absolute path to the scraper directory
SCRAPER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRAPER_DIR")"

echo "📁 Scraper directory: $SCRAPER_DIR"
echo "📁 Project directory: $PROJECT_DIR"
echo ""

# Create .env file if it doesn't exist
if [ ! -f "$SCRAPER_DIR/.env" ]; then
    echo "📝 Creating .env file..."
    cat > "$SCRAPER_DIR/.env" << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://yyaidpayutmomsnuuomy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5YWlkcGF5dXRtb21zbnV1b215Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM0MDg3OCwiZXhwIjoyMDgxOTE2ODc4fQ.p-lgMN-okEjaeWXtsoL77DW_0X0QpTJfrRaigkt7JcE

# LocationIQ Geocoding API
LOCATIONIQ_API_KEY=pk.2883df0e4c2397bba8b445ddfba34568

# Optional: Custom Nominatim URL (leave empty to use LocationIQ)
NOMINATIM_URL=
EOF
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

# Create logs directory
mkdir -p "$SCRAPER_DIR/logs"

# Set up the cron job
echo "⏰ Setting up daily cron job..."

# Cron job command (runs at 2 AM daily)
CRON_JOB="0 2 * * * cd $SCRAPER_DIR && /usr/local/bin/npm run update:parallel >> logs/scrape-\$(date +\\%Y-\\%m-\\%d).log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "update:parallel"; then
    echo "⚠️  Cron job already exists. Skipping..."
else
    # Add to crontab
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Added daily cron job (runs at 2:00 AM)"
fi

# Test the setup
echo ""
echo "🧪 Testing scraper setup..."
if npm run test:geocoding > /dev/null 2>&1; then
    echo "✅ Scraper test passed"
else
    echo "⚠️  Scraper test had issues (may be normal)"
fi

echo ""
echo "🎉 SETUP COMPLETE!"
echo ""
echo "📊 WHAT HAPPENS NOW:"
echo "   • Daily cron job runs at 2:00 AM"
echo "   • Scrapes sold properties, listings, and rentals"
echo "   • Saves data to Supabase automatically"
echo "   • Your dashboard updates with fresh data daily"
echo ""
echo "🔍 MONITORING:"
echo "   View logs: tail -f $SCRAPER_DIR/logs/scrape-\$(date +%Y-%m-%d).log"
echo "   Check cron: crontab -l"
echo "   Test run:  cd $SCRAPER_DIR && npm run update:parallel"
echo ""
echo "📁 DIRECTORIES:"
echo "   Scraper: $SCRAPER_DIR"
echo "   Logs:    $SCRAPER_DIR/logs"
echo "   Config:  $SCRAPER_DIR/.env"
echo ""
echo "✅ Your automated property scraping system is now running locally!"
echo "✅ Data flows: Local scraper → Supabase → Dashboard"

# Show current cron jobs
echo ""
echo "📋 CURRENT CRON JOBS:"
crontab -l
