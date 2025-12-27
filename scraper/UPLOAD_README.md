# Supabase Upload Script

A generic script to upload scraped property data from JSON files to Supabase.

## Overview

This script provides a clean separation between data collection (scrapers) and data storage (Supabase uploads). Scrapers focus on collecting data reliably to JSON files, while uploads handle the database operations separately.

## Features

- **Reliable Data Collection**: Scrapers save to JSON files, ensuring data is never lost due to database issues
- **Flexible Uploads**: Upload specific data types or all data at once
- **Batch Processing**: Handles large datasets with configurable batch sizes
- **Error Handling**: Continues processing even if some uploads fail
- **Progress Tracking**: Shows detailed progress for each upload operation

## Usage

### Individual Data Types

```bash
# Upload sold properties
npm run upload:sold

# Upload property listings
npm run upload:listings

# Upload rental listings
npm run upload:rentals
```

### Upload All Data

```bash
# Upload all data types
npm run upload:all
```

## Data Flow

1. **Scrapers** collect data and save to `data/{type}/{type}-{date}.json`
2. **Upload script** reads the latest JSON files for each data type
3. **Database operations** handle upserts with proper conflict resolution
4. **Progress reporting** shows results for each operation

## File Structure

```
data/
├── sold/
│   ├── sold-2025-12-27.json
│   └── sold-2025-12-26.json
├── listings/
│   ├── listings-2025-12-27.json
│   └── listings-2025-12-26.json
└── rentals/
    ├── rentals-2025-12-27.json
    └── rentals-2025-12-26.json
```

## Error Handling

- **Network Issues**: Automatic retry with exponential backoff
- **Schema Mismatches**: Clear error messages for field mapping issues
- **Partial Failures**: Continues processing other records even if some fail
- **Batch Size**: Reduced to 50 records to avoid headers overflow

## Architecture Benefits

### Before (Coupled)
```
Scraper → Database Upsert
❌ If DB fails, data is lost
❌ Hard to debug DB issues
❌ Scrapers blocked by DB problems
```

### After (Separated)
```
Scraper → JSON Files → Upload Script → Database
✅ Data always preserved in JSON
✅ Easy to retry failed uploads
✅ Scrapers run independently
✅ Separate debugging for each concern
```

## Monitoring

The script provides detailed output including:
- Files loaded and record counts
- Batch processing progress
- Insert/update/failure counts
- Error details for troubleshooting

## Configuration

- **Batch Size**: 50 records (configurable in database.ts)
- **File Selection**: Automatically uses most recent files
- **Conflict Resolution**: Upsert based on ID with conflict resolution

## Dependencies

Requires the existing database and environment setup:
- Supabase credentials in `.env`
- Database schema matching the expected interfaces
- Network connectivity to Supabase
