-- "What is it worth?": repeat-sales price indexes and their measured accuracy,
-- rebuilt daily by pipeline/src/build-worth.ts.

CREATE TABLE IF NOT EXISTS price_indexes (
  area_key TEXT NOT NULL,               -- 'd8', 'naas-kildare', or 'county:Kerry'
  county TEXT NOT NULL,
  from_year INTEGER NOT NULL,
  vals DOUBLE PRECISION[] NOT NULL,     -- index by year, 1 = from_year
  pairs INTEGER NOT NULL,               -- resales the index was fitted on
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (area_key, county)
);

CREATE TABLE IF NOT EXISTS worth_accuracy (
  county TEXT PRIMARY KEY,              -- a county, or 'ALL'
  tested INTEGER NOT NULL,              -- held-out recent resales predicted
  median_abs DOUBLE PRECISION NOT NULL, -- typical error, percent
  within10 DOUBLE PRECISION NOT NULL,   -- share within 10%, percent
  within20 DOUBLE PRECISION NOT NULL,
  bands JSONB NOT NULL,                 -- [[maxYearsHeld, lowLog, highLog], ...] for ranges
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
