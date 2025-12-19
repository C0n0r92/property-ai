# Scraper v2.0 Upgrade Notes

## What's New

This update introduces a new incremental architecture for the scraper with better data organization and workflow.

## Key Changes

### 1. New Directory Structure
```
data/
├── sold/                          # Immutable historical archives
│   ├── sold-initial.json          # Initial scrape (~200k properties)
│   ├── sold-2025-01-20.json       # Daily incremental updates
│   └── ...
├── listings/                      # Current market snapshot
│   └── listings-latest.json       # Replaced each run
├── rentals/                       # Current rental snapshot  
│   └── rentals-latest.json        # Replaced each run
└── consolidated/
    └── data.json                  # Combined output for dashboard
```

### 2. New Scripts

**Main workflow:**
- `npm run scrape:sold` - Incremental sold properties scraper (stops when caught up)
- `npm run scrape:sold:full` - Full re-scrape (creates new dated file)
- `npm run scrape:listings` - Fetch active listings via daftlistings API
- `npm run scrape:rentals` - Fetch rentals via daftlistings API
- `npm run consolidate` - Merge all data into consolidated/data.json
- `npm run update` - Run all scrapers + consolidate

**Migration:**
- `npm run migrate` - Migrate existing data to new structure

### 3. Your Existing Data is Safe

All your existing data files remain untouched:
- `data/properties.json` (28M) ✓
- `data/listings.json` (1.8M) ✓
- `data/rentals.json` (675K) ✓
- `data/data.json` (46M) ✓

## Next Steps

1. **Migrate your existing data** (optional but recommended):
   ```bash
   cd scraper
   npm run migrate
   ```
   This will COPY (not move) your existing files to the new structure:
   - `properties.json` → `sold/sold-initial.json`
   - `listings.json` → `listings/listings-latest.json`
   - `rentals.json` → `rentals/rentals-latest.json`

2. **Test the consolidation**:
   ```bash
   npm run consolidate
   ```
   This will create `data/consolidated/data.json` from all sources.

3. **Run daily updates**:
   ```bash
   npm run update
   ```
   This runs all scrapers and consolidates the data.

## Prerequisites

### For Sold Properties Scraper
- Docker with Nominatim for geocoding:
  ```bash
  docker run -d \
    -e PBF_URL=https://download.geofabrik.de/europe/ireland-and-northern-ireland-latest.osm.pbf \
    -p 8080:8080 \
    --name nominatim \
    mediagis/nominatim:4.4
  ```

### For Listings/Rentals
- Python 3.10+
- daftlistings library:
  ```bash
  pip install daftlistings
  ```

## Benefits of the New Architecture

1. **Incremental Updates**: Sold scraper stops when it catches up (no re-scraping old data)
2. **Append-only History**: Each scrape creates a new dated file (never modifies old data)
3. **Data Safety**: Historical files are immutable, easy to backup/restore
4. **Faster Updates**: Python scripts use daftlistings API (much faster than browser scraping)
5. **Better Organization**: Clear separation between sold, listings, and rentals data
6. **Resume Support**: Can interrupt and resume scrapes safely

## Legacy Scripts

Your old scripts are still available under the "LEGACY" section in package.json if you need them.
