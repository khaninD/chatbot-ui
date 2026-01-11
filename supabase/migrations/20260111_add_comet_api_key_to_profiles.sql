-- Add comet_api_key column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS comet_api_key TEXT;
