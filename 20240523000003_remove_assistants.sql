-- 20240523000003_remove_assistants.sql

-- Drop assistant junction tables
DROP TABLE IF EXISTS assistant_collections CASCADE;
DROP TABLE IF EXISTS assistant_files CASCADE;
DROP TABLE IF EXISTS assistant_tools CASCADE;
DROP TABLE IF EXISTS assistant_workspaces CASCADE;

-- Drop assistants table
DROP TABLE IF EXISTS assistants CASCADE;

-- Remove assistant_id from chats and messages
ALTER TABLE chats DROP COLUMN IF EXISTS assistant_id;
ALTER TABLE messages DROP COLUMN IF EXISTS assistant_id;

-- Delete folders associated with assistants
DELETE FROM folders WHERE type = 'assistants';

-- Drop helper function if exists
DROP FUNCTION IF EXISTS non_private_assistant_exists(text);
