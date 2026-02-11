import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet"
import { useAssistantStore, useItemsStore, useWorkspaceStore } from "@/stores"
import { createAssistantCollections } from "@/db/assistant-collections"
import { createAssistantFiles } from "@/db/assistant-files"
import { createAssistantTools } from "@/db/assistant-tools"
import { createAssistant, updateAssistant } from "@/db/assistants"
import { createChat } from "@/db/chats"
import { createCollectionFiles } from "@/db/collection-files"
import { createCollection } from "@/db/collections"
import { createFileBasedOnExtension } from "@/db/files"
import { createMcpServer } from "@/db/mcp-servers"
import { createModel } from "@/db/models"
import { createPreset } from "@/db/presets"
import { createPrompt } from "@/db/prompts"
import {
  getAssistantImageFromStorage,
  uploadAssistantImage
} from "@/db/storage/assistant-images"
import { createTool } from "@/db/tools"
import { convertBlobToBase64 } from "@/lib/blob-to-b64"
import { Tables, TablesInsert } from "@/supabase/types"
import { ContentType } from "@/types"
import { FC, useRef, useState } from "react"
import { toast } from "sonner"

interface SidebarCreateItemProps {
  isOpen: boolean
  isTyping: boolean
  onOpenChange: (isOpen: boolean) => void
  contentType: ContentType
  renderInputs: () => React.JSX.Element
  createState: unknown
}

export const SidebarCreateItem: FC<SidebarCreateItemProps> = ({
  isOpen,
  onOpenChange,
  contentType,
  renderInputs,
  createState,
  isTyping
}) => {
  const selectedWorkspace = useWorkspaceStore(state => state.selectedWorkspace)
  const chats = useItemsStore(state => state.chats)
  const presets = useItemsStore(state => state.presets)
  const prompts = useItemsStore(state => state.prompts)
  const mcpServers = useItemsStore(state => state.mcpServers)
  const files = useItemsStore(state => state.files)
  const collections = useItemsStore(state => state.collections)
  const assistants = useItemsStore(state => state.assistants)
  const tools = useItemsStore(state => state.tools)
  const models = useItemsStore(state => state.models)
  const setChats = useItemsStore(state => state.setChats)
  const setPresets = useItemsStore(state => state.setPresets)
  const setPrompts = useItemsStore(state => state.setPrompts)
  const setMcpServers = useItemsStore(state => state.setMcpServers)
  const setFiles = useItemsStore(state => state.setFiles)
  const setCollections = useItemsStore(state => state.setCollections)
  const setAssistants = useItemsStore(state => state.setAssistants)
  const addAssistantImage = useAssistantStore(state => state.addAssistantImage)
  const setTools = useItemsStore(state => state.setTools)
  const setModels = useItemsStore(state => state.setModels)

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [creating, setCreating] = useState(false)

  const createFunctions: Record<
    ContentType,
    (state: unknown, workspaceId: string) => Promise<unknown>
  > = {
    chats: (state, workspaceId) =>
      createChat(state as TablesInsert<"chats">, workspaceId),
    presets: (state, workspaceId) =>
      createPreset(state as TablesInsert<"presets">, workspaceId),
    prompts: (state, workspaceId) =>
      createPrompt(state as TablesInsert<"prompts">, workspaceId),
    mcp_servers: (state, workspaceId) =>
      createMcpServer(state as TablesInsert<"mcp_servers">, workspaceId),
    files: async (state, workspaceId) => {
      const createState = state as { file: File } & TablesInsert<"files">
      if (!selectedWorkspace) return

      const { file, ...rest } = createState

      const createdFile = await createFileBasedOnExtension(
        file,
        rest,
        workspaceId,
        selectedWorkspace.embeddings_provider as "openai" | "local"
      )

      return createdFile
    },
    collections: async (state, workspaceId) => {
      const createState = state as {
        image: File
        collectionFiles: TablesInsert<"collection_files">[]
      } & Tables<"collections">
      const { collectionFiles, ...rest } = createState

      const createdCollection = await createCollection(rest, workspaceId)

      const finalCollectionFiles = collectionFiles.map(collectionFile => ({
        ...collectionFile,
        collection_id: createdCollection.id
      }))

      await createCollectionFiles(finalCollectionFiles)

      return createdCollection
    },
    assistants: async (state, workspaceId) => {
      const createState = state as {
        image: File
        files: Tables<"files">[]
        collections: Tables<"collections">[]
        tools: Tables<"tools">[]
      } & Tables<"assistants">
      const { image, files, collections, tools, ...rest } = createState

      const createdAssistant = await createAssistant(rest, workspaceId)

      let updatedAssistant = createdAssistant

      if (image) {
        const filePath = await uploadAssistantImage(createdAssistant, image)

        updatedAssistant = await updateAssistant(createdAssistant.id, {
          image_path: filePath
        })

        const url = (await getAssistantImageFromStorage(filePath)) || ""

        if (url) {
          const response = await fetch(url)
          const blob = await response.blob()
          const base64 = await convertBlobToBase64(blob)

          addAssistantImage({
            assistantId: updatedAssistant.id,
            path: filePath,
            base64,
            url
          })
        }
      }

      const assistantFiles = files.map(file => ({
        user_id: rest.user_id,
        assistant_id: createdAssistant.id,
        file_id: file.id
      }))

      const assistantCollections = collections.map(collection => ({
        user_id: rest.user_id,
        assistant_id: createdAssistant.id,
        collection_id: collection.id
      }))

      const assistantTools = tools.map(tool => ({
        user_id: rest.user_id,
        assistant_id: createdAssistant.id,
        tool_id: tool.id
      }))

      await createAssistantFiles(assistantFiles)
      await createAssistantCollections(assistantCollections)
      await createAssistantTools(assistantTools)

      return updatedAssistant
    },
    tools: (state, workspaceId) =>
      createTool(state as TablesInsert<"tools">, workspaceId),
    models: (state, workspaceId) =>
      createModel(state as TablesInsert<"models">, workspaceId)
  }

  const handleCreate = async () => {
    try {
      if (!selectedWorkspace) return
      if (isTyping) return // Prevent creation while typing

      const createFunction = createFunctions[contentType]

      if (!createFunction) return

      setCreating(true)

      const newItem = await createFunction(createState, selectedWorkspace.id)

      switch (contentType) {
        case "chats":
          setChats([...chats, newItem as Tables<"chats">])
          break
        case "presets":
          setPresets([...presets, newItem as Tables<"presets">])
          break
        case "prompts":
          setPrompts([...prompts, newItem as Tables<"prompts">])
          break
        case "mcp_servers":
          setMcpServers([...mcpServers, newItem as Tables<"mcp_servers">])
          break
        case "files":
          setFiles([...files, newItem as Tables<"files">])
          break
        case "collections":
          setCollections([...collections, newItem as Tables<"collections">])
          break
        case "assistants":
          setAssistants([...assistants, newItem as Tables<"assistants">])
          break
        case "tools":
          setTools([...tools, newItem as Tables<"tools">])
          break
        case "models":
          setModels([...models, newItem as Tables<"models">])
          break
        default:
          break
      }

      onOpenChange(false)
      setCreating(false)
    } catch (error) {
      toast.error(`Error creating ${contentType.slice(0, -1)}. ${error}.`)
      setCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isTyping && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      buttonRef.current?.click()
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex min-w-[450px] flex-col justify-between overflow-auto"
        side="left"
        onKeyDown={handleKeyDown}
      >
        <div className="grow overflow-auto">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold">
              Create{" "}
              {contentType.charAt(0).toUpperCase() + contentType.slice(1, -1)}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-3">{renderInputs()}</div>
        </div>

        <SheetFooter className="mt-2 flex justify-between">
          <div className="flex grow justify-end space-x-2">
            <Button
              disabled={creating}
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button disabled={creating} ref={buttonRef} onClick={handleCreate}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
