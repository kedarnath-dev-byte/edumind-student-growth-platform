-- Textbook / class-notes photo URLs on daily learning logs (JSON array of Drive links).
-- Safe to run in Supabase SQL Editor. create_all will NOT alter existing tables.

ALTER TABLE learning_logs ADD COLUMN IF NOT EXISTS note_image_urls JSONB DEFAULT '[]'::jsonb;
