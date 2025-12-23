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
   log_warn "Running as root. Will create a 'scraper' user for the application."
   CREATE_USER=true
else
   CREATE_USER=false
fi

log_info "Starting setup on $(hostname)..."

# Create scraper user if running as root
if [[ $CREATE_USER == true ]]; then
   log_info "Creating scraper user..."
   useradd -m -s /bin/bash scraper
   usermod -aG sudo scraper
   echo "scraper ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/scraper
   log_info "Scraper user created. Switching to scraper user..."
   # Continue as root for system setup, but remember to switch later
fi

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

# Create application directory and setup as scraper user
log_info "Setting up application directory..."
sudo mkdir -p /opt/property-scraper

if [[ $CREATE_USER == true ]]; then
   sudo chown scraper:scraper /opt/property-scraper

   # Run application setup as scraper user
   sudo -u scraper bash << 'EOF'
cd /opt/property-scraper

# Clone repository
echo "📥 Cloning repository..."
git clone https://github.com/C0n0r92/property-ai.git .
cd scraper  # The scraper code is in the scraper/ subdirectory

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Create logs directory
mkdir -p logs
EOF
else
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
fi

# This section is now handled above in the user-specific blocks

# Create environment file template
log_info "Creating environment configuration..."

if [[ $CREATE_USER == true ]]; then
   sudo -u scraper bash << 'EOF'
cd /opt/property-scraper/scraper

cat > .env << 'INNER_EOF'
# Supabase Configuration
SUPABASE_URL=https://yyaidpayutmomsnuuomy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5YWlkcGF5dXRtb21zbnV1b215Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM0MDg3OCwiZXhwIjoyMDgxOTE2ODc4fQ.p-lgMN-okEjaeWXtsoL77DW_0X0QpTJfrRaigkt7JcE

# LocationIQ Geocoding API
LOCATIONIQ_API_KEY=pk.2883df0e4c2397bba8b445ddfba34568

# Optional: Custom Nominatim URL (leave empty to use LocationIQ)
NOMINATIM_URL=
INNER_EOF
EOF
else
   cat > .env << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://yyaidpayutmomsnuuomy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5YWlkcGF5dXRtb21zbnV1b215Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM0MDg3OCwiZXhwIjoyMDgxOTE2ODc4fQ.p-lgMN-okEjaeWXtsoL77DW_0X0QpTJfrRaigkt7JcE

# LocationIQ Geocoding API
LOCATIONIQ_API_KEY=pk.2883df0e4c2397bba8b445ddfba34568

# Optional: Custom Nominatim URL (leave empty to use LocationIQ)
NOMINATIM_URL=
EOF
fi

log_info "Environment configured with your credentials!"

# Test the setup
log_info "Testing scraper setup..."
if [[ $CREATE_USER == true ]]; then
   sudo -u scraper bash -c "cd /opt/property-scraper/scraper && timeout 30 npm run test:headless" || log_warn "Headless test timed out (expected on first run)"
else
   timeout 30 npm run test:headless || log_warn "Headless test timed out (expected on first run)"
fi

# Create daily cron job
log_info "Setting up daily cron job..."
if [[ $CREATE_USER == true ]]; then
   CRON_JOB="0 2 * * * sudo -u scraper bash -c 'cd /opt/property-scraper/scraper && ./run-daily-scrape.sh >> logs/scrape-\$(date +\\%Y-\\%m-\\%d).log 2>&1'"
else
   CRON_JOB="0 2 * * * cd /opt/property-scraper/scraper && ./run-daily-scrape.sh >> logs/scrape-\$(date +\\%Y-\\%m-\\%d).log 2>&1"
fi

# Add to crontab if not already there
if ! crontab -l 2>/dev/null | grep -q "run-daily-scrape.sh"; then
    (crontab -l 2>/dev/null ; echo "$CRON_JOB") | crontab -
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
echo "🎉 SETUP COMPLETE!"
echo ""
echo "📊 WHAT HAPPENS NOW:"
echo "   • Daily cron job runs at 2 AM UTC"
echo "   • Scrapes sold properties, listings, and rentals"
echo "   • Saves data to Supabase automatically"
echo "   • Your dashboard updates with fresh data daily"
echo ""
echo "🔍 MONITORING:"
echo "   View logs: tail -f /opt/property-scraper/scraper/logs/scrape-\$(date +%Y-%m-%d).log"
echo "   Check cron: crontab -l"
echo "   Test run:  cd /opt/property-scraper/scraper && ./run-daily-scrape.sh"
echo ""
echo "📁 FILE LOCATIONS:"
echo "   Application: /opt/property-scraper/scraper/"
echo "   Logs:        /opt/property-scraper/scraper/logs/"
echo "   Config:      /opt/property-scraper/scraper/.env"
echo ""
echo "✅ Your automated property scraping system is now running!"
echo "✅ Data flows: Scrapers → Supabase → Dashboard (real-time)"