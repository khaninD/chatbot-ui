-- Migration to drop unused columns: temperature, context_length, and agent_model

-- Drop from chats
ALTER TABLE chats DROP COLUMN IF EXISTS temperature;
ALTER TABLE chats DROP COLUMN IF EXISTS context_length;
ALTER TABLE chats DROP COLUMN IF EXISTS agent_model;

-- Drop from presets
ALTER TABLE presets DROP COLUMN IF EXISTS temperature;
ALTER TABLE presets DROP COLUMN IF EXISTS context_length;

-- Drop from assistants
ALTER TABLE assistants DROP COLUMN IF EXISTS temperature;
ALTER TABLE assistants DROP COLUMN IF EXISTS context_length;

-- Drop from workspaces
ALTER TABLE workspaces DROP COLUMN IF EXISTS default_temperature;
ALTER TABLE workspaces DROP COLUMN IF EXISTS default_context_length;

-- Drop from models (custom models)
ALTER TABLE models DROP COLUMN IF EXISTS context_length;
