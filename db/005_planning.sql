-- Planning applications in the four Dublin councils, from the national
-- planning applications database (Department of Housing, CC BY 4.0).
-- Applicants' names and addresses are not stored.

CREATE TABLE IF NOT EXISTS planning_applications (
  id TEXT PRIMARY KEY,                  -- council + application number
  authority TEXT NOT NULL,
  app_number TEXT NOT NULL,
  address TEXT NOT NULL,                -- where the development is
  home_key TEXT,                        -- normalised house + street, when it is one home
  district TEXT,
  street_slug TEXT,
  description TEXT,
  kinds TEXT[] NOT NULL DEFAULT '{}',   -- 'extension', 'attic', 'new homes' ...
  app_type TEXT,
  decision TEXT NOT NULL,               -- granted, part, refused, invalid, withdrawn, pending, other
  decision_raw TEXT,
  received_date DATE,
  decision_date DATE,
  units INTEGER,                        -- residential units, when stated
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  link TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS planning_home_idx ON planning_applications (home_key);
CREATE INDEX IF NOT EXISTS planning_street_idx ON planning_applications (street_slug, received_date);
CREATE INDEX IF NOT EXISTS planning_district_idx ON planning_applications (district, decision_date);
