import { useItemsStore } from "@/stores"
import { Tables } from "@/supabase/types"

const resetItemsStore = () => {
  useItemsStore.setState({
    collections: [],
    chats: [],
    files: [],
    folders: [],
    models: [],
    prompts: [],
    mcpServers: [],
    tools: [],
    workspaces: []
  })
}

describe("useItemsStore", () => {
  beforeEach(() => {
    resetItemsStore()
  })

  it("sets chats with direct array", () => {
    const chat = { id: "chat-1" } as Tables<"chats">
    useItemsStore.getState().setChats([chat])

    expect(useItemsStore.getState().chats).toEqual([chat])
  })

  it("sets chats with updater function", () => {
    const chat = { id: "chat-1" } as Tables<"chats">
    useItemsStore.getState().setChats([chat])

    const nextChat = { id: "chat-2" } as Tables<"chats">
    useItemsStore.getState().setChats(prev => [...prev, nextChat])

    expect(useItemsStore.getState().chats).toEqual([chat, nextChat])
  })
})
