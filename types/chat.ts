import { Tables } from "@/supabase/types"
import { ChatMessage, LLMID } from "."

export interface ChatSettings {
  model: LLMID
  modelProvider?: string // Provider of the selected model (e.g., "openai", "comet", "anthropic")
  modelBaseURL?: string // Base URL override for custom models (stored in DB)
  modelApiKey?: string // API key override for custom models (stored in DB)
  prompt: string
  includeProfileContext: boolean
  includeWorkspaceInstructions: boolean
  embeddingsProvider: "openai" | "local"
  mcpServerIds?: string[]
  // useAdvancedRAG?: boolean
  // useReranking?: boolean
  enableImageGeneration?: boolean
  imageModel?: string
  useMultiAgent?: boolean
}

export interface ChatPayload {
  chatSettings: ChatSettings
  workspaceInstructions: string
  chatMessages: ChatMessage[]
  messageFileItems: Tables<"file_items">[]
  chatFileItems: Tables<"file_items">[]
}

export interface ChatAPIPayload {
  chatSettings: ChatSettings
  messages: Tables<"messages">[]
}
