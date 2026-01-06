-- ============================================
-- Backfill User Profiles Migration
-- ============================================
-- Creates profile records for existing users who don't have them
-- Run after the profiles table is created

-- Insert profile records for any existing auth.users that don't have profiles
INSERT INTO public.profiles (id, email)
SELECT
  au.id,
  au.email
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Update existing profile records with email if missing
UPDATE public.profiles
SET email = au.email
FROM auth.users au
WHERE public.profiles.id = au.id
AND public.profiles.email IS NULL;

-- ============================================
-- Migration Notes
-- ============================================
/*
This migration ensures all existing users have profile records.

What it does:
1. Creates profile records for users in auth.users who don't have profiles
2. Updates existing profiles with email addresses if missing

After running this migration, all authenticated users should have profile records
and the "Error fetching user data: {}" error should be resolved.

To run this migration:
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste this entire file
3. Click "Run"

This is safe to run multiple times - it only affects users without profiles.
*/

