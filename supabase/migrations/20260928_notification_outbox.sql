-- P1 WhatsApp outbox (T17) — intent rows for reliable delivery prep.
-- Keep WHATSAPP_DRY_RUN=true until Meta templates Approved.

CREATE TABLE IF NOT EXISTS notification_outbox (
  id BIGSERIAL PRIMARY KEY,
  kind TEXT NOT NULL,
  student_id INTEGER,
  learning_log_id INTEGER,
  payload_json JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_outbox_idempotency
  ON notification_outbox (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_status
  ON notification_outbox (status, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_kind
  ON notification_outbox (kind, status);
