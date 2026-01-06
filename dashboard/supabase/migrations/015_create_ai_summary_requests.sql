-- ============================================
-- AI Summary Requests Table
-- ============================================
-- Tracks user requests for AI blog summaries with freemium model
-- First request is free, subsequent requests cost €0.99

CREATE TABLE IF NOT EXISTS public.ai_summary_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  blog_slug TEXT NOT NULL,
  request_number INTEGER NOT NULL DEFAULT 1, -- 1 = free, 2+ = paid
  is_paid BOOLEAN NOT NULL DEFAULT false,
  stripe_payment_id TEXT,
  stripe_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS ai_summary_requests_email_idx ON public.ai_summary_requests(email);
CREATE INDEX IF NOT EXISTS ai_summary_requests_blog_slug_idx ON public.ai_summary_requests(blog_slug);
CREATE INDEX IF NOT EXISTS ai_summary_requests_status_idx ON public.ai_summary_requests(status);
CREATE INDEX IF NOT EXISTS ai_summary_requests_email_blog_idx ON public.ai_summary_requests(email, blog_slug);

-- Comments
COMMENT ON TABLE public.ai_summary_requests IS 'Tracks AI blog summary requests with freemium pricing (first free, subsequent €0.99)';
COMMENT ON COLUMN public.ai_summary_requests.request_number IS 'Sequential request number for this email (1=free, 2+=paid)';
COMMENT ON COLUMN public.ai_summary_requests.is_paid IS 'Whether payment was made for this request';
COMMENT ON COLUMN public.ai_summary_requests.status IS 'Request status: pending, processing, completed, failed';

-- Function to get user's next request number (across all blogs)
CREATE OR REPLACE FUNCTION get_user_request_number(user_email TEXT)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(request_number), 0) + 1
  FROM public.ai_summary_requests
  WHERE email = user_email;
$$ LANGUAGE sql;

-- Function to check if user needs to pay for next request (after first free one)
CREATE OR REPLACE FUNCTION user_needs_payment(user_email TEXT)
RETURNS BOOLEAN AS $$
  SELECT CASE
    WHEN get_user_request_number(user_email) > 1 THEN true
    ELSE false
  END;
$$ LANGUAGE sql;

-- Enable RLS
ALTER TABLE public.ai_summary_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see their own requests)
CREATE POLICY "Users can view their own AI summary requests" ON public.ai_summary_requests
  FOR SELECT USING (email = auth.jwt() ->> 'email');

CREATE POLICY "Users can insert their own AI summary requests" ON public.ai_summary_requests
  FOR INSERT WITH CHECK (email = auth.jwt() ->> 'email');

CREATE POLICY "Users can update their own AI summary requests" ON public.ai_summary_requests
  FOR UPDATE USING (email = auth.jwt() ->> 'email');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_summary_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_ai_summary_requests_updated_at ON public.ai_summary_requests;
CREATE TRIGGER update_ai_summary_requests_updated_at
  BEFORE UPDATE ON public.ai_summary_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_summary_requests_updated_at();
