#!/bin/bash
# Digital Ocean Droplet Deployment Commands
# Copy and paste these commands into your droplet's web console

echo "🚀 Starting Property Scraper Deployment..."
echo "=========================================="

# Download and run the setup script
echo "📥 Downloading setup script..."
curl -fsSL https://raw.githubusercontent.com/C0n0r92/property-ai/main/scraper/setup-droplet.sh -o setup-droplet.sh

echo "🔧 Making script executable..."
chmod +x setup-droplet.sh

echo "🚀 Running setup script..."
./setup-droplet.sh

echo "=========================================="
echo "✅ Deployment complete!"
echo ""
echo "🔍 To verify everything works:"
echo "   cd /opt/property-scraper/scraper"
echo "   ./run-daily-scrape.sh"
echo ""
echo "📊 Check cron job:"
echo "   crontab -l"
echo ""
echo "📝 View logs:"
echo "   tail -f /opt/property-scraper/scraper/logs/scrape-\$(date +%Y-%m-%d).log"
