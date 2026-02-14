-- 20240523000004_remove_collections.sql

-- Drop collection junction tables
DROP TABLE IF EXISTS collection_files CASCADE;
DROP TABLE IF EXISTS collection_workspaces CASCADE;

-- Drop collections table
DROP TABLE IF EXISTS collections CASCADE;

-- Delete folders associated with collections
DELETE FROM folders WHERE type = 'collections';
