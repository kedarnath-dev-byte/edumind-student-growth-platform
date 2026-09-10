-- Optional selfie explanation video URL on daily learning logs.
-- Safe to run in Supabase SQL Editor. create_all will NOT alter existing tables.

ALTER TABLE learning_logs
ADD COLUMN IF NOT EXISTS explanation_video_url TEXT;
