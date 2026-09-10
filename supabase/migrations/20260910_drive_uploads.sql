-- Student Google Drive upload metadata
-- Safe to run in Supabase SQL Editor. create_all will also create the table
-- on backend startup when missing; this migration adds RLS for Postgres.

CREATE TABLE IF NOT EXISTS drive_uploads (
    id SERIAL PRIMARY KEY,
    student_profile_id INTEGER NOT NULL,
    app_user_id INTEGER NOT NULL,
    supabase_user_id VARCHAR NOT NULL,
    category VARCHAR NOT NULL,
    drive_file_id VARCHAR NOT NULL UNIQUE,
    file_name VARCHAR NOT NULL,
    mime_type VARCHAR NOT NULL,
    size_bytes INTEGER NOT NULL,
    web_view_link VARCHAR,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_drive_uploads_student_profile_id
    ON drive_uploads (student_profile_id);
CREATE INDEX IF NOT EXISTS ix_drive_uploads_app_user_id
    ON drive_uploads (app_user_id);
CREATE INDEX IF NOT EXISTS ix_drive_uploads_supabase_user_id
    ON drive_uploads (supabase_user_id);
CREATE INDEX IF NOT EXISTS ix_drive_uploads_category
    ON drive_uploads (category);
CREATE UNIQUE INDEX IF NOT EXISTS ix_drive_uploads_drive_file_id
    ON drive_uploads (drive_file_id);

ALTER TABLE drive_uploads ENABLE ROW LEVEL SECURITY;

-- Students own their rows (match auth.uid() to supabase_user_id).
DROP POLICY IF EXISTS drive_uploads_select_own ON drive_uploads;
CREATE POLICY drive_uploads_select_own
    ON drive_uploads
    FOR SELECT
    USING (supabase_user_id = auth.uid()::text);

DROP POLICY IF EXISTS drive_uploads_insert_own ON drive_uploads;
CREATE POLICY drive_uploads_insert_own
    ON drive_uploads
    FOR INSERT
    WITH CHECK (supabase_user_id = auth.uid()::text);

DROP POLICY IF EXISTS drive_uploads_update_own ON drive_uploads;
CREATE POLICY drive_uploads_update_own
    ON drive_uploads
    FOR UPDATE
    USING (supabase_user_id = auth.uid()::text)
    WITH CHECK (supabase_user_id = auth.uid()::text);

DROP POLICY IF EXISTS drive_uploads_delete_own ON drive_uploads;
CREATE POLICY drive_uploads_delete_own
    ON drive_uploads
    FOR DELETE
    USING (supabase_user_id = auth.uid()::text);

-- Backend uses the service role / direct Postgres URL and bypasses RLS.
-- Frontend must never write Drive metadata with the anon key.
