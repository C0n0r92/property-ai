# Testing LocationIQ Integration

## Setup

1. **Get LocationIQ API Key (Free Tier)**
   - Go to https://locationiq.com/
   - Sign up (free account)
   - Get your API key from the dashboard
   - Free tier: 5,000 requests/day, 2 req/sec

2. **Set Environment Variable**
   ```bash
   export LOCATIONIQ_API_KEY=your_api_key_here
   ```

## Test Commands

### 1. Test LocationIQ Geocoding
```bash
cd scraper
nvm use 20.19.6
LOCATIONIQ_API_KEY=your_key npm run test:geocoding
```

This tests 5 real addresses from your dataset.

### 2. Test with Local Nominatim (Fallback)
```bash
# Make sure Nominatim is running: docker ps | grep nominatim
npm run test:geocoding
```

This uses your local Nominatim Docker instance (no API key needed).

### 3. Test Full Scraper with LocationIQ
```bash
# Scrape just 1 property to test end-to-end
LOCATIONIQ_API_KEY=your_key npm run scrape:sold
```

## Expected Results

✅ **Success:** Should geocode 5/5 addresses with coordinates and eircodes
✅ **Rate limiting:** Built-in 600ms delay between requests (1.6 req/sec)
✅ **Same format:** Results identical to Nominatim (lat, lng, eircode, address)

## Configuration Priority

The scraper automatically chooses:
1. **LocationIQ** if `LOCATIONIQ_API_KEY` is set
2. **Local Nominatim** otherwise (http://localhost:8080/search)

You can also override Nominatim URL:
```bash
NOMINATIM_URL=http://custom:8080/search npm run test:geocoding
```

## Rate Limits

**LocationIQ Free Tier:**
- 5,000 requests/day
- 2 requests/second

**Your daily usage estimate:**
- ~100-350 addresses/day (incremental scraping)
- Well within free tier limits

