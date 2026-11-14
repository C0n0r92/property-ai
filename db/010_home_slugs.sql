-- A web address per home (/home/<slug>): readable, and stable because it is
-- built from the home_id ('12-rialto-st-dublin-8-3f2a1').
ALTER TABLE homes ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS homes_slug_idx ON homes (slug);
