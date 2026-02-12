import { create } from "zustand"
import { z } from "zod"

const ChatRuntimeStateSchema = z.object({
  isGenerating: z.boolean(),
  firstTokenReceived: z.boolean(),
  abortController: z.custom<AbortController | null>()
})

type ChatRuntimeState = z.infer<typeof ChatRuntimeStateSchema>

interface ChatRuntimeActions {
  setIsGenerating: (
    isGenerating: boolean | ((prev: boolean) => boolean)
  ) => void
  setFirstTokenReceived: (
    firstTokenReceived: boolean | ((prev: boolean) => boolean)
  ) => void
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
  setIsGenerating: isGenerating =>
    set(state => ({
      isGenerating:
        typeof isGenerating === "function"
          ? isGenerating(state.isGenerating)
          : isGenerating
    })),
  setFirstTokenReceived: firstTokenReceived =>
    set(state => ({
      firstTokenReceived:
        typeof firstTokenReceived === "function"
          ? firstTokenReceived(state.firstTokenReceived)
          : firstTokenReceived
    })),
  setAbortController: abortController => set({ abortController })
}))
