import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet"
import { AssignWorkspaces } from "@/components/workspace/assign-workspaces"
import { useItemsStore, useProfileStore, useWorkspaceStore } from "@/stores"
import { updateChat } from "@/db/chats"
import {
  createCollectionFile,
  deleteCollectionFile,
  getCollectionFilesByCollectionId
} from "@/db/collection-files"
import {
  createCollectionWorkspaces,
  deleteCollectionWorkspace,
  getCollectionWorkspacesByCollectionId,
  updateCollection
} from "@/db/collections"
import {
  createFileWorkspaces,
  deleteFileWorkspace,
  getFileWorkspacesByFileId,
  updateFile
} from "@/db/files"
import {
  createModelWorkspaces,
  deleteModelWorkspace,
  getModelWorkspacesByModelId,
  updateModel
} from "@/db/models"
import {
  createPresetWorkspaces,
  deletePresetWorkspace,
  getPresetWorkspacesByPresetId,
  updatePreset
} from "@/db/presets"
import {
  createPromptWorkspaces,
  deletePromptWorkspace,
  getPromptWorkspacesByPromptId,
  updatePrompt
} from "@/db/prompts"
import {
  createToolWorkspaces,
  deleteToolWorkspace,
  getToolWorkspacesByToolId,
  updateTool
} from "@/db/tools"
import {
  createMcpServerWorkspaces,
  deleteMcpServerWorkspace,
  getMcpServerWorkspacesByMcpServerId,
  updateMcpServer
} from "@/db/mcp-servers"
import { Tables, TablesUpdate } from "@/supabase/types"
import { CollectionFile, ContentType, DataItemType } from "@/types"
import { FC, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { SidebarDeleteItem } from "./sidebar-delete-item"

interface SidebarUpdateItemProps {
  isTyping: boolean
  item: DataItemType
  contentType: ContentType
  children: React.ReactNode
  renderInputs: (renderState: unknown) => React.JSX.Element
  updateState: unknown
}

export const SidebarUpdateItem: FC<SidebarUpdateItemProps> = ({
  item,
  contentType,
  children,
  renderInputs,
  updateState,
  isTyping
}) => {
  const workspaces = useItemsStore(state => state.workspaces)
  const selectedWorkspace = useWorkspaceStore(state => state.selectedWorkspace)
  const setChats = useItemsStore(state => state.setChats)
  const setPresets = useItemsStore(state => state.setPresets)
  const setPrompts = useItemsStore(state => state.setPrompts)
  const setFiles = useItemsStore(state => state.setFiles)
  const setCollections = useItemsStore(state => state.setCollections)
  const setTools = useItemsStore(state => state.setTools)
  const setModels = useItemsStore(state => state.setModels)
  const setMcpServers = useItemsStore(state => state.setMcpServers)
  const profile = useProfileStore(state => state.profile)

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [startingWorkspaces, setStartingWorkspaces] = useState<
    Tables<"workspaces">[]
  >([])
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<
    Tables<"workspaces">[]
  >([])

  // Collections Render State
  const [startingCollectionFiles, setStartingCollectionFiles] = useState<
    CollectionFile[]
  >([])
  const [selectedCollectionFiles, setSelectedCollectionFiles] = useState<
    CollectionFile[]
  >([])

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        if (workspaces.length > 1) {
          const workspaces = await fetchSelectedWorkspaces()
          setStartingWorkspaces(workspaces)
          setSelectedWorkspaces(workspaces)
        }

        const fetchDataFunction = fetchDataFunctions[contentType]
        if (!fetchDataFunction) return
        await fetchDataFunction(item.id)
      }

      fetchData()
    }
  }, [isOpen])

  const renderState = {
    chats: null,
    presets: null,
    prompts: null,
    files: null,
    collections: {
      startingCollectionFiles,
      setStartingCollectionFiles,
      selectedCollectionFiles,
      setSelectedCollectionFiles
    },
    tools: null,
    models: null,
    mcp_servers: null
  }

  const fetchDataFunctions = {
    chats: null,
    presets: null,
    prompts: null,
    files: null,
    collections: async (collectionId: string) => {
      const collectionFiles =
        await getCollectionFilesByCollectionId(collectionId)
      setStartingCollectionFiles(collectionFiles.files)
      setSelectedCollectionFiles([])
    },
    tools: null,
    models: null,
    mcp_servers: null
  }

  const fetchWorkpaceFunctions = {
    chats: null,
    presets: async (presetId: string) => {
      const item = await getPresetWorkspacesByPresetId(presetId)
      return item.workspaces
    },
    prompts: async (promptId: string) => {
      const item = await getPromptWorkspacesByPromptId(promptId)
      return item.workspaces
    },
    files: async (fileId: string) => {
      const item = await getFileWorkspacesByFileId(fileId)
      return item.workspaces
    },
    collections: async (collectionId: string) => {
      const item = await getCollectionWorkspacesByCollectionId(collectionId)
      return item.workspaces
    },
    tools: async (toolId: string) => {
      const item = await getToolWorkspacesByToolId(toolId)
      return item.workspaces
    },
    models: async (modelId: string) => {
      const item = await getModelWorkspacesByModelId(modelId)
      return item.workspaces
    },
    mcp_servers: async (mcpServerId: string) => {
      const item = await getMcpServerWorkspacesByMcpServerId(mcpServerId)
      return item.workspaces
    }
  }

  const fetchSelectedWorkspaces = async () => {
    const fetchFunction = fetchWorkpaceFunctions[contentType]

    if (!fetchFunction) return []

    const workspaces = await fetchFunction(item.id)

    return workspaces
  }

  const handleWorkspaceUpdates = async (
    startingWorkspaces: Tables<"workspaces">[],
    selectedWorkspaces: Tables<"workspaces">[],
    itemId: string,
    deleteWorkspaceFn: (
      itemId: string,
      workspaceId: string
    ) => Promise<boolean>,
    createWorkspaceFn: (
      workspaces: ({
        user_id: string
        workspace_id: string
      } & Record<string, string>)[]
    ) => Promise<unknown>,
    itemIdKey: string
  ) => {
    if (!selectedWorkspace) return

    const deleteList = startingWorkspaces.filter(
      startingWorkspace =>
        !selectedWorkspaces.some(
          selectedWorkspace => selectedWorkspace.id === startingWorkspace.id
        )
    )

    for (const workspace of deleteList) {
      await deleteWorkspaceFn(itemId, workspace.id)
    }

    if (deleteList.map(w => w.id).includes(selectedWorkspace.id)) {
      updateStateList(prevItems =>
        prevItems.filter(prevItem => prevItem.id !== item.id)
      )
    }

    const createList = selectedWorkspaces.filter(
      selectedWorkspace =>
        !startingWorkspaces.some(
          startingWorkspace => startingWorkspace.id === selectedWorkspace.id
        )
    )

    await createWorkspaceFn(
      createList.map(workspace => {
        return {
          user_id: workspace.user_id,
          [itemIdKey]: itemId,
          workspace_id: workspace.id
        } as { user_id: string; workspace_id: string } & Record<string, string>
      })
    )
  }

  const updateFunctions: Record<
    ContentType,
    (id: string, state: any) => Promise<DataItemType>
  > = {
    chats: updateChat as (
      id: string,
      state: TablesUpdate<"chats">
    ) => Promise<Tables<"chats">>,
    presets: async (presetId: string, updateState: TablesUpdate<"presets">) => {
      const updatedPreset = await updatePreset(presetId, updateState)

      await handleWorkspaceUpdates(
        startingWorkspaces,
        selectedWorkspaces,
        presetId,
        deletePresetWorkspace,
        createPresetWorkspaces as unknown as (
          workspaces: unknown
        ) => Promise<void>,
        "preset_id"
      )

      return updatedPreset
    },
    prompts: async (promptId: string, updateState: TablesUpdate<"prompts">) => {
      const updatedPrompt = await updatePrompt(promptId, updateState)

      await handleWorkspaceUpdates(
        startingWorkspaces,
        selectedWorkspaces,
        promptId,
        deletePromptWorkspace,
        createPromptWorkspaces as unknown as (
          workspaces: unknown
        ) => Promise<void>,
        "prompt_id"
      )

      return updatedPrompt
    },
    files: async (fileId: string, updateState: TablesUpdate<"files">) => {
      const updatedFile = await updateFile(fileId, updateState)

      await handleWorkspaceUpdates(
        startingWorkspaces,
        selectedWorkspaces,
        fileId,
        deleteFileWorkspace,
        createFileWorkspaces as unknown as (
          workspaces: unknown
        ) => Promise<void>,
        "file_id"
      )

      return updatedFile
    },
    collections: async (
      collectionId: string,
      updateState: TablesUpdate<"collections">
    ) => {
      if (!profile) return null as unknown as DataItemType

      const { ...rest } = updateState

      const filesToAdd = selectedCollectionFiles.filter(
        selectedFile =>
          !startingCollectionFiles.some(
            startingFile => startingFile.id === selectedFile.id
          )
      )

      const filesToRemove = startingCollectionFiles.filter(startingFile =>
        selectedCollectionFiles.some(
          selectedFile => selectedFile.id === startingFile.id
        )
      )

      for (const file of filesToAdd) {
        await createCollectionFile({
          user_id: item.user_id,
          collection_id: collectionId,
          file_id: file.id
        })
      }

      for (const file of filesToRemove) {
        await deleteCollectionFile(collectionId, file.id)
      }

      const updatedCollection = await updateCollection(collectionId, rest)

      await handleWorkspaceUpdates(
        startingWorkspaces,
        selectedWorkspaces,
        collectionId,
        deleteCollectionWorkspace,
        createCollectionWorkspaces as unknown as (
          workspaces: unknown
        ) => Promise<void>,
        "collection_id"
      )

      return updatedCollection
    },
    tools: async (toolId: string, updateState: TablesUpdate<"tools">) => {
      const updatedTool = await updateTool(toolId, updateState)

      await handleWorkspaceUpdates(
        startingWorkspaces,
        selectedWorkspaces,
        toolId,
        deleteToolWorkspace,
        createToolWorkspaces as unknown as (
          workspaces: unknown
        ) => Promise<void>,
        "tool_id"
      )

      return updatedTool
    },
    models: async (modelId: string, updateState: TablesUpdate<"models">) => {
      const updatedModel = await updateModel(modelId, updateState)

      await handleWorkspaceUpdates(
        startingWorkspaces,
        selectedWorkspaces,
        modelId,
        deleteModelWorkspace,
        createModelWorkspaces as unknown as (
          workspaces: unknown
        ) => Promise<void>,
        "model_id"
      )

      return updatedModel
    },
    mcp_servers: async (
      mcpServerId: string,
      updateState: TablesUpdate<"mcp_servers">
    ) => {
      const updatedMcpServer = await updateMcpServer(mcpServerId, updateState)

      await handleWorkspaceUpdates(
        startingWorkspaces,
        selectedWorkspaces,
        mcpServerId,
        deleteMcpServerWorkspace,
        createMcpServerWorkspaces as unknown as (
          workspaces: unknown
        ) => Promise<void>,
        "mcp_server_id"
      )

      return updatedMcpServer
    }
  }

  const updateStateList = (
    updater: (items: DataItemType[]) => DataItemType[]
  ) => {
    switch (contentType) {
      case "chats":
        setChats(prev => updater(prev as DataItemType[]) as Tables<"chats">[])
        break
      case "presets":
        setPresets(
          prev => updater(prev as DataItemType[]) as Tables<"presets">[]
        )
        break
      case "prompts":
        setPrompts(
          prev => updater(prev as DataItemType[]) as Tables<"prompts">[]
        )
        break
      case "files":
        setFiles(prev => updater(prev as DataItemType[]) as Tables<"files">[])
        break
      case "collections":
        setCollections(
          prev => updater(prev as DataItemType[]) as Tables<"collections">[]
        )
        break
      case "tools":
        setTools(prev => updater(prev as DataItemType[]) as Tables<"tools">[])
        break
      case "models":
        setModels(prev => updater(prev as DataItemType[]) as Tables<"models">[])
        break
      case "mcp_servers":
        setMcpServers(
          prev => updater(prev as DataItemType[]) as Tables<"mcp_servers">[]
        )
        break
      default:
        break
    }
  }

  const handleUpdate = async () => {
    try {
      const updateFunction = updateFunctions[contentType]
      if (!updateFunction) return
      if (isTyping) return // Prevent update while typing

      const updatedItem = await updateFunction(item.id, updateState)

      updateStateList(prevItems =>
        prevItems.map(prevItem =>
          prevItem.id === item.id ? updatedItem : prevItem
        )
      )

      setIsOpen(false)

      toast.success(`${contentType.slice(0, -1)} updated successfully`)
    } catch (error) {
      toast.error(`Error updating ${contentType.slice(0, -1)}. ${error}`)
    }
  }

  const handleSelectWorkspace = (workspace: Tables<"workspaces">) => {
    setSelectedWorkspaces(prevState => {
      const isWorkspaceAlreadySelected = prevState.find(
        selectedWorkspace => selectedWorkspace.id === workspace.id
      )

      if (isWorkspaceAlreadySelected) {
        return prevState.filter(
          selectedWorkspace => selectedWorkspace.id !== workspace.id
        )
      } else {
        return [...prevState, workspace]
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isTyping && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      buttonRef.current?.click()
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>

      <SheetContent
        className="flex min-w-[450px] flex-col justify-between"
        side="left"
        onKeyDown={handleKeyDown}
      >
        <div className="grow overflow-auto">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold">
              Edit {contentType.slice(0, -1)}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            {workspaces.length > 1 && (
              <div className="space-y-1">
                <Label>Assigned Workspaces</Label>

                <AssignWorkspaces
                  selectedWorkspaces={selectedWorkspaces}
                  onSelectWorkspace={handleSelectWorkspace}
                />
              </div>
            )}

            {renderInputs(renderState[contentType])}
          </div>
        </div>

        <SheetFooter className="mt-2 flex justify-between">
          <SidebarDeleteItem item={item} contentType={contentType} />

          <div className="flex grow justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>

            <Button ref={buttonRef} onClick={handleUpdate}>
              Save
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
