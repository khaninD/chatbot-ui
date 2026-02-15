-- 20240523000007_remove_api_keys_from_profiles.sql

ALTER TABLE profiles 
DROP COLUMN IF EXISTS anthropic_api_key,
DROP COLUMN IF EXISTS azure_openai_35_turbo_id,
DROP COLUMN IF EXISTS azure_openai_45_turbo_id,
DROP COLUMN IF EXISTS azure_openai_45_vision_id,
DROP COLUMN IF EXISTS azure_openai_api_key,
DROP COLUMN IF EXISTS azure_openai_embeddings_id,
DROP COLUMN IF EXISTS azure_openai_endpoint,
DROP COLUMN IF EXISTS comet_api_key,
DROP COLUMN IF EXISTS deepseek_api_key,
DROP COLUMN IF EXISTS google_gemini_api_key,
DROP COLUMN IF EXISTS groq_api_key,
DROP COLUMN IF EXISTS mistral_api_key,
DROP COLUMN IF EXISTS openai_api_key,
DROP COLUMN IF EXISTS openai_embedding_model,
DROP COLUMN IF EXISTS openai_organization_id,
DROP COLUMN IF EXISTS openrouter_api_key,
DROP COLUMN IF EXISTS perplexity_api_key,
DROP COLUMN IF EXISTS routerai_api_key,
DROP COLUMN IF EXISTS use_azure_openai;
