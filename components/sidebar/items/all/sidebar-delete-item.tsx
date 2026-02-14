import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { useItemsStore } from "@/stores"
import { deleteChat } from "@/db/chats"
import { deleteCollection } from "@/db/collections"
import { deleteFile } from "@/db/files"
import { deleteMcpServer } from "@/db/mcp-servers"
import { deleteModel } from "@/db/models"
import { deletePrompt } from "@/db/prompts"
import { deleteFileFromStorage } from "@/db/storage/files"
import { deleteTool } from "@/db/tools"
import { Tables } from "@/supabase/types"
import { ContentType, DataItemType } from "@/types"
import { FC, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

interface SidebarDeleteItemProps {
  item: DataItemType
  contentType: ContentType
}

export const SidebarDeleteItem: FC<SidebarDeleteItemProps> = ({
  item,
  contentType
}) => {
  const { t } = useTranslation()
  const setChats = useItemsStore(state => state.setChats)
  const setPrompts = useItemsStore(state => state.setPrompts)
  const setFiles = useItemsStore(state => state.setFiles)
  const setCollections = useItemsStore(state => state.setCollections)
  const setTools = useItemsStore(state => state.setTools)
  const setModels = useItemsStore(state => state.setModels)
  const setMcpServers = useItemsStore(state => state.setMcpServers)

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [showDialog, setShowDialog] = useState(false)

  const deleteFunctions = {
    chats: async (chat: Tables<"chats">) => {
      await deleteChat(chat.id)
    },
    prompts: async (prompt: Tables<"prompts">) => {
      await deletePrompt(prompt.id)
    },
    files: async (file: Tables<"files">) => {
      await deleteFileFromStorage(file.file_path)
      await deleteFile(file.id)
    },
    collections: async (collection: Tables<"collections">) => {
      await deleteCollection(collection.id)
    },
    tools: async (tool: Tables<"tools">) => {
      await deleteTool(tool.id)
    },
    models: async (model: Tables<"models">) => {
      await deleteModel(model.id)
    },
    mcp_servers: async (mcpServer: Tables<"mcp_servers">) => {
      await deleteMcpServer(mcpServer.id)
    }
  }

  const updateStateList = (
    updater: (items: DataItemType[]) => DataItemType[]
  ) => {
    switch (contentType) {
      case "chats":
        setChats(prev => updater(prev as DataItemType[]) as Tables<"chats">[])
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

  const handleDelete = async () => {
    const deleteFunction = deleteFunctions[contentType] as (
      item: unknown
    ) => Promise<void>

    if (!deleteFunction) return

    await deleteFunction(item)

    updateStateList(prevItems =>
      prevItems.filter(prevItem => prevItem.id !== item.id)
    )

    setShowDialog(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.stopPropagation()
      buttonRef.current?.click()
    }
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button className="text-red-500" variant="ghost">
          {t("common.delete")}
        </Button>
      </DialogTrigger>

      <DialogContent onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>
            {t("sidebar.delete", { contentType: contentType.slice(0, -1) })}
          </DialogTitle>

          <DialogDescription>
            {t("sidebar.deleteConfirm", { name: item.name })}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowDialog(false)}>
            {t("common.cancel")}
          </Button>

          <Button ref={buttonRef} variant="destructive" onClick={handleDelete}>
            {t("common.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
