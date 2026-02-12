import { create } from "zustand"
import { z } from "zod"
import { Tables } from "@/supabase/types"

const ToolStateSchema = z.object({
  selectedTools: z.custom<Tables<"tools">[]>(),
  toolInUse: z.string()
})

type ToolState = z.infer<typeof ToolStateSchema>

interface ToolActions {
  setSelectedTools: (tools: Tables<"tools">[]) => void
  setToolInUse: (toolInUse: string | ((prev: string) => string)) => void
}

const initialState: ToolState = ToolStateSchema.parse({
  selectedTools: [],
  toolInUse: "none"
})

export const useToolStore = create<ToolState & ToolActions>(set => ({
  ...initialState,
  setSelectedTools: selectedTools => set({ selectedTools }),
  setToolInUse: toolInUse =>
    set(state => ({
      toolInUse:
        typeof toolInUse === "function" ? toolInUse(state.toolInUse) : toolInUse
    }))
}))
