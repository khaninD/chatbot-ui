import { create } from "zustand"
import { z } from "zod"
import { Tables } from "@/supabase/types"

const ProfileStateSchema = z.object({
  profile: z.custom<Tables<"profiles"> | null>()
})

type ProfileState = z.infer<typeof ProfileStateSchema>

interface ProfileActions {
  setProfile: (profile: Tables<"profiles"> | null) => void
}

const initialState: ProfileState = ProfileStateSchema.parse({
  profile: null
})

export const useProfileStore = create<ProfileState & ProfileActions>(set => ({
  ...initialState,
  setProfile: profile => set({ profile })
}))
