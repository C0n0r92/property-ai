-- ============================================
-- Add blog_slug to Newsletter Subscribers Table
-- ============================================
-- Adds blog_slug field to track which blog a user was reading when they signed up for AI summaries

ALTER TABLE public.newsletter_subscribers
ADD COLUMN IF NOT EXISTS blog_slug TEXT;

-- Add index for blog_slug lookups
CREATE INDEX IF NOT EXISTS newsletter_subscribers_blog_slug_idx ON public.newsletter_subscribers(blog_slug);

-- Update comment
COMMENT ON COLUMN public.newsletter_subscribers.blog_slug IS 'Blog slug where user signed up for AI summaries';
