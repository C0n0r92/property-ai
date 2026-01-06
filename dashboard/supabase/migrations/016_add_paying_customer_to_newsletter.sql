-- ============================================
-- Add paying customer tracking to Newsletter Subscribers
-- ============================================
-- Adds fields to track which newsletter subscribers are paying customers for email marketing segmentation

ALTER TABLE public.newsletter_subscribers
ADD COLUMN IF NOT EXISTS is_paying_customer BOOLEAN DEFAULT false;

ALTER TABLE public.newsletter_subscribers
ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ;

-- Add index for paying customer queries
CREATE INDEX IF NOT EXISTS newsletter_subscribers_paying_customer_idx ON public.newsletter_subscribers(is_paying_customer);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_last_payment_idx ON public.newsletter_subscribers(last_payment_at);

-- Update comment
COMMENT ON COLUMN public.newsletter_subscribers.is_paying_customer IS 'Whether this subscriber has made a payment (for email marketing segmentation)';
COMMENT ON COLUMN public.newsletter_subscribers.last_payment_at IS 'Timestamp of the subscriber''s most recent payment';
