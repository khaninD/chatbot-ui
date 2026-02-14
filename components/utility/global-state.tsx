"use client"

import { getProfileByUserId } from "@/db/profile"
import { getWorkspaceImageFromStorage } from "@/db/storage/workspace-images"
import { getWorkspacesByUserId } from "@/db/workspaces"
import { convertBlobToBase64 } from "@/lib/blob-to-b64"
import { fetchHostedModels } from "@/lib/models/fetch-models"
import { supabase } from "@/lib/supabase/browser-client"
import {
  useItemsStore,
  useModelsStore,
  useProfileStore,
  useWorkspaceStore
} from "@/stores"
import { useRouter } from "next/navigation"
import { FC, useEffect } from "react"

interface GlobalStateProps {
  children: React.ReactNode
}

export const GlobalState: FC<GlobalStateProps> = ({ children }) => {
  const router = useRouter()
  const setProfile = useProfileStore(state => state.setProfile)
  const setWorkspaces = useItemsStore(state => state.setWorkspaces)
  const addWorkspaceImage = useWorkspaceStore(state => state.addWorkspaceImage)
  const setEnvKeyMap = useModelsStore(state => state.setEnvKeyMap)
  const setAvailableHostedModels = useModelsStore(
    state => state.setAvailableHostedModels
  )

  useEffect(() => {
    ;(async () => {
      const profile = await fetchStartingData()

      if (profile) {
        const hostedModelRes = await fetchHostedModels(profile)
        if (!hostedModelRes) return

        setEnvKeyMap(hostedModelRes.envKeyMap)
        setAvailableHostedModels(hostedModelRes.hostedModels)
      }
    })()
  }, [setAvailableHostedModels, setEnvKeyMap])

  const fetchStartingData = async () => {
    const session = (await supabase.auth.getSession()).data.session

    if (session) {
      const user = session.user

      const profile = await getProfileByUserId(user.id)
      setProfile(profile)

      if (!profile.has_onboarded) {
        return router.push("/setup")
      }

      const workspaces = await getWorkspacesByUserId(user.id)
      setWorkspaces(workspaces)

      for (const workspace of workspaces) {
        let workspaceImageUrl = ""

        if (workspace.image_path) {
          workspaceImageUrl =
            (await getWorkspaceImageFromStorage(workspace.image_path)) || ""
        }

        if (workspaceImageUrl) {
          const response = await fetch(workspaceImageUrl)
          const blob = await response.blob()
          const base64 = await convertBlobToBase64(blob)

          addWorkspaceImage({
            workspaceId: workspace.id,
            path: workspace.image_path,
            base64: base64,
            url: workspaceImageUrl
          })
        }
      }

      return profile
    }
  }

  return <>{children}</>
}
