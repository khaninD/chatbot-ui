import { create } from "zustand"
import { z } from "zod"
import { Tables } from "@/supabase/types"

const ItemsStateSchema = z.object({
  collections: z.custom<Tables<"collections">[]>(),
  chats: z.custom<Tables<"chats">[]>(),
  files: z.custom<Tables<"files">[]>(),
  folders: z.custom<Tables<"folders">[]>(),
  models: z.custom<Tables<"models">[]>(),
  presets: z.custom<Tables<"presets">[]>(),
  prompts: z.custom<Tables<"prompts">[]>(),
  mcpServers: z.custom<Tables<"mcp_servers">[]>(),
  tools: z.custom<Tables<"tools">[]>(),
  workspaces: z.custom<Tables<"workspaces">[]>()
})

type ItemsState = z.infer<typeof ItemsStateSchema>

interface ItemsActions {
  setCollections: (
    collections:
      | Tables<"collections">[]
      | ((prev: Tables<"collections">[]) => Tables<"collections">[])
  ) => void
  setChats: (
    chats:
      | Tables<"chats">[]
      | ((prev: Tables<"chats">[]) => Tables<"chats">[])
  ) => void
  setFiles: (
    files:
      | Tables<"files">[]
      | ((prev: Tables<"files">[]) => Tables<"files">[])
  ) => void
  setFolders: (
    folders:
      | Tables<"folders">[]
      | ((prev: Tables<"folders">[]) => Tables<"folders">[])
  ) => void
  setModels: (
    models:
      | Tables<"models">[]
      | ((prev: Tables<"models">[]) => Tables<"models">[])
  ) => void
  setPresets: (
    presets:
      | Tables<"presets">[]
      | ((prev: Tables<"presets">[]) => Tables<"presets">[])
  ) => void
  setPrompts: (
    prompts:
      | Tables<"prompts">[]
      | ((prev: Tables<"prompts">[]) => Tables<"prompts">[])
  ) => void
  setMcpServers: (
    mcpServers:
      | Tables<"mcp_servers">[]
      | ((prev: Tables<"mcp_servers">[]) => Tables<"mcp_servers">[])
  ) => void
  setTools: (
    tools:
      | Tables<"tools">[]
      | ((prev: Tables<"tools">[]) => Tables<"tools">[])
  ) => void
  setWorkspaces: (
    workspaces:
      | Tables<"workspaces">[]
      | ((prev: Tables<"workspaces">[]) => Tables<"workspaces">[])
  ) => void
}

const initialState: ItemsState = ItemsStateSchema.parse({
  collections: [],
  chats: [],
  files: [],
  folders: [],
  models: [],
  presets: [],
  prompts: [],
  mcpServers: [],
  tools: [],
  workspaces: []
})

export const useItemsStore = create<ItemsState & ItemsActions>(set => ({
  ...initialState,
  setCollections: collections =>
    set(state => ({
      collections:
        typeof collections === "function"
          ? collections(state.collections)
          : collections
    })),
  setChats: chats =>
    set(state => ({
      chats: typeof chats === "function" ? chats(state.chats) : chats
    })),
  setFiles: files =>
    set(state => ({
      files: typeof files === "function" ? files(state.files) : files
    })),
  setFolders: folders =>
    set(state => ({
      folders: typeof folders === "function" ? folders(state.folders) : folders
    })),
  setModels: models =>
    set(state => ({
      models: typeof models === "function" ? models(state.models) : models
    })),
  setPresets: presets =>
    set(state => ({
      presets: typeof presets === "function" ? presets(state.presets) : presets
    })),
  setPrompts: prompts =>
    set(state => ({
      prompts: typeof prompts === "function" ? prompts(state.prompts) : prompts
    })),
  setMcpServers: mcpServers =>
    set(state => ({
      mcpServers:
        typeof mcpServers === "function"
          ? mcpServers(state.mcpServers)
          : mcpServers
    })),
  setTools: tools =>
    set(state => ({
      tools: typeof tools === "function" ? tools(state.tools) : tools
    })),
  setWorkspaces: workspaces =>
    set(state => ({
      workspaces:
        typeof workspaces === "function"
          ? workspaces(state.workspaces)
          : workspaces
    }))
}))
