-- Add content_blocks column to messages table for storing tool call information
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content_blocks jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN messages.content_blocks IS 'Stores structured content blocks including tool calls in Anthropic API format';
