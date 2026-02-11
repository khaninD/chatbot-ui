import { create } from "zustand"
import { z } from "zod"
import { Tables } from "@/supabase/types"
import { WorkspaceImage } from "@/types"

const WorkspaceStateSchema = z.object({
  selectedWorkspace: z.custom<Tables<"workspaces"> | null>(),
  workspaceImages: z.custom<WorkspaceImage[]>()
})

type WorkspaceState = z.infer<typeof WorkspaceStateSchema>

interface WorkspaceActions {
  setSelectedWorkspace: (workspace: Tables<"workspaces"> | null) => void
  setWorkspaceImages: (
    images:
      | WorkspaceImage[]
      | ((prev: WorkspaceImage[]) => WorkspaceImage[])
  ) => void
  addWorkspaceImage: (image: WorkspaceImage) => void
}

const initialState: WorkspaceState = WorkspaceStateSchema.parse({
  selectedWorkspace: null,
  workspaceImages: []
})

export const useWorkspaceStore = create<WorkspaceState & WorkspaceActions>(
  set => ({
    ...initialState,
    setSelectedWorkspace: selectedWorkspace => set({ selectedWorkspace }),
    setWorkspaceImages: workspaceImages =>
      set(state => ({
        workspaceImages:
          typeof workspaceImages === "function"
            ? workspaceImages(state.workspaceImages)
            : workspaceImages
      })),
    addWorkspaceImage: image =>
      set(state => ({ workspaceImages: [...state.workspaceImages, image] }))
  })
)
