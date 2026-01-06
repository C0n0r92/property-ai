-- ============================================
-- Blog Votes Table Migration
-- ============================================
-- Creates table for blog post votes (thumbs up/down)
-- Run in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Blog Votes Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.blog_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_slug TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one vote per user per article
  UNIQUE(user_id, article_slug)
);

-- Indexes for blog_votes
CREATE INDEX IF NOT EXISTS idx_blog_votes_article_slug ON blog_votes(article_slug);
CREATE INDEX IF NOT EXISTS idx_blog_votes_user_id ON blog_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_votes_vote_type ON blog_votes(vote_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blog_votes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_blog_votes_updated_at
  BEFORE UPDATE ON blog_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_votes_updated_at();

-- Enable Row Level Security
ALTER TABLE blog_votes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all votes (for vote counts)
CREATE POLICY "Users can view all blog votes"
  ON blog_votes
  FOR SELECT
  USING (true);

-- Policy: Users can insert their own votes
CREATE POLICY "Users can insert their own blog votes"
  ON blog_votes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own votes
CREATE POLICY "Users can update their own blog votes"
  ON blog_votes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own votes
CREATE POLICY "Users can delete their own blog votes"
  ON blog_votes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON blog_votes TO authenticated;
GRANT SELECT ON blog_votes TO anon;






