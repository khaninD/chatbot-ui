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
  setChatMessages: (messages: ChatMessage[]) => void
  setChatSettings: (settings: ChatSettings) => void
  setSelectedChat: (chat: Tables<"chats"> | null) => void
  setChatFileItems: (items: Tables<"file_items">[]) => void
}

const initialState: ChatState = ChatStateSchema.parse({
  userInput: "",
  chatMessages: [],
  chatSettings: {
    model: "gpt-4o",
    prompt: "You are a helpful AI assistant.",
    temperature: 0.5,
    contextLength: 4000,
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
  setChatMessages: chatMessages => set({ chatMessages }),
  setChatSettings: chatSettings => set({ chatSettings }),
  setSelectedChat: selectedChat => set({ selectedChat }),
  setChatFileItems: chatFileItems => set({ chatFileItems })
}))
