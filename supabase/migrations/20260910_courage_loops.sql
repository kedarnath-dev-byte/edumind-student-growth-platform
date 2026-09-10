-- Courage Loop: vulnerability → clarity → courage
-- Run in Supabase SQL Editor (Mumbai). Privacy-first defaults.
-- visibility: private | trusted only (never peer feed / parent raw / principal free-text).
-- Leadership sees aggregates/tags via admin pulse — never note text by default.

CREATE TABLE IF NOT EXISTS courage_loops (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    subject_id INTEGER,
    topic_id INTEGER,
    learning_log_id INTEGER,
    fear_type VARCHAR NOT NULL,
    note TEXT,
    visibility VARCHAR NOT NULL DEFAULT 'private',
    stage VARCHAR NOT NULL DEFAULT 'vulnerable',
    clarity_path TEXT,
    courage_action TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS ix_courage_loops_student_id ON courage_loops (student_id);
CREATE INDEX IF NOT EXISTS ix_courage_loops_subject_id ON courage_loops (subject_id);
CREATE INDEX IF NOT EXISTS ix_courage_loops_topic_id ON courage_loops (topic_id);
CREATE INDEX IF NOT EXISTS ix_courage_loops_learning_log_id ON courage_loops (learning_log_id);
CREATE INDEX IF NOT EXISTS ix_courage_loops_stage ON courage_loops (stage);
CREATE INDEX IF NOT EXISTS ix_courage_loops_visibility ON courage_loops (visibility);
CREATE INDEX IF NOT EXISTS ix_courage_loops_fear_type ON courage_loops (fear_type);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courage_loops_visibility_check') THEN
        ALTER TABLE courage_loops
            ADD CONSTRAINT courage_loops_visibility_check
            CHECK (visibility IN ('private', 'trusted'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courage_loops_stage_check') THEN
        ALTER TABLE courage_loops
            ADD CONSTRAINT courage_loops_stage_check
            CHECK (stage IN ('vulnerable', 'clarifying', 'courage', 'done'));
    END IF;
END $$;

ALTER TABLE courage_loops ENABLE ROW LEVEL SECURITY;

-- Empty policy set + RLS = deny for anon/authenticated via PostgREST.
-- Backend service role / direct Postgres bypasses RLS.
-- NEVER post private notes into subject_posts / Subject Worlds.
