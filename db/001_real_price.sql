-- ============================================
-- Real Price Check: homes being bid on, and email requests
-- ============================================
-- Plain Postgres (DigitalOcean Managed Postgres or any Postgres 13+).
-- Only the server writes to these tables, using DATABASE_URL.
-- Apply with: npm run migrate (in pipeline/)

-- Homes people are bidding on, with the asking price they gave.
-- Matched later against the Property Price Register to learn the sold price.
CREATE TABLE IF NOT EXISTS public.real_price_homes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  address TEXT NOT NULL CHECK (char_length(address) BETWEEN 6 AND 120),
  eircode TEXT CHECK (eircode IS NULL OR eircode ~ '^[A-Z0-9]{7}$'),
  area_key TEXT NOT NULL,
  type_group TEXT NOT NULL CHECK (type_group IN ('apartment', 'terraced', 'semi', 'detached')),
  beds SMALLINT CHECK (beds BETWEEN 1 AND 10),
  asking_price INTEGER NOT NULL CHECK (asking_price BETWEEN 50000 AND 20000000),
  source TEXT NOT NULL DEFAULT 'checkout',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS real_price_homes_eircode_idx ON public.real_price_homes (eircode);

-- "Email me this result" requests
CREATE TABLE IF NOT EXISTS public.real_price_leads (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL CHECK (char_length(email) <= 254),
  query JSONB NOT NULL,
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  emailed BOOLEAN NOT NULL DEFAULT FALSE,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS real_price_leads_email_idx ON public.real_price_leads (email);

COMMENT ON TABLE public.real_price_homes IS 'Homes visitors are bidding on, with asking price (Real Price Check)';
COMMENT ON TABLE public.real_price_leads IS 'Email-me-this-result requests (Real Price Check)';
