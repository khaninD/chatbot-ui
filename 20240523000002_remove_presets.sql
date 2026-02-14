-- 20240523000002_remove_presets.sql

-- Drop preset_workspaces table
DROP TABLE IF EXISTS preset_workspaces CASCADE;

-- Drop presets table
DROP TABLE IF EXISTS presets CASCADE;

-- Remove preset related columns from workspaces (if they exist)
ALTER TABLE workspaces DROP COLUMN IF EXISTS default_preset_id;

-- Delete folders associated with presets
DELETE FROM folders WHERE type = 'presets';
