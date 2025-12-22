-- Supabase Database Schema Migration
-- Run this SQL in your Supabase SQL Editor (Dashboard → SQL Editor)

-- ============================================
-- 1. Create public.users table
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user record on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. Create saved_properties table
-- ============================================
CREATE TABLE IF NOT EXISTS public.saved_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN ('listing', 'rental', 'sold')),
  property_data JSONB NOT NULL,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, property_id, property_type)
);

-- Enable Row Level Security
ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_properties table
CREATE POLICY "Users can view own saved properties"
  ON public.saved_properties FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Premium users can insert saved properties"
  ON public.saved_properties FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND tier = 'premium'
    )
  );

CREATE POLICY "Users can update own saved properties"
  ON public.saved_properties FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved properties"
  ON public.saved_properties FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for saved_properties
CREATE INDEX IF NOT EXISTS idx_saved_properties_user_id ON public.saved_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_properties_created_at ON public.saved_properties(created_at DESC);

-- ============================================
-- 3. Create user_events table
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (admin only access)
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- No policies means only service role can access

-- Indexes for user_events
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON public.user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_type ON public.user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON public.user_events(created_at DESC);

-- ============================================
-- 4. Create updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_saved_properties_updated_at ON public.saved_properties;
CREATE TRIGGER update_saved_properties_updated_at
  BEFORE UPDATE ON public.saved_properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Migration Complete!
-- ============================================
-- Next steps:
-- 1. Configure Google OAuth in Supabase Dashboard
-- 2. Add redirect URLs:
--    - Development: http://localhost:3000/auth/callback
--    - Production: https://irishpropertydata.com/auth/callback
-- 3. Get your Google OAuth credentials from Google Cloud Console
-- 4. Test authentication flow

