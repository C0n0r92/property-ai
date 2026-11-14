-- The track record (/track-record and the accuracy figures quoted across the
-- site), worked out daily by pipeline/src/build-track-record.ts so the web
-- server never spends seconds of its one CPU on it.
CREATE TABLE IF NOT EXISTS track_records (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  record JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
