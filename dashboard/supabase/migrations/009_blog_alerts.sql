-- ============================================
-- Blog Alerts Table Migration
-- ============================================
-- Creates table for blog alert subscriptions
-- Users pay €3 for lifetime blog alert notifications

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Blog Alerts Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.blog_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Payment & Status
  stripe_payment_id TEXT UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired')),
  expires_at TIMESTAMPTZ,  -- For blog alerts, this could be null (lifetime) or set if we want to expire them

  -- Alert preferences
  alert_categories TEXT[] DEFAULT ARRAY[]::TEXT[], -- Selected blog categories (e.g., ['Tool Guide', 'Market Analysis'])
  alert_tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- Selected blog tags (e.g., ['Bidding Strategy', 'Property Analysis'])
  alert_all BOOLEAN DEFAULT true, -- If true, get alerts for all blogs regardless of categories/tags

  -- Subscription details
  notification_frequency TEXT DEFAULT 'immediate' CHECK (notification_frequency IN ('immediate', 'daily', 'weekly')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Blog Alert Events Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.blog_alert_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id UUID NOT NULL REFERENCES blog_alerts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('email_sent', 'email_opened', 'email_clicked', 'unsubscribed')),
  event_data JSONB DEFAULT '{}',
  blog_slug TEXT, -- Reference to the blog that triggered the alert
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for blog_alerts
CREATE INDEX IF NOT EXISTS idx_blog_alerts_user_id ON blog_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_alerts_status ON blog_alerts(status);
CREATE INDEX IF NOT EXISTS idx_blog_alerts_expires_at ON blog_alerts(expires_at);

-- Indexes for blog_alert_events
CREATE INDEX IF NOT EXISTS idx_blog_alert_events_alert_id ON blog_alert_events(alert_id);
CREATE INDEX IF NOT EXISTS idx_blog_alert_events_event_type ON blog_alert_events(event_type);
CREATE INDEX IF NOT EXISTS idx_blog_alert_events_sent_at ON blog_alert_events(sent_at);
CREATE INDEX IF NOT EXISTS idx_blog_alert_events_blog_slug ON blog_alert_events(blog_slug);

-- Function to update updated_at timestamp for blog_alerts
CREATE OR REPLACE FUNCTION update_blog_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_blog_alerts_updated_at ON blog_alerts;
CREATE TRIGGER update_blog_alerts_updated_at
  BEFORE UPDATE ON blog_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_alerts_updated_at();

-- Enable Row Level Security
ALTER TABLE blog_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_alert_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Row Level Security Policies
-- ============================================

-- Blog Alerts Policies
-- Policy: Users can view their own blog alerts
DROP POLICY IF EXISTS "Users can view their own blog alerts" ON blog_alerts;
CREATE POLICY "Users can view their own blog alerts"
  ON blog_alerts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own blog alerts
DROP POLICY IF EXISTS "Users can insert their own blog alerts" ON blog_alerts;
CREATE POLICY "Users can insert their own blog alerts"
  ON blog_alerts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own blog alerts
DROP POLICY IF EXISTS "Users can update their own blog alerts" ON blog_alerts;
CREATE POLICY "Users can update their own blog alerts"
  ON blog_alerts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own blog alerts
DROP POLICY IF EXISTS "Users can delete their own blog alerts" ON blog_alerts;
CREATE POLICY "Users can delete their own blog alerts"
  ON blog_alerts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Blog Alert Events Policies
-- Policy: Users can view events for their own blog alerts
DROP POLICY IF EXISTS "Users can view events for their own blog alerts" ON blog_alert_events;
CREATE POLICY "Users can view events for their own blog alerts"
  ON blog_alert_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blog_alerts
      WHERE blog_alerts.id = blog_alert_events.alert_id
      AND blog_alerts.user_id = auth.uid()
    )
  );

-- Policy: System can insert blog alert events (for background job)
DROP POLICY IF EXISTS "System can insert blog alert events" ON blog_alert_events;
CREATE POLICY "System can insert blog alert events"
  ON blog_alert_events
  FOR INSERT
  WITH CHECK (true);  -- Allow system to create events

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON blog_alerts TO authenticated;
GRANT SELECT ON blog_alerts TO anon;
GRANT SELECT, INSERT ON blog_alert_events TO authenticated;
GRANT SELECT, INSERT ON blog_alert_events TO anon;
