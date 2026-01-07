import { Tables } from "@/supabase/types"
import { ContentBlock } from "./content-blocks"

export interface ChatMessage {
  message: Tables<"messages">
  fileItems: string[]
  contentBlocks?: ContentBlock[] // Structured content blocks (text and tool_use)
}
