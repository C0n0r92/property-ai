-- ============================================
-- Saved Properties Table Migration
-- ============================================
-- Creates table for user-saved properties feature
-- Run in Supabase SQL Editor

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Saved Properties Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.saved_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN ('listing', 'rental', 'sold')),
  property_data JSONB NOT NULL,
  notes TEXT,

  -- Metadata (optional additional data)
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique property per user (prevent duplicates)
  UNIQUE(user_id, property_id, property_type)
);

-- Indexes for saved_properties
CREATE INDEX IF NOT EXISTS idx_saved_properties_user_id ON saved_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_properties_property_id ON saved_properties(property_id);
CREATE INDEX IF NOT EXISTS idx_saved_properties_property_type ON saved_properties(property_type);
CREATE INDEX IF NOT EXISTS idx_saved_properties_created_at ON saved_properties(created_at);

-- Function to update updated_at timestamp for saved_properties
CREATE OR REPLACE FUNCTION update_saved_properties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_saved_properties_updated_at ON saved_properties;
CREATE TRIGGER update_saved_properties_updated_at
  BEFORE UPDATE ON saved_properties
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_properties_updated_at();

-- Enable Row Level Security
ALTER TABLE saved_properties ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Row Level Security Policies
-- ============================================

-- Policy: Users can view their own saved properties
DROP POLICY IF EXISTS "Users can view their own saved properties" ON saved_properties;
CREATE POLICY "Users can view their own saved properties"
  ON saved_properties
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own saved properties
DROP POLICY IF EXISTS "Users can insert their own saved properties" ON saved_properties;
CREATE POLICY "Users can insert their own saved properties"
  ON saved_properties
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own saved properties
DROP POLICY IF EXISTS "Users can update their own saved properties" ON saved_properties;
CREATE POLICY "Users can update their own saved properties"
  ON saved_properties
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own saved properties
DROP POLICY IF EXISTS "Users can delete their own saved properties" ON saved_properties;
CREATE POLICY "Users can delete their own saved properties"
  ON saved_properties
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON saved_properties TO authenticated;
GRANT SELECT ON saved_properties TO anon;

-- ============================================
-- Migration Notes
-- ============================================
/*
This migration creates the saved_properties table for the property saving feature.

Key features:
- UUID primary key with auto-generation
- Foreign key to auth.users
- Unique constraint prevents duplicate saves per user
- JSONB for flexible property data storage
- Optional notes and metadata fields
- Comprehensive RLS policies for data security
- Automatic timestamp updates

To run this migration:
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste this entire file
3. Click "Run"

After running, the saved properties feature will work properly.
*/

