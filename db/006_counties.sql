-- Every county's register sales, not only Dublin's. Existing rows are Dublin.
-- The price model, matching and insights stay with Dublin (county = 'Dublin');
-- street pages cover every county.

ALTER TABLE register_sales ADD COLUMN IF NOT EXISTS county TEXT NOT NULL DEFAULT 'Dublin';
CREATE INDEX IF NOT EXISTS register_sales_county_idx ON register_sales (county, sold_date);

ALTER TABLE streets ADD COLUMN IF NOT EXISTS county TEXT NOT NULL DEFAULT 'Dublin';
-- The area alone, for listings: 'Dublin 14', 'Lucan', 'Naas, Co. Kildare'
ALTER TABLE streets ADD COLUMN IF NOT EXISTS area_name TEXT;
CREATE INDEX IF NOT EXISTS streets_county_idx ON streets (county);
