-- ============================================
-- Update AI Summary Functions for Global Quota
-- ============================================
-- Change from per-blog free quota to global free quota (1 free summary total, then pay for all subsequent)

-- Update function to get user's next request number across all blogs
CREATE OR REPLACE FUNCTION get_user_request_number(user_email TEXT)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(request_number), 0) + 1
  FROM public.ai_summary_requests
  WHERE email = user_email;
$$ LANGUAGE sql;

-- Update function to check if user needs to pay (after first free one globally)
CREATE OR REPLACE FUNCTION user_needs_payment(user_email TEXT)
RETURNS BOOLEAN AS $$
  SELECT CASE
    WHEN get_user_request_number(user_email) > 1 THEN true
    ELSE false
  END;
$$ LANGUAGE sql;

-- Update comments
COMMENT ON FUNCTION get_user_request_number(TEXT) IS 'Gets the next request number for a user across all blogs (global quota)';
COMMENT ON FUNCTION user_needs_payment(TEXT) IS 'Checks if user needs to pay for next AI summary (true after first free one globally)';
