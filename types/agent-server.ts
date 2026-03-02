export type AgentServerProvider = "openai"

export interface AgentServerLlmConfig {
  provider: AgentServerProvider
  apiKey: string
  model: string
  baseURL?: string
}

export interface AgentServerSubAgent {
  name: string
  description?: string
  systemPrompt?: string
  toolNames?: string[]
}

export interface AgentServerMcpServer {
  name: string
  description: string
  type: string
  url: string
}

export interface AgentServerStreamRequest {
  sessionId: string
  workspaceId?: string
  query: string
  llmConfig: AgentServerLlmConfig
  systemPrompt?: string
  mcpServers?: AgentServerMcpServer[]
  fileIds?: string[]
  subAgents?: AgentServerSubAgent[]
}

export interface AgentServerTextDelta {
  type: "text_delta"
  text: string
}

export interface AgentServerToolUseBlock {
  type: "tool_use"
  id: string
  name: string
  input: Record<string, unknown>
}

export interface AgentServerToolResultBlock {
  type: "tool_result"
  tool_use_id: string
  tool_name: string
  content: string | Record<string, unknown>
  is_error?: boolean
}

export interface AgentServerTextBlock {
  type: "text"
  text: string
}

export type AgentServerContentBlock =
  | AgentServerTextBlock
  | AgentServerToolUseBlock
  | AgentServerToolResultBlock

export interface AgentServerContentBlockStartEvent {
  type: "content_block_start"
  index: number
  content_block: AgentServerContentBlock
}

export interface AgentServerContentBlockDeltaEvent {
  type: "content_block_delta"
  index: number
  delta: AgentServerTextDelta
}

export interface AgentServerContentBlockStopEvent {
  type: "content_block_stop"
  index: number
}

export interface AgentServerMessageDeltaEvent {
  type: "message_delta"
  delta: {
    stop_reason?: string | null
  }
}

export interface AgentServerMessageStopEvent {
  type: "message_stop"
}

export type AgentServerStreamEvent =
  | AgentServerContentBlockStartEvent
  | AgentServerContentBlockDeltaEvent
  | AgentServerContentBlockStopEvent
  | AgentServerMessageDeltaEvent
  | AgentServerMessageStopEvent
