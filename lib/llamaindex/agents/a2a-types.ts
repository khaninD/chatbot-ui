/**
 * A2A (Agent-to-Agent) Protocol Types
 * Standard types for agent communication
 */

import { ChatMessage } from "@llamaindex/core/llms"

/**
 * A2A Request format
 * Standard format for requesting work from an agent
 */
export interface A2ARequest {
  /**
   * Unique thread identifier for conversation continuity
   */
  thread_id: string

  /**
   * Messages in the conversation
   */
  messages: A2AMessage[]

  /**
   * Whether to stream the response
   */
  stream?: boolean

  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>
}

/**
 * A2A Message format
 */
export interface A2AMessage {
  role: "user" | "assistant" | "system"
  content: string
  metadata?: Record<string, unknown>
}

/**
 * A2A Response format (non-streaming)
 */
export interface A2AResponse {
  /**
   * Response type
   */
  type: "message" | "error"

  /**
   * The actual response content
   */
  content: string

  /**
   * Thread ID for conversation continuity
   */
  thread_id: string

  /**
   * Metadata about the response
   */
  metadata?: {
    agent: string
    tool_calls?: Array<{
      tool_name: string
      tool_input: unknown
      tool_output: unknown
    }>
    timestamp?: string
    [key: string]: unknown
  }
}

/**
 * A2A Streaming Event
 * Events sent during streaming responses
 */
export interface A2AStreamEvent {
  type: "start" | "delta" | "tool_call" | "tool_result" | "end" | "error"
  data: unknown
  thread_id: string
  metadata?: Record<string, unknown>
}

/**
 * Convert ChatMessage[] to A2AMessage[]
 */
export function toA2AMessages(messages: ChatMessage[]): A2AMessage[] {
  return messages.map(msg => ({
    role: msg.role as "user" | "assistant" | "system",
    content: typeof msg.content === "string" ? msg.content : String(msg.content)
  }))
}

/**
 * Convert A2AMessage[] to ChatMessage[]
 */
export function fromA2AMessages(messages: A2AMessage[]): ChatMessage[] {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }))
}

/**
 * Create A2A error response
 */
export function createA2AError(
  threadId: string,
  error: Error | string,
  agent: string
): A2AResponse {
  return {
    type: "error",
    content: error instanceof Error ? error.message : error,
    thread_id: threadId,
    metadata: {
      agent,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Create A2A success response
 */
export function createA2AResponse(
  threadId: string,
  content: string,
  agent: string,
  metadata?: Record<string, unknown>
): A2AResponse {
  return {
    type: "message",
    content,
    thread_id: threadId,
    metadata: {
      agent,
      timestamp: new Date().toISOString(),
      ...metadata
    }
  }
}

/**
 * Validate A2A request
 */
export function validateA2ARequest(body: unknown): A2ARequest {
  const req = body as Partial<A2ARequest>

  if (!req.thread_id || typeof req.thread_id !== "string") {
    throw new Error("Missing or invalid thread_id")
  }

  if (!Array.isArray(req.messages) || req.messages.length === 0) {
    throw new Error("Missing or empty messages array")
  }

  for (const msg of req.messages) {
    if (!msg.role || !["user", "assistant", "system"].includes(msg.role)) {
      throw new Error(`Invalid message role: ${msg.role}`)
    }
    if (typeof msg.content !== "string") {
      throw new Error("Message content must be a string")
    }
  }

  return req as A2ARequest
}
