-- ============================================
-- Property Data Tables Migration
-- ============================================
-- Creates tables for scraped property data
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/your-project/sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Sold Properties Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.sold_properties (
  -- Primary key using address + unique identifiers
  id TEXT PRIMARY KEY,

  -- Basic property info
  address TEXT NOT NULL,
  property_type TEXT,
  beds INTEGER,
  baths INTEGER,
  area_sqm DECIMAL,

  -- Sale details
  sold_date DATE NOT NULL,
  sold_price INTEGER NOT NULL,
  asking_price INTEGER,
  over_under_percent DECIMAL,

  -- Location data
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  eircode TEXT,
  dublin_postcode TEXT,

  -- Additional data
  price_per_sqm INTEGER,
  source_url TEXT,
  source_page INTEGER,

  -- Metadata
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Full geocoding result for debugging
  nominatim_address TEXT,

  -- Yield estimation (calculated during consolidation)
  yield_estimate JSONB
);

-- Indexes for sold_properties
CREATE INDEX IF NOT EXISTS idx_sold_properties_sold_date ON sold_properties(sold_date);
CREATE INDEX IF NOT EXISTS idx_sold_properties_sold_price ON sold_properties(sold_price);
CREATE INDEX IF NOT EXISTS idx_sold_properties_beds ON sold_properties(beds);
CREATE INDEX IF NOT EXISTS idx_sold_properties_latitude_longitude ON sold_properties(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_sold_properties_dublin_postcode ON sold_properties(dublin_postcode);
CREATE INDEX IF NOT EXISTS idx_sold_properties_property_type ON sold_properties(property_type);
CREATE INDEX IF NOT EXISTS idx_sold_properties_scraped_at ON sold_properties(scraped_at);

-- ============================================
-- 2. Property Listings Table (For Sale)
-- ============================================
CREATE TABLE IF NOT EXISTS public.property_listings (
  -- Primary key using address + unique identifiers
  id TEXT PRIMARY KEY,

  -- Basic property info
  address TEXT NOT NULL,
  property_type TEXT,
  beds INTEGER,
  baths INTEGER,
  area_sqm DECIMAL,

  -- Listing details
  asking_price INTEGER NOT NULL,
  price_per_sqm INTEGER,

  -- Location data
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  eircode TEXT,
  dublin_postcode TEXT,

  -- BER rating
  ber_rating TEXT,

  -- Price tracking
  first_seen_date DATE NOT NULL,
  last_seen_date DATE NOT NULL DEFAULT CURRENT_DATE,
  days_on_market INTEGER DEFAULT 0,
  price_changes INTEGER DEFAULT 0,
  price_history JSONB DEFAULT '[]'::jsonb, -- Array of {date, price} objects

  -- Additional data
  source_url TEXT,

  -- Metadata
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Full geocoding result
  nominatim_address TEXT,

  -- Yield estimation (calculated during consolidation)
  yield_estimate JSONB
);

-- Indexes for property_listings
CREATE INDEX IF NOT EXISTS idx_property_listings_asking_price ON property_listings(asking_price);
CREATE INDEX IF NOT EXISTS idx_property_listings_beds ON property_listings(beds);
CREATE INDEX IF NOT EXISTS idx_property_listings_latitude_longitude ON property_listings(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_property_listings_dublin_postcode ON property_listings(dublin_postcode);
CREATE INDEX IF NOT EXISTS idx_property_listings_property_type ON property_listings(property_type);
CREATE INDEX IF NOT EXISTS idx_property_listings_first_seen_date ON property_listings(first_seen_date);
CREATE INDEX IF NOT EXISTS idx_property_listings_last_seen_date ON property_listings(last_seen_date);
CREATE INDEX IF NOT EXISTS idx_property_listings_scraped_at ON property_listings(scraped_at);
CREATE INDEX IF NOT EXISTS idx_property_listings_ber_rating ON property_listings(ber_rating);

-- ============================================
-- 3. Rental Listings Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.rental_listings (
  -- Primary key using address + unique identifiers
  id TEXT PRIMARY KEY,

  -- Basic property info
  address TEXT NOT NULL,
  property_type TEXT,
  beds INTEGER,
  baths INTEGER,
  area_sqm DECIMAL,

  -- Rental details
  monthly_rent INTEGER NOT NULL,
  rent_per_sqm DECIMAL,

  -- Furnishing and lease type
  furnishing TEXT, -- furnished, unfurnished, part-furnished
  lease_type TEXT, -- short-term, long-term

  -- Location data
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  eircode TEXT,
  dublin_postcode TEXT,

  -- BER rating
  ber_rating TEXT,

  -- Price tracking
  first_seen_date DATE NOT NULL,
  last_seen_date DATE NOT NULL DEFAULT CURRENT_DATE,
  days_on_market INTEGER DEFAULT 0,
  price_changes INTEGER DEFAULT 0,
  price_history JSONB DEFAULT '[]'::jsonb, -- Array of {date, rent} objects

  -- Additional data
  source_url TEXT,

  -- Metadata
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Full geocoding result
  nominatim_address TEXT,

  -- Yield estimation (calculated during consolidation)
  yield_estimate JSONB
);

-- Indexes for rental_listings
CREATE INDEX IF NOT EXISTS idx_rental_listings_monthly_rent ON rental_listings(monthly_rent);
CREATE INDEX IF NOT EXISTS idx_rental_listings_beds ON rental_listings(beds);
CREATE INDEX IF NOT EXISTS idx_rental_listings_latitude_longitude ON rental_listings(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_rental_listings_dublin_postcode ON rental_listings(dublin_postcode);
CREATE INDEX IF NOT EXISTS idx_rental_listings_property_type ON rental_listings(property_type);
CREATE INDEX IF NOT EXISTS idx_rental_listings_first_seen_date ON rental_listings(first_seen_date);
CREATE INDEX IF NOT EXISTS idx_rental_listings_last_seen_date ON rental_listings(last_seen_date);
CREATE INDEX IF NOT EXISTS idx_rental_listings_scraped_at ON rental_listings(scraped_at);
CREATE INDEX IF NOT EXISTS idx_rental_listings_furnishing ON rental_listings(furnishing);
CREATE INDEX IF NOT EXISTS idx_rental_listings_ber_rating ON rental_listings(ber_rating);

-- ============================================
-- 4. Scraper Runs Table (for monitoring)
-- ============================================
CREATE TABLE IF NOT EXISTS public.scraper_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Run details
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  run_type TEXT NOT NULL, -- 'sold', 'listings', 'rentals', 'consolidate'
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'success', 'failed'

  -- Metrics
  records_processed INTEGER DEFAULT 0,
  records_added INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Error details (if failed)
  error_message TEXT,
  error_details JSONB,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for scraper_runs
CREATE INDEX IF NOT EXISTS idx_scraper_runs_run_date ON scraper_runs(run_date);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_run_type ON scraper_runs(run_type);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_status ON scraper_runs(status);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_started_at ON scraper_runs(started_at);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================
-- Allow public read access for property data (dashboard needs this)
ALTER TABLE public.sold_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_listings ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Allow public read access to sold_properties" ON public.sold_properties
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to property_listings" ON public.property_listings
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to rental_listings" ON public.rental_listings
  FOR SELECT USING (true);

-- Allow service role full access (for scrapers)
CREATE POLICY "Allow service role full access to sold_properties" ON public.sold_properties
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to property_listings" ON public.property_listings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to rental_listings" ON public.rental_listings
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- Functions and Triggers
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_sold_properties_updated_at
  BEFORE UPDATE ON public.sold_properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_listings_updated_at
  BEFORE UPDATE ON public.property_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rental_listings_updated_at
  BEFORE UPDATE ON public.rental_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Data Validation Constraints
-- ============================================

-- Dublin bounds constraint functions
CREATE OR REPLACE FUNCTION check_dublin_bounds(lat DECIMAL, lng DECIMAL)
RETURNS BOOLEAN AS $$
BEGIN
  -- Dublin bounding box (approximate)
  RETURN (
    lat BETWEEN 53.10 AND 53.65 AND
    lng BETWEEN -6.60 AND -5.95
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Property type validation
CREATE OR REPLACE FUNCTION validate_property_type(prop_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN prop_type IN (
    'Detached', 'Semi-D', 'Terraced', 'Apartment', 'Duplex', 'Townhouse',
    'End of Terrace', 'Bungalow', 'House', 'Studio', 'Penthouse'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- Migration Notes
-- ============================================
/*
This migration creates the core data tables for the property scraper system.

Key features:
- Uses text primary keys based on address + unique identifiers (handles duplicates)
- Comprehensive indexing for performance
- Price history tracking with JSONB
- RLS policies for security
- Monitoring table for scraper health

To run this migration:
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste this entire file
3. Click "Run"

After running, the tables will be ready for data import.

Note: Run the consolidate_property_data() function after importing data to populate the consolidated_properties table.
*/

-- ============================================
-- Consolidated Data Table (Add to existing database)
-- ============================================
-- Create consolidated data table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS consolidated_properties (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  property_type TEXT NOT NULL,
  beds INTEGER,
  baths INTEGER,
  area_sqm NUMERIC,
  latitude NUMERIC,
  longitude NUMERIC,
  eircode TEXT,
  dublin_postcode TEXT,
  price_per_sqm NUMERIC,
  nominatim_address TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Sale data (if applicable)
  sold_date DATE,
  sold_price NUMERIC,
  asking_price NUMERIC,
  over_under_percent NUMERIC,
  source_url TEXT,
  source_page INTEGER,

  -- Listing data (if applicable)
  is_listing BOOLEAN DEFAULT FALSE,

  -- Rental data (if applicable)
  is_rental BOOLEAN DEFAULT FALSE,
  monthly_rent NUMERIC,
  rent_per_sqm NUMERIC,
  rent_per_bed NUMERIC,

  -- Yield calculations
  yield_estimate NUMERIC,
  yield_confidence TEXT CHECK (yield_confidence IN ('high', 'medium', 'low')),

  -- Price history (JSONB for flexible storage)
  price_history JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for consolidated table
CREATE INDEX idx_consolidated_properties_postcode ON consolidated_properties(dublin_postcode);
CREATE INDEX idx_consolidated_properties_coords ON consolidated_properties USING gist (point(longitude, latitude));
CREATE INDEX idx_consolidated_properties_type ON consolidated_properties(property_type);
CREATE INDEX idx_consolidated_properties_sold_date ON consolidated_properties(sold_date);
CREATE INDEX idx_consolidated_properties_price ON consolidated_properties(sold_price);
CREATE INDEX idx_consolidated_properties_yield ON consolidated_properties(yield_estimate);

-- Function to calculate yield estimates (create or replace)
CREATE OR REPLACE FUNCTION calculate_yield_estimate(
  property_price NUMERIC,
  property_beds INTEGER,
  property_postcode TEXT
) RETURNS NUMERIC AS $$
DECLARE
  avg_rent NUMERIC;
  yield_estimate NUMERIC;
BEGIN
  -- Calculate average rent for similar properties in the same postcode
  SELECT AVG(monthly_rent)
  INTO avg_rent
  FROM rental_listings
  WHERE dublin_postcode = property_postcode
    AND beds = property_beds
    AND scraped_at > NOW() - INTERVAL '6 months';

  -- Calculate yield if we have rental data
  IF avg_rent IS NOT NULL AND property_price > 0 THEN
    yield_estimate := (avg_rent * 12) / property_price * 100;
  END IF;

  RETURN yield_estimate;
END;
$$ LANGUAGE plpgsql;

-- Function to consolidate data (create or replace)
CREATE OR REPLACE FUNCTION consolidate_property_data() RETURNS VOID AS $$
BEGIN
  -- Clear existing consolidated data
  TRUNCATE consolidated_properties;

  -- Insert sold properties with yield calculations
  INSERT INTO consolidated_properties (
    id, address, property_type, beds, baths, area_sqm, latitude, longitude,
    eircode, dublin_postcode, price_per_sqm, nominatim_address, scraped_at,
    sold_date, sold_price, asking_price, over_under_percent, source_url, source_page,
    yield_estimate
  )
  SELECT
    sp.id, sp.address, sp.property_type, sp.beds, sp.baths, sp.area_sqm,
    sp.latitude, sp.longitude, sp.eircode, sp.dublin_postcode, sp.price_per_sqm,
    sp.nominatim_address, sp.scraped_at, sp.sold_date, sp.sold_price,
    sp.asking_price, sp.over_under_percent, sp.source_url, sp.source_page,
    calculate_yield_estimate(sp.sold_price, sp.beds, sp.dublin_postcode)
  FROM sold_properties sp;

  -- Insert property listings with yield calculations
  INSERT INTO consolidated_properties (
    id, address, property_type, beds, baths, area_sqm, latitude, longitude,
    eircode, dublin_postcode, price_per_sqm, nominatim_address, scraped_at,
    asking_price, source_url, source_page, is_listing,
    yield_estimate, price_history
  )
  SELECT
    pl.id, pl.address, pl.property_type, pl.beds, pl.baths, pl.area_sqm,
    pl.latitude, pl.longitude, pl.eircode, pl.dublin_postcode, pl.price_per_sqm,
    pl.nominatim_address, pl.scraped_at, pl.asking_price, pl.source_url,
    pl.source_page, TRUE,
    calculate_yield_estimate(pl.asking_price, pl.beds, pl.dublin_postcode),
    pl.price_history
  FROM property_listings pl;

  -- Insert rental listings
  INSERT INTO consolidated_properties (
    id, address, property_type, beds, baths, area_sqm, latitude, longitude,
    eircode, dublin_postcode, nominatim_address, scraped_at,
    is_rental, monthly_rent, rent_per_sqm, rent_per_bed,
    price_history
  )
  SELECT
    rl.id, rl.address, rl.property_type, rl.beds, rl.baths, rl.area_sqm,
    rl.latitude, rl.longitude, rl.eircode, rl.dublin_postcode,
    rl.nominatim_address, rl.scraped_at, TRUE, rl.monthly_rent,
    rl.rent_per_sqm, rl.rent_per_bed, rl.rent_history
  FROM rental_listings rl;

  -- Update yield confidence based on data quality
  UPDATE consolidated_properties
  SET yield_confidence = CASE
    WHEN yield_estimate IS NULL THEN NULL
    WHEN yield_estimate > 0 AND yield_estimate < 20 THEN 'high'
    WHEN yield_estimate >= 20 THEN 'medium'
    ELSE 'low'
  END;

END;
$$ LANGUAGE plpgsql;

-- Enable RLS on consolidated table
ALTER TABLE consolidated_properties ENABLE ROW LEVEL SECURITY;

-- RLS policies for consolidated table
CREATE POLICY "Allow public read access to consolidated_properties" ON consolidated_properties
  FOR SELECT USING (true);

CREATE POLICY "Allow service role full access to consolidated_properties" ON consolidated_properties
  FOR ALL USING (auth.role() = 'service_role');
