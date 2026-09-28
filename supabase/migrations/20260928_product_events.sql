-- P0 product funnel instrumentation (T5).
-- Safe to run in Supabase SQL Editor. create_all will also create when missing.

CREATE TABLE IF NOT EXISTS product_events (
  id BIGSERIAL PRIMARY KEY,
  event_name TEXT NOT NULL,
  student_id INTEGER,
  school_id INTEGER,
  entity_type TEXT,
  entity_id TEXT,
  payload_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_events_event_name ON product_events (event_name);
CREATE INDEX IF NOT EXISTS idx_product_events_student_id ON product_events (student_id);
CREATE INDEX IF NOT EXISTS idx_product_events_created_at ON product_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_school_event ON product_events (school_id, event_name, created_at DESC);
