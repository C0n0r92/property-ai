-- ============================================
-- Property Reports Table Migration
-- ============================================
-- Creates table for reporting properties with wrong geo location
-- Run in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Property Reports Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.property_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN ('sold', 'listing', 'rental')),
  report_reason TEXT NOT NULL DEFAULT 'wrong_location',
  report_details TEXT,
  reported_latitude DECIMAL(10, 8),
  reported_longitude DECIMAL(11, 8),
  current_latitude DECIMAL(10, 8),
  current_longitude DECIMAL(11, 8),
  address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate reports from same user for same property
  UNIQUE(user_id, property_id, property_type)
);

-- Indexes for property_reports
CREATE INDEX IF NOT EXISTS idx_property_reports_property_id ON property_reports(property_id, property_type);
CREATE INDEX IF NOT EXISTS idx_property_reports_user_id ON property_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_property_reports_status ON property_reports(status);
CREATE INDEX IF NOT EXISTS idx_property_reports_created_at ON property_reports(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_property_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_property_reports_updated_at
  BEFORE UPDATE ON property_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_property_reports_updated_at();

-- Enable Row Level Security
ALTER TABLE property_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own reports
CREATE POLICY "Users can view their own property reports"
  ON property_reports
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own reports
CREATE POLICY "Users can insert their own property reports"
  ON property_reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all reports (assuming admin role check)
-- You may need to adjust this based on your admin role setup
CREATE POLICY "Admins can view all property reports"
  ON property_reports
  FOR SELECT
  USING (true); -- Adjust based on your admin role check

-- Grant permissions
GRANT SELECT, INSERT ON property_reports TO authenticated;
GRANT SELECT ON property_reports TO anon;






