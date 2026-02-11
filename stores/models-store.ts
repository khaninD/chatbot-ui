import { create } from "zustand"
import { z } from "zod"
import { LLM, OpenRouterLLM } from "@/types"
import { VALID_ENV_KEYS } from "@/types/valid-keys"

const ModelsStateSchema = z.object({
  envKeyMap: z.record(z.string(), z.custom<VALID_ENV_KEYS>()),
  availableHostedModels: z.custom<LLM[]>(),
  availableLocalModels: z.custom<LLM[]>(),
  availableOpenRouterModels: z.custom<OpenRouterLLM[]>()
})

type ModelsState = z.infer<typeof ModelsStateSchema>

interface ModelsActions {
  setEnvKeyMap: (envKeyMap: Record<string, VALID_ENV_KEYS>) => void
  setAvailableHostedModels: (models: LLM[]) => void
  setAvailableLocalModels: (models: LLM[]) => void
  setAvailableOpenRouterModels: (models: OpenRouterLLM[]) => void
}

const initialState: ModelsState = ModelsStateSchema.parse({
  envKeyMap: {},
  availableHostedModels: [],
  availableLocalModels: [],
  availableOpenRouterModels: []
})

export const useModelsStore = create<ModelsState & ModelsActions>(set => ({
  ...initialState,
  setEnvKeyMap: envKeyMap => set({ envKeyMap }),
  setAvailableHostedModels: models => set({ availableHostedModels: models }),
  setAvailableLocalModels: models => set({ availableLocalModels: models }),
  setAvailableOpenRouterModels: models =>
    set({ availableOpenRouterModels: models })
}))
