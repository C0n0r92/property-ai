-- ============================================
-- Location Alerts Tables Migration
-- ============================================
-- Creates tables for property location alerts feature
-- Run in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- Location Alerts Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.location_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  location_coordinates GEOGRAPHY(POINT, 4326),
  search_radius_km INTEGER DEFAULT 2,

  -- Property Types to Monitor
  monitor_sold BOOLEAN DEFAULT false,
  monitor_sale BOOLEAN DEFAULT false,
  monitor_rental BOOLEAN DEFAULT false,

  -- Sale Properties Configuration
  sale_min_bedrooms INTEGER,
  sale_max_bedrooms INTEGER,
  sale_min_price INTEGER,
  sale_max_price INTEGER,
  sale_property_types TEXT[],
  sale_alert_on_new BOOLEAN DEFAULT true,
  sale_alert_on_price_drops BOOLEAN DEFAULT true,

  -- Rental Properties Configuration
  rental_min_bedrooms INTEGER,
  rental_max_bedrooms INTEGER,
  rental_min_price INTEGER,
  rental_max_price INTEGER,
  rental_property_types TEXT[],
  rental_alert_on_new BOOLEAN DEFAULT true,

  -- Sold Properties Configuration
  sold_min_bedrooms INTEGER,
  sold_max_bedrooms INTEGER,
  sold_price_threshold_percent INTEGER DEFAULT 5,
  sold_alert_on_under_asking BOOLEAN DEFAULT true,
  sold_alert_on_over_asking BOOLEAN DEFAULT false,

  -- Payment & Status
  stripe_payment_id TEXT UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,  -- 12 months from purchase
  last_checked TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Alert Events Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.alert_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id UUID NOT NULL REFERENCES location_alerts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('email_sent', 'email_opened', 'email_clicked', 'unsubscribed')),
  event_data JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add new columns if they don't exist (for existing tables)
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS monitor_sold BOOLEAN DEFAULT false;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS monitor_sale BOOLEAN DEFAULT false;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS monitor_rental BOOLEAN DEFAULT false;

ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sale_min_bedrooms INTEGER;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sale_max_bedrooms INTEGER;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sale_min_price INTEGER;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sale_max_price INTEGER;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sale_property_types TEXT[];
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sale_alert_on_new BOOLEAN DEFAULT true;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sale_alert_on_price_drops BOOLEAN DEFAULT true;

ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS rental_min_bedrooms INTEGER;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS rental_max_bedrooms INTEGER;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS rental_min_price INTEGER;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS rental_max_price INTEGER;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS rental_property_types TEXT[];
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS rental_alert_on_new BOOLEAN DEFAULT true;

ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sold_min_bedrooms INTEGER;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sold_max_bedrooms INTEGER;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sold_price_threshold_percent INTEGER DEFAULT 5;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sold_alert_on_under_asking BOOLEAN DEFAULT true;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sold_alert_on_over_asking BOOLEAN DEFAULT false;

-- Indexes for location_alerts
CREATE INDEX IF NOT EXISTS idx_location_alerts_user_id ON location_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_location_alerts_status ON location_alerts(status);
CREATE INDEX IF NOT EXISTS idx_location_alerts_expires_at ON location_alerts(expires_at);
CREATE INDEX IF NOT EXISTS idx_location_alerts_coordinates ON location_alerts USING GIST(location_coordinates);

-- Indexes for alert_events
CREATE INDEX IF NOT EXISTS idx_alert_events_alert_id ON alert_events(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_events_event_type ON alert_events(event_type);
CREATE INDEX IF NOT EXISTS idx_alert_events_sent_at ON alert_events(sent_at);

-- Function to update updated_at timestamp for location_alerts
CREATE OR REPLACE FUNCTION update_location_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_location_alerts_updated_at ON location_alerts;
CREATE TRIGGER update_location_alerts_updated_at
  BEFORE UPDATE ON location_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_location_alerts_updated_at();

-- Enable Row Level Security
ALTER TABLE location_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Row Level Security Policies
-- ============================================

-- Location Alerts Policies
-- Policy: Users can view their own alerts
DROP POLICY IF EXISTS "Users can view their own alerts" ON location_alerts;
CREATE POLICY "Users can view their own alerts"
  ON location_alerts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own alerts
DROP POLICY IF EXISTS "Users can insert their own alerts" ON location_alerts;
CREATE POLICY "Users can insert their own alerts"
  ON location_alerts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own alerts
DROP POLICY IF EXISTS "Users can update their own alerts" ON location_alerts;
CREATE POLICY "Users can update their own alerts"
  ON location_alerts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own alerts
DROP POLICY IF EXISTS "Users can delete their own alerts" ON location_alerts;
CREATE POLICY "Users can delete their own alerts"
  ON location_alerts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Alert Events Policies
-- Policy: Users can view events for their own alerts
DROP POLICY IF EXISTS "Users can view events for their own alerts" ON alert_events;
CREATE POLICY "Users can view events for their own alerts"
  ON alert_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM location_alerts
      WHERE location_alerts.id = alert_events.alert_id
      AND location_alerts.user_id = auth.uid()
    )
  );

-- Policy: System can insert alert events (for background job)
DROP POLICY IF EXISTS "System can insert alert events" ON alert_events;
CREATE POLICY "System can insert alert events"
  ON alert_events
  FOR INSERT
  WITH CHECK (true);  -- Allow system to create events

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON location_alerts TO authenticated;
GRANT SELECT ON location_alerts TO anon;
GRANT SELECT, INSERT ON alert_events TO authenticated;
GRANT SELECT, INSERT ON alert_events TO anon;
