-- ============================================
-- Add Granular Alert Columns Migration
-- ============================================
-- Adds new columns for granular property type alerts
-- Run in Supabase SQL Editor after table exists

-- Add new columns for property type monitoring
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS monitor_sold BOOLEAN DEFAULT false;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS monitor_sale BOOLEAN DEFAULT false;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS monitor_rental BOOLEAN DEFAULT false;

-- Add sale properties configuration columns
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sale_min_bedrooms INTEGER;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sale_max_bedrooms INTEGER;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sale_min_price INTEGER;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sale_max_price INTEGER;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sale_property_types TEXT[];
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sale_alert_on_new BOOLEAN DEFAULT true;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sale_alert_on_price_drops BOOLEAN DEFAULT true;

-- Add rental properties configuration columns
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS rental_min_bedrooms INTEGER;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS rental_max_bedrooms INTEGER;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS rental_min_price INTEGER;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS rental_max_price INTEGER;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS rental_property_types TEXT[];
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS rental_alert_on_new BOOLEAN DEFAULT true;

-- Add sold properties configuration columns
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sold_min_bedrooms INTEGER;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sold_max_bedrooms INTEGER;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sold_price_threshold_percent INTEGER DEFAULT 5;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sold_alert_on_under_asking BOOLEAN DEFAULT true;
ALTER TABLE location_alerts ADD COLUMN IF NOT EXISTS sold_alert_on_over_asking BOOLEAN DEFAULT false;
