-- ============================================
-- Data Pipeline Tables Migration
-- ============================================
-- New tables for comprehensive property analytics:
-- - listing_history: Price/status change tracking
-- - ber_certificates: SEAI BER database
-- - planning_applications: ArcGIS planning register
-- - cso_indicators: CSO macro data
-- - bpfi_mortgages: BPFI mortgage statistics
-- - transit_stops: TFI GTFS data
-- - abp_decisions: An Bord Pleanala strategic decisions
-- - flood_zones: OPW flood risk data
--
-- Run in Supabase SQL Editor

-- Enable PostGIS if not already enabled (for geometry types)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- 1. Listing History Table (Price/Status Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS public.listing_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id text NOT NULL,                    -- Daft/MyHome listing ID
  source text NOT NULL DEFAULT 'daft',         -- daft | myhome
  scraped_at timestamptz NOT NULL,
  asking_price integer,
  status text,                                 -- for_sale | sale_agreed | sold | withdrawn
  change_type text,                            -- new | price_reduction | price_increase | sale_agreed | sold | relisted | withdrawn
  previous_price integer,
  price_change_amount integer,
  price_change_percent numeric(5,2),
  days_on_market integer,
  address text,
  latitude numeric(10, 8),
  longitude numeric(11, 8),
  property_type text,
  beds integer,
  baths integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_history_listing_id ON listing_history(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_history_scraped_at ON listing_history(scraped_at);
CREATE INDEX IF NOT EXISTS idx_listing_history_change_type ON listing_history(change_type);
CREATE INDEX IF NOT EXISTS idx_listing_history_source ON listing_history(source);
CREATE INDEX IF NOT EXISTS idx_listing_history_status ON listing_history(status);

-- ============================================
-- 2. BER Certificates Table (SEAI Database)
-- ============================================
CREATE TABLE IF NOT EXISTS public.ber_certificates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ber_number text UNIQUE,                      -- SEAI BER certificate number
  eircode text,
  address text,
  address_line_1 text,
  address_line_2 text,
  address_line_3 text,
  county text,
  ber_rating text,                             -- A1 through G
  ber_energy_value numeric,                    -- kWh/m2/yr
  carbon_dioxide numeric,                      -- kg CO2/m2/yr
  floor_area_sqm numeric,
  year_of_construction integer,
  dwelling_type text,                          -- Detached house, Semi-detached, Apartment, etc.
  dwelling_type_description text,
  type_of_rating text,                         -- New Dwelling | Existing Dwelling
  energy_rating_band text,                     -- A | B | C | D | E | F | G
  ber_issued_date date,
  ber_valid_until date,

  -- Matching fields
  matched_property_id text,                    -- FK to sold_properties if matched
  matched_listing_id text,                     -- FK to property_listings if matched
  match_confidence numeric(3,2),               -- 0.00 to 1.00

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ber_certificates_eircode ON ber_certificates(eircode);
CREATE INDEX IF NOT EXISTS idx_ber_certificates_address ON ber_certificates USING gin(to_tsvector('english', address));
CREATE INDEX IF NOT EXISTS idx_ber_certificates_ber_rating ON ber_certificates(ber_rating);
CREATE INDEX IF NOT EXISTS idx_ber_certificates_county ON ber_certificates(county);
CREATE INDEX IF NOT EXISTS idx_ber_certificates_matched_property ON ber_certificates(matched_property_id);
CREATE INDEX IF NOT EXISTS idx_ber_certificates_matched_listing ON ber_certificates(matched_listing_id);

-- ============================================
-- 3. Planning Applications Table (ArcGIS)
-- ============================================
CREATE TABLE IF NOT EXISTS public.planning_applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_ref text NOT NULL,
  source text NOT NULL,                        -- south_dublin | fingal | dcc | dun_laoghaire | national
  address text,
  description text,
  application_type text,                       -- Permission | Outline Permission | Retention | etc.
  development_type text,                       -- Residential | Commercial | Mixed Use | etc.
  decision text,                               -- Granted | Refused | Withdrawn | Pending
  decision_date date,
  received_date date,
  applicant_name text,

  -- Planning details
  units_proposed integer,                      -- Number of residential units if applicable
  floor_area_sqm numeric,

  -- Location data
  latitude numeric(10, 8),
  longitude numeric(11, 8),
  geom geometry(Point, 4326),

  -- Nearby properties (computed)
  nearby_property_ids text[],

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(application_ref, source)
);

CREATE INDEX IF NOT EXISTS idx_planning_applications_ref ON planning_applications(application_ref);
CREATE INDEX IF NOT EXISTS idx_planning_applications_source ON planning_applications(source);
CREATE INDEX IF NOT EXISTS idx_planning_applications_decision ON planning_applications(decision);
CREATE INDEX IF NOT EXISTS idx_planning_applications_decision_date ON planning_applications(decision_date);
CREATE INDEX IF NOT EXISTS idx_planning_applications_received_date ON planning_applications(received_date);
CREATE INDEX IF NOT EXISTS idx_planning_applications_geom ON planning_applications USING gist(geom);
CREATE INDEX IF NOT EXISTS idx_planning_applications_coords ON planning_applications(latitude, longitude);

-- ============================================
-- 4. CSO Indicators Table (Macro Data)
-- ============================================
CREATE TABLE IF NOT EXISTS public.cso_indicators (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id text NOT NULL,                      -- HPM09, HSA15, BHA02, etc.
  table_name text,                             -- Human-readable table name
  period text NOT NULL,                        -- 2026Q1, 2026-03, 2026M03, etc.
  period_date date,                            -- Normalized date for sorting
  region text,                                 -- Dublin, State, Cork, etc.
  metric text NOT NULL,                        -- Index value, completions, drawdowns, etc.
  value numeric,
  unit text,                                   -- Index, Number, EUR, etc.

  -- Metadata
  source_url text,
  updated_at timestamptz DEFAULT now(),

  UNIQUE(table_id, period, region, metric)
);

CREATE INDEX IF NOT EXISTS idx_cso_indicators_table_id ON cso_indicators(table_id);
CREATE INDEX IF NOT EXISTS idx_cso_indicators_period ON cso_indicators(period);
CREATE INDEX IF NOT EXISTS idx_cso_indicators_period_date ON cso_indicators(period_date);
CREATE INDEX IF NOT EXISTS idx_cso_indicators_region ON cso_indicators(region);
CREATE INDEX IF NOT EXISTS idx_cso_indicators_metric ON cso_indicators(metric);

-- ============================================
-- 5. BPFI Mortgages Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.bpfi_mortgages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  period text NOT NULL,                        -- Jan-2026, 2026-01
  period_date date,                            -- Normalized date
  county text,                                 -- Dublin, Cork, State, etc.
  buyer_type text,                             -- FTB | Mover | BTL | Refinance

  -- Approvals data
  approvals_count integer,
  approvals_value_eur bigint,
  approvals_avg_value integer,

  -- Drawdowns data
  drawdowns_count integer,
  drawdowns_value_eur bigint,
  drawdowns_avg_value integer,

  -- LTV/Term metrics
  avg_ltv_percent numeric(5,2),
  avg_term_years numeric(4,1),

  -- Metadata
  source_url text,
  updated_at timestamptz DEFAULT now(),

  UNIQUE(period, county, buyer_type)
);

CREATE INDEX IF NOT EXISTS idx_bpfi_mortgages_period ON bpfi_mortgages(period);
CREATE INDEX IF NOT EXISTS idx_bpfi_mortgages_period_date ON bpfi_mortgages(period_date);
CREATE INDEX IF NOT EXISTS idx_bpfi_mortgages_county ON bpfi_mortgages(county);
CREATE INDEX IF NOT EXISTS idx_bpfi_mortgages_buyer_type ON bpfi_mortgages(buyer_type);

-- ============================================
-- 6. Transit Stops Table (TFI GTFS)
-- ============================================
CREATE TABLE IF NOT EXISTS public.transit_stops (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  stop_id text UNIQUE NOT NULL,
  stop_code text,
  stop_name text NOT NULL,
  stop_type text,                              -- bus | dart | luas | rail | bus_eireann
  operator text,                               -- dublin_bus | go_ahead | luas | irish_rail | bus_eireann
  latitude numeric(10, 8) NOT NULL,
  longitude numeric(11, 8) NOT NULL,
  geom geometry(Point, 4326),

  -- Route information
  routes text[],                               -- Array of route IDs serving this stop
  route_count integer,

  -- Service frequency (peak hour)
  peak_frequency_mins integer,                 -- Average minutes between services at peak

  -- Zone/area
  zone text,                                   -- DART zone, Luas zone, etc.
  dublin_postcode text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transit_stops_stop_id ON transit_stops(stop_id);
CREATE INDEX IF NOT EXISTS idx_transit_stops_stop_type ON transit_stops(stop_type);
CREATE INDEX IF NOT EXISTS idx_transit_stops_operator ON transit_stops(operator);
CREATE INDEX IF NOT EXISTS idx_transit_stops_geom ON transit_stops USING gist(geom);
CREATE INDEX IF NOT EXISTS idx_transit_stops_coords ON transit_stops(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_transit_stops_dublin_postcode ON transit_stops(dublin_postcode);

-- ============================================
-- 7. An Bord Pleanala Decisions Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.abp_decisions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  case_ref text UNIQUE NOT NULL,
  case_type text,                              -- Strategic Housing Development | Normal Appeal | etc.
  location text,
  address text,
  description text,

  -- Development details
  units_count integer,                         -- Number of residential units
  floor_area_sqm numeric,
  development_type text,                       -- Residential | Commercial | Mixed Use

  -- Decision
  decision text,                               -- Granted | Refused | Withdrawn | Split Decision
  decision_date date,
  appeal_date date,

  -- Parties
  applicant text,
  planning_authority text,                     -- Original LA that made decision

  -- Location
  latitude numeric(10, 8),
  longitude numeric(11, 8),
  geom geometry(Point, 4326),
  county text,

  -- Links
  case_url text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_abp_decisions_case_ref ON abp_decisions(case_ref);
CREATE INDEX IF NOT EXISTS idx_abp_decisions_case_type ON abp_decisions(case_type);
CREATE INDEX IF NOT EXISTS idx_abp_decisions_decision ON abp_decisions(decision);
CREATE INDEX IF NOT EXISTS idx_abp_decisions_decision_date ON abp_decisions(decision_date);
CREATE INDEX IF NOT EXISTS idx_abp_decisions_county ON abp_decisions(county);
CREATE INDEX IF NOT EXISTS idx_abp_decisions_geom ON abp_decisions USING gist(geom);
CREATE INDEX IF NOT EXISTS idx_abp_decisions_units ON abp_decisions(units_count);

-- ============================================
-- 8. Flood Zones Table (OPW)
-- ============================================
CREATE TABLE IF NOT EXISTS public.flood_zones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id text,
  zone_type text NOT NULL,                     -- fluvial_high | fluvial_medium | coastal_high | coastal_medium | pluvial
  flood_scenario text,                         -- 1_in_100 | 1_in_1000 | extreme

  -- Geometry
  geom geometry(MultiPolygon, 4326),
  area_sqm numeric,

  -- Source
  source text,                                 -- opw_cfram | historic | modelled
  study_name text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flood_zones_zone_type ON flood_zones(zone_type);
CREATE INDEX IF NOT EXISTS idx_flood_zones_geom ON flood_zones USING gist(geom);
CREATE INDEX IF NOT EXISTS idx_flood_zones_scenario ON flood_zones(flood_scenario);

-- ============================================
-- 9. Alter Existing Tables
-- ============================================

-- Add source column to property_listings for multi-portal support
ALTER TABLE property_listings
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'daft';

ALTER TABLE property_listings
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'for_sale';

-- Add first_seen_at and last_seen_at with better precision
ALTER TABLE property_listings
  ADD COLUMN IF NOT EXISTS first_seen_at timestamptz;

ALTER TABLE property_listings
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Backfill first_seen_at and last_seen_at from existing date columns
UPDATE property_listings
SET first_seen_at = first_seen_date::timestamptz,
    last_seen_at = last_seen_date::timestamptz
WHERE first_seen_at IS NULL AND first_seen_date IS NOT NULL;

-- Add source to rental_listings
ALTER TABLE rental_listings
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'daft';

ALTER TABLE rental_listings
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'available';

-- Add BER matching columns to sold_properties
ALTER TABLE sold_properties
  ADD COLUMN IF NOT EXISTS matched_ber_id uuid REFERENCES ber_certificates(id);

ALTER TABLE sold_properties
  ADD COLUMN IF NOT EXISTS ber_rating text;

ALTER TABLE sold_properties
  ADD COLUMN IF NOT EXISTS ber_energy_value numeric;

-- Add BER matching to property_listings
ALTER TABLE property_listings
  ADD COLUMN IF NOT EXISTS matched_ber_id uuid REFERENCES ber_certificates(id);

-- Add transit score columns
ALTER TABLE property_listings
  ADD COLUMN IF NOT EXISTS transit_score integer;

ALTER TABLE property_listings
  ADD COLUMN IF NOT EXISTS nearest_transit_stops jsonb;

ALTER TABLE sold_properties
  ADD COLUMN IF NOT EXISTS transit_score integer;

ALTER TABLE sold_properties
  ADD COLUMN IF NOT EXISTS nearest_transit_stops jsonb;

-- Add flood risk columns
ALTER TABLE property_listings
  ADD COLUMN IF NOT EXISTS flood_risk_zone text;

ALTER TABLE property_listings
  ADD COLUMN IF NOT EXISTS flood_risk_assessed_at timestamptz;

ALTER TABLE sold_properties
  ADD COLUMN IF NOT EXISTS flood_risk_zone text;

ALTER TABLE sold_properties
  ADD COLUMN IF NOT EXISTS flood_risk_assessed_at timestamptz;

-- ============================================
-- 10. Row Level Security Policies
-- ============================================

-- Enable RLS on new tables
ALTER TABLE listing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ber_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE cso_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE bpfi_mortgages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transit_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE abp_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flood_zones ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Allow public read listing_history" ON listing_history FOR SELECT USING (true);
CREATE POLICY "Allow public read ber_certificates" ON ber_certificates FOR SELECT USING (true);
CREATE POLICY "Allow public read planning_applications" ON planning_applications FOR SELECT USING (true);
CREATE POLICY "Allow public read cso_indicators" ON cso_indicators FOR SELECT USING (true);
CREATE POLICY "Allow public read bpfi_mortgages" ON bpfi_mortgages FOR SELECT USING (true);
CREATE POLICY "Allow public read transit_stops" ON transit_stops FOR SELECT USING (true);
CREATE POLICY "Allow public read abp_decisions" ON abp_decisions FOR SELECT USING (true);
CREATE POLICY "Allow public read flood_zones" ON flood_zones FOR SELECT USING (true);

-- Service role full access
CREATE POLICY "Service role full access listing_history" ON listing_history FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access ber_certificates" ON ber_certificates FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access planning_applications" ON planning_applications FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access cso_indicators" ON cso_indicators FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access bpfi_mortgages" ON bpfi_mortgages FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access transit_stops" ON transit_stops FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access abp_decisions" ON abp_decisions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access flood_zones" ON flood_zones FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 11. Helper Functions
-- ============================================

-- Function to find nearest transit stops
CREATE OR REPLACE FUNCTION find_nearest_transit_stops(
  p_lat numeric,
  p_lng numeric,
  p_radius_km numeric DEFAULT 1.0,
  p_limit integer DEFAULT 5
) RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'stop_id', stop_id,
      'stop_name', stop_name,
      'stop_type', stop_type,
      'operator', operator,
      'distance_km', ROUND((ST_Distance(
        geom::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ) / 1000)::numeric, 2),
      'walk_time_mins', ROUND((ST_Distance(
        geom::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ) / 80)::numeric)  -- 80m per minute walking speed
    )
  ) INTO result
  FROM (
    SELECT *
    FROM transit_stops
    WHERE ST_DWithin(
      geom::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_km * 1000
    )
    ORDER BY geom <-> ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)
    LIMIT p_limit
  ) nearby;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check flood risk for a point
CREATE OR REPLACE FUNCTION check_flood_risk(
  p_lat numeric,
  p_lng numeric
) RETURNS text AS $$
DECLARE
  risk_zone text;
BEGIN
  SELECT zone_type INTO risk_zone
  FROM flood_zones
  WHERE ST_Contains(
    geom,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)
  )
  ORDER BY
    CASE zone_type
      WHEN 'fluvial_high' THEN 1
      WHEN 'coastal_high' THEN 2
      WHEN 'fluvial_medium' THEN 3
      WHEN 'coastal_medium' THEN 4
      WHEN 'pluvial' THEN 5
      ELSE 6
    END
  LIMIT 1;

  RETURN COALESCE(risk_zone, 'none');
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to find nearby planning applications
CREATE OR REPLACE FUNCTION find_nearby_planning(
  p_lat numeric,
  p_lng numeric,
  p_radius_km numeric DEFAULT 0.5,
  p_since_date date DEFAULT (CURRENT_DATE - INTERVAL '2 years')::date
) RETURNS jsonb AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'application_ref', application_ref,
        'description', LEFT(description, 200),
        'decision', decision,
        'decision_date', decision_date,
        'units_proposed', units_proposed,
        'distance_m', ROUND(ST_Distance(
          geom::geography,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        )::numeric)
      )
    )
    FROM (
      SELECT *
      FROM planning_applications
      WHERE ST_DWithin(
        geom::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        p_radius_km * 1000
      )
      AND (decision_date >= p_since_date OR decision_date IS NULL)
      ORDER BY decision_date DESC NULLS FIRST
      LIMIT 20
    ) nearby
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 12. Updated_at Triggers
-- ============================================

CREATE TRIGGER update_ber_certificates_updated_at
  BEFORE UPDATE ON ber_certificates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planning_applications_updated_at
  BEFORE UPDATE ON planning_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transit_stops_updated_at
  BEFORE UPDATE ON transit_stops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_abp_decisions_updated_at
  BEFORE UPDATE ON abp_decisions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flood_zones_updated_at
  BEFORE UPDATE ON flood_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Migration Notes
-- ============================================
/*
This migration adds comprehensive data tables for the Gaff Intel analytics platform:

1. listing_history - Tracks every price/status change for listings over time
2. ber_certificates - SEAI BER database with address matching
3. planning_applications - Planning register data from multiple councils
4. cso_indicators - CSO housing statistics (HPM09, HSA15, BHA02)
5. bpfi_mortgages - BPFI mortgage approval/drawdown data
6. transit_stops - TFI GTFS transit data with route info
7. abp_decisions - An Bord Pleanala strategic housing decisions
8. flood_zones - OPW flood risk map data

Helper functions:
- find_nearest_transit_stops(lat, lng, radius_km, limit)
- check_flood_risk(lat, lng)
- find_nearby_planning(lat, lng, radius_km, since_date)

To run this migration:
1. Go to Supabase Dashboard -> SQL Editor
2. Copy and paste this entire file
3. Click "Run"
4. Verify tables were created with: SELECT tablename FROM pg_tables WHERE schemaname = 'public';
*/
