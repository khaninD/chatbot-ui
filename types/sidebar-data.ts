import { Tables } from "@/supabase/types"

export type DataListType =
  | Tables<"chats">[]
  | Tables<"prompts">[]
  | Tables<"files">[]
  | Tables<"tools">[]
  | Tables<"models">[]
  | Tables<"mcp_servers">[]

export type DataItemType =
  | Tables<"chats">
  | Tables<"prompts">
  | Tables<"files">
  | Tables<"tools">
  | Tables<"models">
  | Tables<"mcp_servers">
