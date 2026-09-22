-- Mux Shorts fields for live feed video (Drive remains archive-only for photos/proofs).
-- Apply via Supabase SQL Editor if production DB predates these columns.
-- create_all will NOT alter existing tables.

ALTER TABLE learning_logs ADD COLUMN IF NOT EXISTS mux_asset_id TEXT;
ALTER TABLE learning_logs ADD COLUMN IF NOT EXISTS mux_playback_id TEXT;
ALTER TABLE learning_logs ADD COLUMN IF NOT EXISTS mux_upload_id TEXT;
ALTER TABLE learning_logs ADD COLUMN IF NOT EXISTS video_duration_seconds DOUBLE PRECISION;

ALTER TABLE subject_posts ADD COLUMN IF NOT EXISTS mux_asset_id TEXT;
ALTER TABLE subject_posts ADD COLUMN IF NOT EXISTS mux_playback_id TEXT;
ALTER TABLE subject_posts ADD COLUMN IF NOT EXISTS mux_upload_id TEXT;
ALTER TABLE subject_posts ADD COLUMN IF NOT EXISTS video_duration_seconds DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_learning_logs_mux_playback_id ON learning_logs (mux_playback_id);
CREATE INDEX IF NOT EXISTS idx_subject_posts_mux_playback_id ON subject_posts (mux_playback_id);
