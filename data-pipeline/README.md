# Gaff Intel Data Pipeline

Python-based data collection and processing pipeline for official Irish housing data sources.

## Overview

This pipeline complements the TypeScript scrapers in `/scraper` by importing data from official sources that provide bulk downloads or APIs rather than requiring web scraping.

### Data Sources

| Source | Type | Frequency | Importer |
|--------|------|-----------|----------|
| SEAI BER Database | Building Energy Ratings | Quarterly | `ber_importer.py` |
| CSO Data API | Housing statistics (HPM09, HSA15, BHA02) | Monthly | `cso_importer.py` |
| BPFI Publications | Mortgage approvals/drawdowns | Monthly | `bpfi_importer.py` |
| TFI GTFS | Transit stops/routes | Quarterly | `gtfs_importer.py` |
| OPW ArcGIS | Flood risk zones | Quarterly | `flood_importer.py` |

## Setup

### Prerequisites

- Python 3.9+
- Access to Supabase project (same as scraper)

### Installation

```bash
cd data-pipeline

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file in the `data-pipeline` directory (or symlink to scraper's `.env`):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
LOG_LEVEL=INFO
```

## Usage

### Run All Importers

```bash
# Run all importers
python run_all.py

# Run monthly importers (CSO, BPFI, BER matching)
python run_all.py --monthly

# Run quarterly importers (GTFS, flood)
python run_all.py --quarterly
```

### Run Individual Importers

#### CSO Housing Statistics

```bash
# Import all CSO tables (HPM09, HSA15, BHA02)
python -m importers.cso_importer

# Import specific table
python -m importers.cso_importer --table HPM09
```

#### BPFI Mortgage Data

```bash
# Auto-download latest from BPFI website
python -m importers.bpfi_importer

# Import from local Excel file
python -m importers.bpfi_importer --file path/to/mortgage-data.xlsx
```

#### BER Certificates

```bash
# Import from CSV (download from SEAI website)
python -m importers.ber_importer --file path/to/ber_database.csv

# Also run address matching
python -m importers.ber_importer --file ber_database.csv --match
```

Note: BER data must be downloaded manually from [SEAI BER Research Tool](https://ndber.seai.ie/BERResearchTool/ber/search.aspx).

#### GTFS Transit Data

```bash
# Download and import TFI GTFS
python -m importers.gtfs_importer

# Import from local file
python -m importers.gtfs_importer --file path/to/gtfs.zip
```

#### Flood Zone Data

```bash
# Import all flood layers from OPW
python -m importers.flood_importer

# Import specific layer
python -m importers.flood_importer --layer fluvial_high

# Check flood risk at a point
python -m importers.flood_importer --check 53.35 -6.26
```

### Address Matching

Run BER-to-property matching:

```bash
python -m transformers.ber_matcher

# Match with custom threshold (0-100)
python -m transformers.ber_matcher --threshold 80
```

## Database Tables

This pipeline writes to the following Supabase tables:

| Table | Source | Description |
|-------|--------|-------------|
| `cso_indicators` | CSO API | Housing price indices, completions, mortgages |
| `bpfi_mortgages` | BPFI | Mortgage approvals and drawdowns by county |
| `ber_certificates` | SEAI | Building energy ratings with address matching |
| `transit_stops` | TFI | Bus, Dart, Luas stops with routes |
| `flood_zones` | OPW | Flood risk zone polygons |

Run the migration in `scraper/migrations/019_data_pipeline_tables.sql` to create these tables.

## Architecture

```
data-pipeline/
├── config.py              # Configuration and env loading
├── run_all.py             # Orchestrator for all importers
├── requirements.txt       # Python dependencies
│
├── importers/             # Data import modules
│   ├── ber_importer.py    # SEAI BER database
│   ├── cso_importer.py    # CSO JSON-stat2 API
│   ├── bpfi_importer.py   # BPFI Excel scraper
│   ├── gtfs_importer.py   # TFI GTFS parser
│   └── flood_importer.py  # OPW ArcGIS
│
├── transformers/          # Data transformation modules
│   ├── address_matcher.py # Fuzzy address matching
│   └── ber_matcher.py     # BER-to-property matching
│
└── utils/                 # Shared utilities
    ├── supabase_client.py # Supabase wrapper with batching
    └── logger.py          # Structured logging
```

## Orchestration

The shell scripts in `/scraper` orchestrate both TypeScript and Python pipelines:

| Script | Schedule | What it runs |
|--------|----------|--------------|
| `run-daily-scrape.sh` | Daily | Daft, MyHome scrapers |
| `run-weekly-scrape.sh` | Weekly | Planning, ABP scrapers |
| `run-monthly-scrape.sh` | Monthly | CSO, BPFI, BER matching |
| `run-quarterly-scrape.sh` | Quarterly | GTFS, flood data |

### Cron Configuration

Example crontab:

```cron
# Daily at 2am - Daft/MyHome listings
0 2 * * * cd ~/property-ai/scraper && ./run-daily-scrape.sh >> logs/daily.log 2>&1

# Weekly on Sunday at 3am - Planning data
0 3 * * 0 cd ~/property-ai/scraper && ./run-weekly-scrape.sh >> logs/weekly.log 2>&1

# Monthly on 1st at 4am - Official statistics
0 4 1 * * cd ~/property-ai/scraper && ./run-monthly-scrape.sh >> logs/monthly.log 2>&1

# Quarterly (Jan, Apr, Jul, Oct) at 5am - GTFS, flood
0 5 1 1,4,7,10 * cd ~/property-ai/scraper && ./run-quarterly-scrape.sh >> logs/quarterly.log 2>&1
```

## Logging

All importers use structured logging with colored terminal output:

```
✅ [14:30:22] CSO Importer complete
   Records processed: 1,234
   Tables: 3
```

Enable debug logging:

```bash
python run_all.py --log-level DEBUG
```

Log to file:

```bash
python run_all.py --log-file pipeline.log
```

## Troubleshooting

### Common Issues

1. **"Missing Supabase configuration"**
   - Ensure `.env` file exists with correct variables
   - Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

2. **CSO API returns empty**
   - CSO occasionally changes table IDs
   - Check current table structure at data.cso.ie

3. **BPFI scraping fails**
   - BPFI website structure may have changed
   - Download Excel manually and use `--file` flag

4. **GTFS download fails**
   - TFI sometimes changes download URLs
   - Check current URL at transportforireland.ie

## Development

### Adding a New Importer

1. Create `importers/new_importer.py`
2. Implement class with `import_*()` methods
3. Add to `IMPORTERS` dict in `run_all.py`
4. Add to appropriate schedule in `SCHEDULES`
5. Update `importers/__init__.py`

### Testing

```bash
# Run with limited data
python -m importers.cso_importer --table HPM09

# Check flood risk at test point
python -m importers.flood_importer --check 53.35 -6.26
```
