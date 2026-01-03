-- ============================================
-- Newsletter Subscribers Table
-- ============================================
-- Stores email addresses for newsletter subscriptions

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  email TEXT PRIMARY KEY,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT DEFAULT 'homepage',
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS newsletter_subscribers_email_idx ON public.newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_source_idx ON public.newsletter_subscribers(source);

-- Add comment
COMMENT ON TABLE public.newsletter_subscribers IS 'Email addresses subscribed to marketing newsletters';
