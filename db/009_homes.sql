-- One identity per home, shared by every dataset. pipeline/src/build-homes.ts
-- gives each register sale, listing, planning application and matched sale
-- a home_id: county + area + house-and-street key, with the area resolved
-- the same way for all of them (so a register sale without a postal
-- district and a listing with one land on the same home).

CREATE TABLE IF NOT EXISTS homes (
  home_id TEXT PRIMARY KEY,             -- 'Dublin|d8|12 RIALTO ST'
  county TEXT NOT NULL,
  area_key TEXT NOT NULL,               -- 'd8', 'lucan', 'naas-kildare', 'county:Kerry'
  address_key TEXT NOT NULL,            -- '12 RIALTO ST'
  address TEXT NOT NULL,                -- the most recent way it was written
  street_slug TEXT,
  sales INTEGER NOT NULL DEFAULT 0,     -- register sales
  listings INTEGER NOT NULL DEFAULT 0,
  planning INTEGER NOT NULL DEFAULT 0,
  last_sold DATE,
  last_price INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS homes_key_idx ON homes (address_key);
CREATE INDEX IF NOT EXISTS homes_street_idx ON homes (street_slug);

ALTER TABLE register_sales ADD COLUMN IF NOT EXISTS home_id TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS home_id TEXT;
ALTER TABLE planning_applications ADD COLUMN IF NOT EXISTS home_id TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS home_id TEXT;
ALTER TABLE sold_alerts ADD COLUMN IF NOT EXISTS home_id TEXT;
CREATE INDEX IF NOT EXISTS register_sales_home_idx ON register_sales (home_id);
CREATE INDEX IF NOT EXISTS listings_home_idx ON listings (home_id);
CREATE INDEX IF NOT EXISTS planning_home_id_idx ON planning_applications (home_id);
CREATE INDEX IF NOT EXISTS sales_home_idx ON sales (home_id);
