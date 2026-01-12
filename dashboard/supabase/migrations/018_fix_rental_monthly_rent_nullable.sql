-- ============================================
-- Fix Rental Listings Monthly Rent Constraint
-- ============================================
-- Make monthly_rent column nullable in rental_listings table
-- to allow for rental listings without rent information

-- Alter the monthly_rent column to allow NULL values
ALTER TABLE public.rental_listings
ALTER COLUMN monthly_rent DROP NOT NULL;

-- ============================================
-- Migration Notes
-- ============================================
/*
This migration fixes the constraint issue where rental listings
without monthly rent information were failing to insert.

The scraper will now filter out records with null monthly_rent
before attempting to insert, but we also allow null values in the
database for future flexibility.

To run this migration:
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste this file
3. Click "Run"
*/