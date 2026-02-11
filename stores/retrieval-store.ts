import { create } from "zustand"
import { z } from "zod"

const RetrievalStateSchema = z.object({
  useRetrieval: z.boolean(),
  sourceCount: z.number()
})

type RetrievalState = z.infer<typeof RetrievalStateSchema>

interface RetrievalActions {
  setUseRetrieval: (value: boolean) => void
  setSourceCount: (value: number) => void
}

const initialState: RetrievalState = RetrievalStateSchema.parse({
  useRetrieval: true,
  sourceCount: 4
})

export const useRetrievalStore = create<RetrievalState & RetrievalActions>(
  set => ({
    ...initialState,
    setUseRetrieval: useRetrieval => set({ useRetrieval }),
    setSourceCount: sourceCount => set({ sourceCount })
  })
)
