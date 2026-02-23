# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gaff Intel is a Dublin property market analytics platform with:
- **Dashboard** (`/dashboard`): Next.js 16 web app with property data visualization, maps, blog, and mortgage tools
- **Scraper** (`/scraper`): TypeScript/Playwright data pipeline scraping Daft.ie for sold, listed, and rental properties
- **Scripts** (`/scripts`): Node.js analysis scripts for blog data generation and quality review

## Common Commands

### Dashboard (Next.js)
```bash
cd dashboard
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build (runs security check first)
npm run lint         # ESLint
```

### Scraper (TypeScript + Playwright)
```bash
cd scraper
npm run scrape:sold           # Incremental sold properties scrape
npm run scrape:sold:full      # Full re-scrape of sold properties
npm run scrape:listings       # Active for-sale listings
npm run scrape:rentals        # Rental listings
npm run consolidate           # Merge all data into unified data.json
npm run update:parallel       # Run all scrapers + consolidate in parallel
npm run upload:all            # Upload consolidated data to Supabase
```

### Blog Analysis
```bash
node scripts/analyze-blog{N}-data.js  # Generate analysis for blog N
node scripts/review-blog-quality.js   # Score blog quality (target: 80+/100)
```

## Architecture

### Data Flow
1. **Scraper pipelines** (`scraper/src/pipeline-*.ts`) use Playwright to scrape Daft.ie
2. **Consolidation** (`scraper/src/consolidate-new.ts`) merges dated JSON files, deduplicates, calculates yield estimates
3. **Output** goes to `scraper/data/consolidated/data.json` and Supabase
4. **Dashboard** loads from JSON files (production: `dashboard/public/data.json`) or falls back to Supabase

### Dashboard Structure
- **App Router**: `dashboard/src/app/` with pages for map, blog, areas, property details, mortgage tools
- **Components**: `dashboard/src/components/` including MapComponent, BlogCharts, property cards
- **Data Layer**: `dashboard/src/lib/data.ts` handles consolidated data loading with 1-hour cache
- **Types**: `dashboard/src/types/property.ts` defines Property, Listing, RentalListing, Amenity, PlanningApplication
- **API Routes**: `dashboard/src/app/api/` for properties, listings, rentals, alerts, planning, amenities

### Key Data Types
- **Property**: Sold property with soldPrice, askingPrice, overUnderPercent, beds/baths/sqm, geocoding, yieldEstimate
- **Listing**: Active for-sale with askingPrice, priceHistory for reduced listings
- **RentalListing**: Rentals with monthlyRent, availabilityStatus tracking

### External Integrations
- **Supabase**: Database for properties, listings, rentals, user alerts, blog votes
- **Mapbox**: Interactive map visualization
- **Stripe**: Payment processing for premium features
- **PostHog**: Analytics
- **ArcGIS**: Planning permissions data

## Blog Creation Process

Blogs are data-driven market analyses. See `.cursorrules` for detailed guidelines:
1. Create analysis script in `scripts/analyze-blog{N}-data.js` using `dashboard/public/data.json`
2. Write blog content in `blogs/blog{N}_{topic}.md` following structure template
3. Run quality review: `node scripts/review-blog-quality.js` (must score 80+)
4. Add to `dashboard/src/app/blog/page.tsx` (researchArticles array) and `dashboard/src/app/blog/[slug]/page.tsx` (articles object)

## Environment Variables

Required in `.env`:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `LOCATIONIQ_API_KEY` (geocoding)
