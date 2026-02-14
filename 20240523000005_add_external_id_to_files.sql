-- 20240523000005_add_external_id_to_files.sql
ALTER TABLE files ADD COLUMN IF NOT EXISTS external_id UUID;
