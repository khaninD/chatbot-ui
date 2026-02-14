import { create } from "zustand"
import { z } from "zod"
import { LLM } from "@/types"
import { VALID_ENV_KEYS } from "@/types/valid-keys"

const ModelsStateSchema = z.object({
  envKeyMap: z.record(z.string(), z.custom<VALID_ENV_KEYS>()),
  availableHostedModels: z.custom<LLM[]>()
})

type ModelsState = z.infer<typeof ModelsStateSchema>

interface ModelsActions {
  setEnvKeyMap: (envKeyMap: Record<string, VALID_ENV_KEYS>) => void
  setAvailableHostedModels: (
    models: LLM[] | ((prev: LLM[]) => LLM[])
  ) => void
}

const initialState: ModelsState = ModelsStateSchema.parse({
  envKeyMap: {},
  availableHostedModels: []
})

export const useModelsStore = create<ModelsState & ModelsActions>(set => ({
  ...initialState,
  setEnvKeyMap: envKeyMap => set({ envKeyMap }),
  setAvailableHostedModels: models =>
    set(state => ({
      availableHostedModels:
        typeof models === "function"
          ? models(state.availableHostedModels)
          : models
    }))
}))
