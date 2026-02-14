"use client"

import { Dashboard } from "@/components/ui/dashboard"
import {
  useAssistantStore,
  useAttachmentsStore,
  useChatRuntimeStore,
  useChatStore,
  useItemsStore,
  useWorkspaceStore
} from "@/stores"
import { getAssistantWorkspacesByWorkspaceId } from "@/db/assistants"
import { getChatsByWorkspaceId } from "@/db/chats"
import { getCollectionWorkspacesByWorkspaceId } from "@/db/collections"
import { getFileWorkspacesByWorkspaceId } from "@/db/files"
import { getFoldersByWorkspaceId } from "@/db/folders"
import { getMcpServerWorkspacesByWorkspaceId } from "@/db/mcp-servers"
import { getModelWorkspacesByWorkspaceId } from "@/db/models"
import { getPresetWorkspacesByWorkspaceId } from "@/db/presets"
import { getPromptWorkspacesByWorkspaceId } from "@/db/prompts"
import { getAssistantImageFromStorage } from "@/db/storage/assistant-images"
import { getToolWorkspacesByWorkspaceId } from "@/db/tools"
import { getWorkspaceById } from "@/db/workspaces"
import { convertBlobToBase64 } from "@/lib/blob-to-b64"
import { supabase } from "@/lib/supabase/browser-client"
import { LLMID } from "@/types"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ReactNode, useEffect, useState } from "react"
import Loading from "../loading"

interface WorkspaceLayoutProps {
  children: ReactNode
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const router = useRouter()

  const params = useParams()
  const searchParams = useSearchParams()
  const workspaceId = params.workspaceid as string

  const setChatSettings = useChatStore(state => state.setChatSettings)
  const setAssistants = useItemsStore(state => state.setAssistants)
  const setAssistantImages = useAssistantStore(
    state => state.setAssistantImages
  )
  const setChats = useItemsStore(state => state.setChats)
  const setCollections = useItemsStore(state => state.setCollections)
  const setFolders = useItemsStore(state => state.setFolders)
  const setFiles = useItemsStore(state => state.setFiles)
  const setPresets = useItemsStore(state => state.setPresets)
  const setPrompts = useItemsStore(state => state.setPrompts)
  const setMcpServers = useItemsStore(state => state.setMcpServers)
  const setTools = useItemsStore(state => state.setTools)
  const setModels = useItemsStore(state => state.setModels)
  const _selectedWorkspace = useWorkspaceStore(state => state.selectedWorkspace)
  const setSelectedWorkspace = useWorkspaceStore(
    state => state.setSelectedWorkspace
  )
  const setSelectedChat = useChatStore(state => state.setSelectedChat)
  const setChatMessages = useChatStore(state => state.setChatMessages)
  const setUserInput = useChatStore(state => state.setUserInput)
  const setIsGenerating = useChatRuntimeStore(state => state.setIsGenerating)
  const setFirstTokenReceived = useChatRuntimeStore(
    state => state.setFirstTokenReceived
  )
  const setChatFiles = useAttachmentsStore(state => state.setChatFiles)
  const setChatImages = useAttachmentsStore(state => state.setChatImages)
  const setNewMessageFiles = useAttachmentsStore(
    state => state.setNewMessageFiles
  )
  const setNewMessageImages = useAttachmentsStore(
    state => state.setNewMessageImages
  )
  const setShowFilesDisplay = useAttachmentsStore(
    state => state.setShowFilesDisplay
  )

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const session = (await supabase.auth.getSession()).data.session

      if (!session) {
        return router.push("/login")
      } else {
        await fetchWorkspaceData(workspaceId)
      }
    })()
  }, [])

  useEffect(() => {
    ;(async () => await fetchWorkspaceData(workspaceId))()

    setUserInput("")
    setChatMessages([])
    setSelectedChat(null)

    setIsGenerating(false)
    setFirstTokenReceived(false)

    setChatFiles([])
    setChatImages([])
    setNewMessageFiles([])
    setNewMessageImages([])
    setShowFilesDisplay(false)
  }, [workspaceId])

  const fetchWorkspaceData = async (workspaceId: string) => {
    setLoading(true)

    const workspace = await getWorkspaceById(workspaceId)
    setSelectedWorkspace(workspace)

    const assistantData = await getAssistantWorkspacesByWorkspaceId(workspaceId)
    setAssistants(assistantData.assistants)

    for (const assistant of assistantData.assistants) {
      let url = ""

      if (assistant.image_path) {
        url = (await getAssistantImageFromStorage(assistant.image_path)) || ""
      }

      if (url) {
        const response = await fetch(url)
        const blob = await response.blob()
        const base64 = await convertBlobToBase64(blob)

        setAssistantImages(prev => [
          ...prev,
          {
            assistantId: assistant.id,
            path: assistant.image_path,
            base64,
            url
          }
        ])
      } else {
        setAssistantImages(prev => [
          ...prev,
          {
            assistantId: assistant.id,
            path: assistant.image_path,
            base64: "",
            url
          }
        ])
      }
    }

    const chats = await getChatsByWorkspaceId(workspaceId)
    setChats(chats)

    const collectionData =
      await getCollectionWorkspacesByWorkspaceId(workspaceId)
    setCollections(collectionData.collections)

    const folders = await getFoldersByWorkspaceId(workspaceId)
    setFolders(folders)

    const fileData = await getFileWorkspacesByWorkspaceId(workspaceId)
    setFiles(fileData.files)

    const presetData = await getPresetWorkspacesByWorkspaceId(workspaceId)
    setPresets(presetData.presets)

    const promptData = await getPromptWorkspacesByWorkspaceId(workspaceId)
    setPrompts(promptData.prompts)

    const mcpServerData = await getMcpServerWorkspacesByWorkspaceId(workspaceId)
    setMcpServers(mcpServerData.mcp_servers)

    const toolData = await getToolWorkspacesByWorkspaceId(workspaceId)
    setTools(toolData.tools)

    const modelData = await getModelWorkspacesByWorkspaceId(workspaceId)
    setModels(modelData.models)

    setChatSettings({
      model: (searchParams.get("model") ||
        workspace?.default_model ||
        "gpt-4-1106-preview") as LLMID,
      prompt:
        workspace?.default_prompt ||
        "You are a friendly, helpful AI assistant.",
      includeProfileContext: workspace?.include_profile_context || true,
      includeWorkspaceInstructions:
        workspace?.include_workspace_instructions || true,
      embeddingsProvider:
        (workspace?.embeddings_provider as "openai" | "local") || "openai"
    })

    setLoading(false)
  }

  if (loading) {
    return <Loading />
  }

  return <Dashboard>{children}</Dashboard>
}
