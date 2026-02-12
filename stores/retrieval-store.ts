import { create } from "zustand"
import { z } from "zod"

const RetrievalStateSchema = z.object({
  useRetrieval: z.boolean(),
  sourceCount: z.number()
})

type RetrievalState = z.infer<typeof RetrievalStateSchema>

interface RetrievalActions {
  setUseRetrieval: (value: boolean | ((prev: boolean) => boolean)) => void
  setSourceCount: (value: number | ((prev: number) => number)) => void
}

const initialState: RetrievalState = RetrievalStateSchema.parse({
  useRetrieval: true,
  sourceCount: 4
})

export const useRetrievalStore = create<RetrievalState & RetrievalActions>(
  set => ({
    ...initialState,
    setUseRetrieval: useRetrieval =>
      set(state => ({
        useRetrieval:
          typeof useRetrieval === "function"
            ? useRetrieval(state.useRetrieval)
            : useRetrieval
      })),
    setSourceCount: sourceCount =>
      set(state => ({
        sourceCount:
          typeof sourceCount === "function"
            ? sourceCount(state.sourceCount)
            : sourceCount
      }))
  })
)
