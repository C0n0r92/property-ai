/*
Migration: 003_add_consolidated_table.sql
Description: Add consolidated_properties table with yield calculations
Date: 2025-12-23

This migration adds the consolidated_properties table to combine all property data
with automatic yield calculations. Run this after your existing tables are set up.
*/

-- ============================================
-- Consolidated Data Table
-- ============================================

-- Create consolidated data table
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

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_consolidated_properties_postcode ON consolidated_properties(dublin_postcode);
CREATE INDEX IF NOT EXISTS idx_consolidated_properties_coords ON consolidated_properties USING gist (point(longitude, latitude));
CREATE INDEX IF NOT EXISTS idx_consolidated_properties_type ON consolidated_properties(property_type);
CREATE INDEX IF NOT EXISTS idx_consolidated_properties_sold_date ON consolidated_properties(sold_date);
CREATE INDEX IF NOT EXISTS idx_consolidated_properties_price ON consolidated_properties(sold_price);
CREATE INDEX IF NOT EXISTS idx_consolidated_properties_yield ON consolidated_properties(yield_estimate);

-- Function to calculate yield estimates
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

-- Function to consolidate data
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

-- RLS policies for consolidated table (only create if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'consolidated_properties'
    AND policyname = 'Allow public read access to consolidated_properties'
  ) THEN
    CREATE POLICY "Allow public read access to consolidated_properties" ON consolidated_properties
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'consolidated_properties'
    AND policyname = 'Allow service role full access to consolidated_properties'
  ) THEN
    CREATE POLICY "Allow service role full access to consolidated_properties" ON consolidated_properties
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END;
$$;

/*
Migration completed!

Next steps:
1. This migration has been applied successfully
2. Run the consolidation script to populate the table:
   cd scraper
   npm run consolidate
3. Your dashboard will now show consolidated data with yield calculations
*/
