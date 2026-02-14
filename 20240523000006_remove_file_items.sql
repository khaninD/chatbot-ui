-- 20240523000006_remove_file_items.sql

-- Drop file_items table and its vector index
DROP TABLE IF EXISTS file_items CASCADE;

-- Drop RAG helper functions
DROP FUNCTION IF EXISTS match_file_items_local(vector, float, int, uuid[]);
DROP FUNCTION IF EXISTS match_file_items_openai(vector, float, int, uuid[]);
