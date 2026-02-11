import { create } from "zustand"
import { z } from "zod"
import { Tables } from "@/supabase/types"
import { AssistantImage } from "@/types/images/assistant-image"

const AssistantStateSchema = z.object({
  selectedAssistant: z.custom<Tables<"assistants"> | null>(),
  assistantImages: z.custom<AssistantImage[]>(),
  openaiAssistants: z.array(z.unknown())
})

type AssistantState = z.infer<typeof AssistantStateSchema>

interface AssistantActions {
  setSelectedAssistant: (assistant: Tables<"assistants"> | null) => void
  setAssistantImages: (
    images:
      | AssistantImage[]
      | ((prev: AssistantImage[]) => AssistantImage[])
  ) => void
  addAssistantImage: (image: AssistantImage) => void
  setOpenaiAssistants: (assistants: unknown[]) => void
}

const initialState: AssistantState = AssistantStateSchema.parse({
  selectedAssistant: null,
  assistantImages: [],
  openaiAssistants: []
})

export const useAssistantStore = create<AssistantState & AssistantActions>(
  set => ({
    ...initialState,
    setSelectedAssistant: selectedAssistant => set({ selectedAssistant }),
    setAssistantImages: assistantImages =>
      set(state => ({
        assistantImages:
          typeof assistantImages === "function"
            ? assistantImages(state.assistantImages)
            : assistantImages
      })),
    addAssistantImage: image =>
      set(state => ({ assistantImages: [...state.assistantImages, image] })),
    setOpenaiAssistants: openaiAssistants => set({ openaiAssistants })
  })
)
