-- ============================================
-- Market data: the single source of truth for housing records
-- ============================================
-- sales           asking price + sold price pairs (what the pricing model uses)
-- register_sales  every Dublin sale in the Property Price Register (sold price only)
-- listings        homes for sale, with asking price and status, seen by the collector
-- listing_prices  asking-price history per listing
-- ingest_runs     one row per pipeline job run

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,                 -- 'daft_legacy' or 'matched'
  address TEXT NOT NULL,
  eircode TEXT,
  property_type TEXT,
  beds SMALLINT,
  baths SMALLINT,
  sqm REAL,
  asking_price INTEGER NOT NULL,
  sold_price INTEGER NOT NULL,
  sold_date DATE NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  dublin_postcode TEXT,
  listing_source TEXT,
  listing_id TEXT,
  register_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sales_sold_date_idx ON sales (sold_date);
CREATE UNIQUE INDEX IF NOT EXISTS sales_register_idx ON sales (register_id) WHERE register_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS register_sales (
  id TEXT PRIMARY KEY,                  -- hash of date, address and price
  sold_date DATE NOT NULL,
  address TEXT NOT NULL,
  address_key TEXT NOT NULL,            -- normalised house + street, for matching
  district TEXT,                        -- 'd8', 'd6w' ... when the address has one
  eircode TEXT,
  price INTEGER NOT NULL,
  new_build BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS register_sales_date_idx ON register_sales (sold_date);
CREATE INDEX IF NOT EXISTS register_sales_key_idx ON register_sales (address_key);
CREATE INDEX IF NOT EXISTS register_sales_eircode_idx ON register_sales (eircode);

CREATE TABLE IF NOT EXISTS listings (
  source TEXT NOT NULL,                 -- 'myhome' or 'daft_legacy'
  source_id TEXT NOT NULL,
  address TEXT NOT NULL,
  address_key TEXT NOT NULL,
  district TEXT,
  eircode TEXT,
  property_type TEXT,
  beds SMALLINT,
  baths SMALLINT,
  sqm REAL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  asking_price INTEGER NOT NULL,
  sale_agreed BOOLEAN NOT NULL DEFAULT FALSE,
  url TEXT,
  first_seen DATE NOT NULL,
  last_seen DATE NOT NULL,
  PRIMARY KEY (source, source_id)
);
CREATE INDEX IF NOT EXISTS listings_key_idx ON listings (address_key);
CREATE INDEX IF NOT EXISTS listings_eircode_idx ON listings (eircode);

CREATE TABLE IF NOT EXISTS listing_prices (
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  seen_on DATE NOT NULL,
  price INTEGER NOT NULL,
  PRIMARY KEY (source, source_id, seen_on),
  FOREIGN KEY (source, source_id) REFERENCES listings (source, source_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ingest_runs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  ok BOOLEAN,
  stats JSONB,
  error TEXT
);
