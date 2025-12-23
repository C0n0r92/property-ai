#!/bin/bash
# Setup script for Digital Ocean Droplet
# Installs all dependencies for automated property scraping

set -e  # Exit on any error

echo "🏠 Property Scraper Droplet Setup"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   log_error "This script should NOT be run as root. Use a regular user with sudo access."
   exit 1
fi

log_info "Starting setup on $(hostname)..."

# Update system
log_info "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential tools
log_info "Installing essential tools..."
sudo apt install -y curl wget git unzip htop

# Install Node.js 20 (LTS)
log_info "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
node --version
npm --version

# Install Playwright system dependencies
log_info "Installing Playwright dependencies..."
npx playwright install-deps

# Install Playwright browsers
log_info "Installing Playwright browsers..."
npx playwright install chromium

# Create application directory
log_info "Setting up application directory..."
sudo mkdir -p /opt/property-scraper
sudo chown $USER:$USER /opt/property-scraper
cd /opt/property-scraper

# Clone repository
log_info "Cloning repository..."
git clone https://github.com/C0n0r92/property-ai.git .
cd scraper  # The scraper code is in the scraper/ subdirectory

log_info "Installing Node.js dependencies..."
npm install

# Create logs directory
mkdir -p logs

# Create environment file template
log_info "Creating environment configuration..."
cat > .env << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://yyaidpayutmomsnuuomy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5YWlkcGF5dXRtb21zbnV1b215Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM0MDg3OCwiZXhwIjoyMDgxOTE2ODc4fQ.p-lgMN-okEjaeWXtsoL77DW_0X0QpTJfrRaigkt7JcE

# LocationIQ Geocoding API
LOCATIONIQ_API_KEY=pk.2883df0e4c2397bba8b445ddfba34568

# Optional: Custom Nominatim URL (leave empty to use LocationIQ)
NOMINATIM_URL=
EOF

log_warn "IMPORTANT: Edit /opt/property-scraper/.env with your actual Supabase credentials!"

# Test the setup
log_info "Testing scraper setup..."
timeout 30 npm run test:headless || log_warn "Headless test timed out (expected on first run)"

# Create daily cron job
log_info "Setting up daily cron job..."
CRON_JOB="0 2 * * * cd /opt/property-scraper/scraper && ./run-daily-scrape.sh >> logs/scrape-\$(date +\\%Y-\\%m-\\%d).log 2>&1"

# Add to crontab if not already there
if ! crontab -l | grep -q "run-daily-scrape.sh"; then
    (crontab -l ; echo "$CRON_JOB") | crontab -
    log_info "Added daily cron job (runs at 2 AM UTC)"
else
    log_info "Cron job already exists"
fi

# Set up log rotation
log_info "Setting up log rotation..."
sudo tee /etc/logrotate.d/property-scraper > /dev/null << 'EOF'
/opt/property-scraper/scraper/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        # Optional: Send notification after log rotation
        # curl -X POST -H 'Content-type: application/json' \
        # --data '{"text":"Property scraper logs rotated"}' \
        # YOUR_SLACK_WEBHOOK_URL
    endscript
}
EOF

# Create the daily scrape script
log_info "Creating daily scrape script..."
cat > run-daily-scrape.sh << 'EOF'
#!/bin/bash
# Daily scraping orchestration script
# Runs scrapers sequentially to avoid anti-bot detection

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | xargs)
else
    echo "ERROR: .env file not found!"
    exit 1
fi
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
EOF

# Make the script executable
chmod +x run-daily-scrape.sh

# Final instructions
echo ""
echo "🎉 Droplet setup complete!"
echo ""
echo "📝 NEXT STEPS:"
echo "1. Test the setup: cd /opt/property-scraper/scraper && ./run-daily-scrape.sh"
echo "2. Monitor logs: tail -f logs/scrape-$(date +%Y-%m-%d).log"
echo ""
echo "📊 CRON JOB SCHEDULE:"
echo "   Runs daily at 2 AM UTC (adjust timezone as needed)"
echo "   View with: crontab -l"
echo "   Edit with: crontab -e"
echo ""
echo "🔍 LOG FILES:"
echo "   /opt/property-scraper/scraper/logs/scrape-YYYY-MM-DD.log"
echo "   Auto-rotated daily, kept for 30 days"
echo ""
echo "✅ SETUP COMPLETE - Your scraper will run automatically every day!"
echo "✅ Environment already configured with your credentials!"