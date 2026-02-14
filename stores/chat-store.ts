import { create } from "zustand"
import { z } from "zod"
import { Tables } from "@/supabase/types"
import { ChatMessage, ChatSettings } from "@/types"

const ChatStateSchema = z.object({
  userInput: z.string(),
  chatMessages: z.custom<ChatMessage[]>(),
  chatSettings: z.custom<ChatSettings>(),
  selectedChat: z.custom<Tables<"chats"> | null>(),
  chatFileItems: z.custom<Tables<"file_items">[]>()
})

type ChatState = z.infer<typeof ChatStateSchema>

interface ChatActions {
  setUserInput: (value: string) => void
  setChatMessages: (
    messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])
  ) => void
  setChatSettings: (settings: ChatSettings) => void
  setSelectedChat: (
    chat:
      | Tables<"chats">
      | null
      | ((prev: Tables<"chats"> | null) => Tables<"chats"> | null)
  ) => void
  setChatFileItems: (
    items:
      | Tables<"file_items">[]
      | ((prev: Tables<"file_items">[]) => Tables<"file_items">[])
  ) => void
}

const initialState: ChatState = ChatStateSchema.parse({
  userInput: "",
  chatMessages: [],
  chatSettings: {
    model: "gpt-4o",
    prompt: "You are a helpful AI assistant.",
    includeProfileContext: true,
    includeWorkspaceInstructions: true,
    embeddingsProvider: "openai"
  },
  selectedChat: null,
  chatFileItems: []
})

export const useChatStore = create<ChatState & ChatActions>(set => ({
  ...initialState,
  setUserInput: userInput => set({ userInput }),
  setChatMessages: chatMessages =>
    set(state => ({
      chatMessages:
        typeof chatMessages === "function"
          ? chatMessages(state.chatMessages)
          : chatMessages
    })),
  setChatSettings: chatSettings => set({ chatSettings }),
  setSelectedChat: selectedChat =>
    set(state => ({
      selectedChat:
        typeof selectedChat === "function"
          ? selectedChat(state.selectedChat)
          : selectedChat
    })),
  setChatFileItems: chatFileItems =>
    set(state => ({
      chatFileItems:
        typeof chatFileItems === "function"
          ? chatFileItems(state.chatFileItems)
          : chatFileItems
    }))
}))
