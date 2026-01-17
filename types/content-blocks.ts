// Anthropic-style content blocks for structured tool calls and text
// Inspired by Claude API response format

export type ContentBlockType = "text" | "tool_use"

export interface TextContentBlock {
  type: "text"
  text: string
}

export interface ToolUseContentBlock {
  type: "tool_use"
  id: string
  name: string
  input: Record<string, any>
}

export interface ToolResultContentBlock {
  type: "tool_result"
  tool_use_id: string
  tool_name: string
  content: string | Record<string, any>
  is_error?: boolean
}

export type ContentBlock =
  | TextContentBlock
  | ToolUseContentBlock
  | ToolResultContentBlock

// Tool result that gets sent back to the model
export interface ToolResult {
  type: "tool_result"
  tool_use_id: string
  content: string | Record<string, any>
  is_error?: boolean
}

// Streaming events from the backend
export type StreamEventType =
  | "content_block_start"
  | "content_block_delta"
  | "content_block_stop"
  | "message_delta"
  | "error"

export interface ContentBlockStartEvent {
  type: "content_block_start"
  index: number
  content_block: ContentBlock
}

export interface ContentBlockDeltaEvent {
  type: "content_block_delta"
  index: number
  delta: TextDelta | ToolInputDelta
}

export interface ContentBlockStopEvent {
  type: "content_block_stop"
  index: number
}

export interface MessageDeltaEvent {
  type: "message_delta"
  delta: {
    stop_reason?: "end_turn" | "tool_use" | "max_tokens"
  }
}

export interface ErrorEvent {
  type: "error"
  error: string
}

export interface TextDelta {
  type: "text_delta"
  text: string
}

export interface ToolInputDelta {
  type: "input_json_delta"
  partial_json: string
}

export type StreamEvent =
  | ContentBlockStartEvent
  | ContentBlockDeltaEvent
  | ContentBlockStopEvent
  | MessageDeltaEvent
  | ErrorEvent
