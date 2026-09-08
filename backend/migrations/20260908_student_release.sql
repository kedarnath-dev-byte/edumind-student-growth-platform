-- Additive PostgreSQL migration. Confirm the target database and take a backup first.
BEGIN;
CREATE TABLE IF NOT EXISTS learning_submissions (
  student_id INTEGER NOT NULL,
  request_key VARCHAR(80) NOT NULL,
  payload_hash VARCHAR(64) NOT NULL,
  learning_log_id INTEGER NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  PRIMARY KEY (student_id, request_key)
);
-- Receipts are internal to the backend, never exposed through the Data API.
ALTER TABLE learning_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON learning_submissions FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS ix_revision_student_status_due ON revision_tasks(student_id, status, due_at);
CREATE INDEX IF NOT EXISTS ix_logs_class_created ON learning_logs(classroom_id, created_at);
COMMIT;
