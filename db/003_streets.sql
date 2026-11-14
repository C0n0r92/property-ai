-- Streets with their own page (/streets/<slug>), built from the register by
-- pipeline/src/build-streets.ts. A street gets a row once it has enough
-- market sales to say something; register_sales.street_slug tags every sale
-- whose street can be told, row or not.

ALTER TABLE register_sales ADD COLUMN IF NOT EXISTS street_slug TEXT;
CREATE INDEX IF NOT EXISTS register_sales_street_idx ON register_sales (street_slug, sold_date);

CREATE TABLE IF NOT EXISTS streets (
  slug TEXT PRIMARY KEY,                -- 'butterfield-avenue-dublin-14'
  name TEXT NOT NULL,                   -- 'Butterfield Avenue'
  street_key TEXT NOT NULL,             -- 'BUTTERFIELD AVE'
  area_key TEXT NOT NULL,               -- 'd14' or a town key such as 'lucan'
  area_label TEXT NOT NULL,             -- 'Dublin 14'
  sales INTEGER NOT NULL,               -- market sales (EUR 50k and over) since 2010
  first_sale DATE NOT NULL,
  last_sale DATE NOT NULL,
  median_recent INTEGER,                -- median price over the last three years
  recent_sales INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS streets_area_idx ON streets (area_key);
