import { create } from "zustand"
import { z } from "zod"

const ChatRuntimeStateSchema = z.object({
  isGenerating: z.boolean(),
  firstTokenReceived: z.boolean(),
  abortController: z.custom<AbortController | null>()
})

type ChatRuntimeState = z.infer<typeof ChatRuntimeStateSchema>

interface ChatRuntimeActions {
  setIsGenerating: (isGenerating: boolean) => void
  setFirstTokenReceived: (firstTokenReceived: boolean) => void
  setAbortController: (abortController: AbortController | null) => void
}

const initialState: ChatRuntimeState = ChatRuntimeStateSchema.parse({
  isGenerating: false,
  firstTokenReceived: false,
  abortController: null
})

export const useChatRuntimeStore = create<
  ChatRuntimeState & ChatRuntimeActions
>(set => ({
  ...initialState,
  setIsGenerating: isGenerating => set({ isGenerating }),
  setFirstTokenReceived: firstTokenReceived => set({ firstTokenReceived }),
  setAbortController: abortController => set({ abortController })
}))
