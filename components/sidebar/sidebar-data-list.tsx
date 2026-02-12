import { useItemsStore } from "@/stores"
import { updateAssistant } from "@/db/assistants"
import { updateChat } from "@/db/chats"
import { updateCollection } from "@/db/collections"
import { updateFile } from "@/db/files"
import { updateMcpServer } from "@/db/mcp-servers"
import { updateModel } from "@/db/models"
import { updatePreset } from "@/db/presets"
import { updatePrompt } from "@/db/prompts"
import { updateTool } from "@/db/tools"
import { cn } from "@/lib/utils"
import { Tables } from "@/supabase/types"
import { ContentType, DataItemType, DataListType } from "@/types"
import { FC, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Separator } from "../ui/separator"
import { AssistantItem } from "./items/assistants/assistant-item"
import { ChatItem } from "./items/chat/chat-item"
import { CollectionItem } from "./items/collections/collection-item"
import { FileItem } from "./items/files/file-item"
import { Folder } from "./items/folders/folder-item"
import { McpServerItem } from "./items/mcp-servers/mcp-server-item"
import { ModelItem } from "./items/models/model-item"
import { PresetItem } from "./items/presets/preset-item"
import { PromptItem } from "./items/prompts/prompt-item"
import { ToolItem } from "./items/tools/tool-item"

interface SidebarDataListProps {
  contentType: ContentType
  data: DataListType
  folders: Tables<"folders">[]
}

export const SidebarDataList: FC<SidebarDataListProps> = ({
  contentType,
  data,
  folders
}) => {
  const { t } = useTranslation()
  const setChats = useItemsStore(state => state.setChats)
  const setPresets = useItemsStore(state => state.setPresets)
  const setPrompts = useItemsStore(state => state.setPrompts)
  const setFiles = useItemsStore(state => state.setFiles)
  const setCollections = useItemsStore(state => state.setCollections)
  const setAssistants = useItemsStore(state => state.setAssistants)
  const setTools = useItemsStore(state => state.setTools)
  const setModels = useItemsStore(state => state.setModels)
  const setMcpServers = useItemsStore(state => state.setMcpServers)

  const divRef = useRef<HTMLDivElement>(null)

  const [isOverflowing, setIsOverflowing] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const getDataListComponent = (
    contentType: ContentType,
    item: DataItemType
  ) => {
    switch (contentType) {
      case "chats":
        return <ChatItem key={item.id} chat={item as Tables<"chats">} />

      case "presets":
        return <PresetItem key={item.id} preset={item as Tables<"presets">} />

      case "prompts":
        return <PromptItem key={item.id} prompt={item as Tables<"prompts">} />

      case "files":
        return <FileItem key={item.id} file={item as Tables<"files">} />

      case "collections":
        return (
          <CollectionItem
            key={item.id}
            collection={item as Tables<"collections">}
          />
        )

      case "assistants":
        return (
          <AssistantItem
            key={item.id}
            assistant={item as Tables<"assistants">}
          />
        )

      case "tools":
        return <ToolItem key={item.id} tool={item as Tables<"tools">} />

      case "models":
        return <ModelItem key={item.id} model={item as Tables<"models">} />

      case "mcp_servers":
        return (
          <McpServerItem
            key={item.id}
            mcpServer={item as Tables<"mcp_servers">}
          />
        )

      default:
        return null
    }
  }

  const getSortedData = (
    data: DataListType,
    dateCategory: "Today" | "Yesterday" | "Previous Week" | "Older"
  ) => {
    const typedData = data as DataItemType[]
    const now = new Date()
    const todayStart = new Date(now.setHours(0, 0, 0, 0))
    const yesterdayStart = new Date(
      new Date().setDate(todayStart.getDate() - 1)
    )
    const oneWeekAgoStart = new Date(
      new Date().setDate(todayStart.getDate() - 7)
    )

    return typedData
      .filter(item => {
        const itemDate = new Date(item.updated_at || item.created_at)
        switch (dateCategory) {
          case "Today":
            return itemDate >= todayStart
          case "Yesterday":
            return itemDate >= yesterdayStart && itemDate < todayStart
          case "Previous Week":
            return itemDate >= oneWeekAgoStart && itemDate < yesterdayStart
          case "Older":
            return itemDate < oneWeekAgoStart
          default:
            return true
        }
      })
      .sort((a: DataItemType, b: DataItemType) => {
        const aDate = new Date(a.updated_at || a.created_at || 0).getTime()
        const bDate = new Date(b.updated_at || b.created_at || 0).getTime()
        return bDate - aDate
      })
  }

  const updateFunctions = {
    chats: updateChat,
    presets: updatePreset,
    prompts: updatePrompt,
    files: updateFile,
    collections: updateCollection,
    assistants: updateAssistant,
    tools: updateTool,
    models: updateModel,
    mcp_servers: updateMcpServer
  }

  const updateFolder = async (itemId: string, folderId: string | null) => {
    const item = (data as DataItemType[]).find(item => item.id === itemId)

    if (!item) return null

    const updateFunction = updateFunctions[contentType]
    if (!updateFunction) return

    const updatedItem = await updateFunction(item.id, {
      folder_id: folderId
    })

    const updatedItems = (data as DataItemType[]).map(item =>
      item.id === updatedItem.id ? updatedItem : item
    )

    switch (contentType) {
      case "chats":
        setChats(updatedItems as Tables<"chats">[])
        break
      case "presets":
        setPresets(updatedItems as Tables<"presets">[])
        break
      case "prompts":
        setPrompts(updatedItems as Tables<"prompts">[])
        break
      case "files":
        setFiles(updatedItems as Tables<"files">[])
        break
      case "collections":
        setCollections(updatedItems as Tables<"collections">[])
        break
      case "assistants":
        setAssistants(updatedItems as Tables<"assistants">[])
        break
      case "tools":
        setTools(updatedItems as Tables<"tools">[])
        break
      case "models":
        setModels(updatedItems as Tables<"models">[])
        break
      case "mcp_servers":
        setMcpServers(updatedItems as Tables<"mcp_servers">[])
        break
      default:
        break
    }
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData("text/plain", id)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()

    const target = e.target as Element

    if (!target.closest("#folder")) {
      const itemId = e.dataTransfer.getData("text/plain")
      updateFolder(itemId, null)
    }

    setIsDragOver(false)
  }

  useEffect(() => {
    if (divRef.current) {
      setIsOverflowing(
        divRef.current.scrollHeight > divRef.current.clientHeight
      )
    }
  }, [data])

  const dataWithFolders = data.filter(item => item.folder_id)
  const dataWithoutFolders = data.filter(item => item.folder_id === null)

  return (
    <>
      <div
        ref={divRef}
        className="mt-2 flex flex-col overflow-auto"
        onDrop={handleDrop}
      >
        {data.length === 0 && (
          <div className="flex grow flex-col items-center justify-center">
            <div className=" text-centertext-muted-foreground p-8 text-lg italic">
              {t("sidebar.noContent", { contentType })}
            </div>
          </div>
        )}

        {(dataWithFolders.length > 0 || dataWithoutFolders.length > 0) && (
          <div
            className={`h-full ${
              isOverflowing ? "w-[calc(100%-8px)]" : "w-full"
            } space-y-2 pt-2 ${isOverflowing ? "mr-2" : ""}`}
          >
            {folders.map(folder => (
              <Folder
                key={folder.id}
                folder={folder}
                onUpdateFolder={updateFolder}
                contentType={contentType}
              >
                {dataWithFolders
                  .filter(item => item.folder_id === folder.id)
                  .map(item => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={e => handleDragStart(e, item.id)}
                    >
                      {getDataListComponent(contentType, item)}
                    </div>
                  ))}
              </Folder>
            ))}

            {folders.length > 0 && <Separator />}

            {contentType === "chats" ? (
              <>
                {[
                  { key: "Today", translation: "sidebar.today" },
                  { key: "Yesterday", translation: "sidebar.yesterday" },
                  { key: "Previous Week", translation: "sidebar.previousWeek" },
                  { key: "Older", translation: "sidebar.older" }
                ].map(({ key: dateCategory, translation }) => {
                  const sortedData = getSortedData(
                    dataWithoutFolders as DataListType,
                    dateCategory as
                      | "Today"
                      | "Yesterday"
                      | "Previous Week"
                      | "Older"
                  )

                  return (
                    sortedData.length > 0 && (
                      <div key={dateCategory} className="pb-2">
                        <div className="mb-1 text-sm font-bold text-muted-foreground">
                          {t(translation)}
                        </div>

                        <div
                          className={cn(
                            "flex grow flex-col",
                            isDragOver && "bg-accent"
                          )}
                          onDrop={handleDrop}
                          onDragEnter={handleDragEnter}
                          onDragLeave={handleDragLeave}
                          onDragOver={handleDragOver}
                        >
                          {sortedData.map(item => (
                            <div
                              key={item.id}
                              draggable
                              onDragStart={e => handleDragStart(e, item.id)}
                            >
                              {getDataListComponent(contentType, item)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )
                })}
              </>
            ) : (
              <div
                className={cn("flex grow flex-col", isDragOver && "bg-accent")}
                onDrop={handleDrop}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
              >
                {dataWithoutFolders.map(item => {
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={e => handleDragStart(e, item.id)}
                    >
                      {getDataListComponent(contentType, item)}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className={cn("flex grow", isDragOver && "bg-accent")}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
      />
    </>
  )
}
