-- "Tell me what it sold for": a visitor's request to be emailed once, when a
-- home they checked appears in the Property Price Register. Kept until it is
-- sent, stopped, or 18 months old (see the privacy page).

CREATE TABLE IF NOT EXISTS sold_alerts (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  address TEXT NOT NULL,                -- as the visitor's home was found
  address_key TEXT NOT NULL,            -- normalised house + street, for matching
  district TEXT,                        -- 'd8' ... when the address has one
  asking_price INTEGER,
  predicted_mid INTEGER,                -- what the price check said, for the email
  token TEXT NOT NULL UNIQUE,           -- for the stop link
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  sale_date DATE,
  sale_price INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS sold_alerts_open_idx ON sold_alerts (email, address_key) WHERE notified_at IS NULL;
CREATE INDEX IF NOT EXISTS sold_alerts_key_idx ON sold_alerts (address_key) WHERE notified_at IS NULL;
