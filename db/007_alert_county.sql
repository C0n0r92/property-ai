-- Sold-price alerts outside Dublin: the county the watched home is in, so a
-- sale is only matched within it (Newcastle, Co. Wicklow is not Newcastle,
-- Co. Dublin). Existing alerts are all Dublin.
ALTER TABLE sold_alerts ADD COLUMN IF NOT EXISTS county TEXT NOT NULL DEFAULT 'Dublin';
