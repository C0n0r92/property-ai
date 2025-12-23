/*
CLEAN DATABASE RESET - Drop everything and recreate properly
Run this to start fresh with the correct schema
*/

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS consolidated_properties CASCADE;
DROP TABLE IF EXISTS rental_listings CASCADE;
DROP TABLE IF EXISTS property_listings CASCADE;
DROP TABLE IF EXISTS sold_properties CASCADE;
DROP TABLE IF EXISTS scraper_runs CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_yield_estimate() CASCADE;
DROP FUNCTION IF EXISTS consolidate_property_data() CASCADE;

-- Now recreate everything with the correct schema
-- ============================================
-- Property Data Tables
-- ============================================

-- Scraper runs tracking
CREATE TABLE scraper_runs (
  id SERIAL PRIMARY KEY,
  scraper_type TEXT NOT NULL, -- 'sold', 'listings', 'rentals'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  records_processed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed'
  error_message TEXT,
  pages_scraped INTEGER DEFAULT 0
);

-- Sold properties table
CREATE TABLE sold_properties (
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
  sold_date DATE,
  sold_price NUMERIC NOT NULL,
  asking_price NUMERIC,
  over_under_percent NUMERIC,
  source_url TEXT,
  source_page INTEGER,
  yield_estimate NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property listings table
CREATE TABLE property_listings (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  property_type TEXT,
  beds INTEGER,
  baths INTEGER,
  area_sqm DECIMAL,
  asking_price INTEGER NOT NULL,
  price_per_sqm INTEGER,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  eircode TEXT,
  dublin_postcode TEXT,
  ber_rating TEXT,
  first_seen_date DATE NOT NULL,
  last_seen_date DATE NOT NULL DEFAULT CURRENT_DATE,
  days_on_market INTEGER DEFAULT 0,
  price_changes INTEGER DEFAULT 0,
  price_history JSONB DEFAULT '[]'::jsonb,
  source_url TEXT,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nominatim_address TEXT,
  yield_estimate NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rental listings table
CREATE TABLE rental_listings (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  property_type TEXT,
  beds INTEGER,
  baths INTEGER,
  area_sqm DECIMAL,
  monthly_rent INTEGER NOT NULL,
  rent_per_sqm DECIMAL,
  furnishing TEXT,
  lease_type TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  eircode TEXT,
  dublin_postcode TEXT,
  ber_rating TEXT,
  first_seen_date DATE NOT NULL,
  last_seen_date DATE NOT NULL DEFAULT CURRENT_DATE,
  days_on_market INTEGER DEFAULT 0,
  price_changes INTEGER DEFAULT 0,
  price_history JSONB DEFAULT '[]'::jsonb,
  source_url TEXT,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nominatim_address TEXT,
  yield_estimate NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create consolidated data table
CREATE TABLE consolidated_properties (
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

  -- Yield calculations
  yield_estimate NUMERIC,
  yield_confidence TEXT CHECK (yield_confidence IN ('high', 'medium', 'low')),

  -- Price history (JSONB for flexible storage)
  price_history JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================

-- Scraper runs
CREATE INDEX idx_scraper_runs_started_at ON scraper_runs(started_at);

-- Sold properties
CREATE INDEX idx_sold_properties_postcode ON sold_properties(dublin_postcode);
CREATE INDEX idx_sold_properties_coords ON sold_properties USING gist (point(longitude, latitude));
CREATE INDEX idx_sold_properties_type ON sold_properties(property_type);
CREATE INDEX idx_sold_properties_sold_date ON sold_properties(sold_date);
CREATE INDEX idx_sold_properties_price ON sold_properties(sold_price);

-- Property listings
CREATE INDEX idx_property_listings_postcode ON property_listings(dublin_postcode);
CREATE INDEX idx_property_listings_coords ON property_listings USING gist (point(longitude, latitude));
CREATE INDEX idx_property_listings_type ON property_listings(property_type);
CREATE INDEX idx_property_listings_price ON property_listings(asking_price);

-- Rental listings
CREATE INDEX idx_rental_listings_postcode ON rental_listings(dublin_postcode);
CREATE INDEX idx_rental_listings_coords ON rental_listings USING gist (point(longitude, latitude));
CREATE INDEX idx_rental_listings_type ON rental_listings(property_type);
CREATE INDEX idx_rental_listings_rent ON rental_listings(monthly_rent);

-- Consolidated properties
CREATE INDEX idx_consolidated_properties_postcode ON consolidated_properties(dublin_postcode);
CREATE INDEX idx_consolidated_properties_coords ON consolidated_properties USING gist (point(longitude, latitude));
CREATE INDEX idx_consolidated_properties_type ON consolidated_properties(property_type);
CREATE INDEX idx_consolidated_properties_sold_date ON consolidated_properties(sold_date);
CREATE INDEX idx_consolidated_properties_price ON consolidated_properties(sold_price);
CREATE INDEX idx_consolidated_properties_yield ON consolidated_properties(yield_estimate);

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
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_sold_properties_updated_at
  BEFORE UPDATE ON public.sold_properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_listings_updated_at
  BEFORE UPDATE ON public.property_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rental_listings_updated_at
  BEFORE UPDATE ON public.rental_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consolidated_properties_updated_at
  BEFORE UPDATE ON public.consolidated_properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
    asking_price, source_url, is_listing,
    yield_estimate, price_history
  )
  SELECT
    pl.id, pl.address, pl.property_type, pl.beds, pl.baths, pl.area_sqm,
    pl.latitude, pl.longitude, pl.eircode, pl.dublin_postcode, pl.price_per_sqm,
    pl.nominatim_address, pl.scraped_at, pl.asking_price, pl.source_url,
    TRUE,
    calculate_yield_estimate(pl.asking_price, pl.beds, pl.dublin_postcode),
    pl.price_history
  FROM property_listings pl;

  -- Insert rental listings
  INSERT INTO consolidated_properties (
    id, address, property_type, beds, baths, area_sqm, latitude, longitude,
    eircode, dublin_postcode, nominatim_address, scraped_at,
    is_rental, monthly_rent, rent_per_sqm,
    price_history
  )
  SELECT
    rl.id, rl.address, rl.property_type, rl.beds, rl.baths, rl.area_sqm,
    rl.latitude, rl.longitude, rl.eircode, rl.dublin_postcode,
    rl.nominatim_address, rl.scraped_at, TRUE, rl.monthly_rent,
    rl.rent_per_sqm, rl.price_history
  FROM rental_listings rl;

  -- Update yield confidence based on data quality
  UPDATE consolidated_properties
  SET yield_confidence = CASE
    WHEN yield_estimate IS NULL THEN NULL
    WHEN yield_estimate > 0 AND yield_estimate < 20 THEN 'high'
    WHEN yield_estimate >= 20 THEN 'medium'
    ELSE 'low'
  END
  WHERE true;

END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Allow public read access for property data (dashboard needs this)
ALTER TABLE public.sold_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consolidated_properties ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Allow public read access to sold_properties" ON public.sold_properties
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to property_listings" ON public.property_listings
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to rental_listings" ON public.rental_listings
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to consolidated_properties" ON public.consolidated_properties
  FOR SELECT USING (true);

-- Allow service role full access (for scrapers)
CREATE POLICY "Allow service role full access to sold_properties" ON public.sold_properties
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to property_listings" ON public.property_listings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to rental_listings" ON public.rental_listings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to consolidated_properties" ON public.consolidated_properties
  FOR ALL USING (auth.role() = 'service_role');

/*
CLEAN RESET COMPLETE!

Next steps:
1. The database has been reset with the correct schema
2. Run: npm run initial-migration (to import existing JSON data)
3. Run: npm run consolidate (to create consolidated table with yields)
4. Your dashboard will show all data with yield calculations
*/
