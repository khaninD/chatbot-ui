import { create } from "zustand"
import { z } from "zod"
import { Tables } from "@/supabase/types"

const PresetStateSchema = z.object({
  selectedPreset: z.custom<Tables<"presets"> | null>()
})

type PresetState = z.infer<typeof PresetStateSchema>

interface PresetActions {
  setSelectedPreset: (preset: Tables<"presets"> | null) => void
}

const initialState: PresetState = PresetStateSchema.parse({
  selectedPreset: null
})

export const usePresetStore = create<PresetState & PresetActions>(set => ({
  ...initialState,
  setSelectedPreset: selectedPreset => set({ selectedPreset })
}))
