import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { useItemsStore, useProfileStore, useWorkspaceStore } from "@/stores"
import { createFolder } from "@/db/folders"
import { ContentType } from "@/types"
import { IconFolderPlus, IconPlus } from "@tabler/icons-react"
import { FC, useState } from "react"
import { Button } from "../ui/button"
import { CreateCollection } from "./items/collections/create-collection"
import { CreateFile } from "./items/files/create-file"
import { CreateMcpServer } from "./items/mcp-servers/create-mcp-server"
import { CreateModel } from "./items/models/create-model"
import { CreatePrompt } from "./items/prompts/create-prompt"
import { CreateTool } from "./items/tools/create-tool"

interface SidebarCreateButtonsProps {
  contentType: ContentType
  hasData: boolean
}

export const SidebarCreateButtons: FC<SidebarCreateButtonsProps> = ({
  contentType,
  hasData
}) => {
  const profile = useProfileStore(state => state.profile)
  const selectedWorkspace = useWorkspaceStore(state => state.selectedWorkspace)
  const folders = useItemsStore(state => state.folders)
  const setFolders = useItemsStore(state => state.setFolders)
  const { handleNewChat } = useChatHandler()

  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false)
  const [isCreatingFile, setIsCreatingFile] = useState(false)
  const [isCreatingCollection, setIsCreatingCollection] = useState(false)
  const [isCreatingTool, setIsCreatingTool] = useState(false)
  const [isCreatingModel, setIsCreatingModel] = useState(false)
  const [isCreatingMcpServer, setIsCreatingMcpServer] = useState(false)

  const handleCreateFolder = async () => {
    if (!profile) return
    if (!selectedWorkspace) return

    const createdFolder = await createFolder({
      user_id: profile.user_id,
      workspace_id: selectedWorkspace.id,
      name: "New Folder",
      description: "",
      type: contentType
    })
    setFolders([...folders, createdFolder])
  }

  const getCreateFunction = () => {
    switch (contentType) {
      case "chats":
        return async () => {
          handleNewChat()
        }

      case "prompts":
        return async () => {
          setIsCreatingPrompt(true)
        }

      case "files":
        return async () => {
          setIsCreatingFile(true)
        }

      case "collections":
        return async () => {
          setIsCreatingCollection(true)
        }

      case "tools":
        return async () => {
          setIsCreatingTool(true)
        }

      case "models":
        return async () => {
          setIsCreatingModel(true)
        }

      case "mcp_servers":
        return async () => {
          setIsCreatingMcpServer(true)
        }

      default:
        break
    }
  }

  return (
    <div className="flex w-full space-x-2">
      <Button className="flex h-[36px] grow" onClick={getCreateFunction()}>
        <IconPlus className="mr-1" size={20} />
        New{" "}
        {contentType.charAt(0).toUpperCase() +
          contentType.slice(1, contentType.length - 1)}
      </Button>

      {hasData && (
        <Button className="size-[36px] p-1" onClick={handleCreateFolder}>
          <IconFolderPlus size={20} />
        </Button>
      )}

      {isCreatingPrompt && (
        <CreatePrompt
          isOpen={isCreatingPrompt}
          onOpenChange={setIsCreatingPrompt}
        />
      )}

      {isCreatingFile && (
        <CreateFile isOpen={isCreatingFile} onOpenChange={setIsCreatingFile} />
      )}

      {isCreatingCollection && (
        <CreateCollection
          isOpen={isCreatingCollection}
          onOpenChange={setIsCreatingCollection}
        />
      )}

      {isCreatingTool && (
        <CreateTool isOpen={isCreatingTool} onOpenChange={setIsCreatingTool} />
      )}

      {isCreatingModel && (
        <CreateModel
          isOpen={isCreatingModel}
          onOpenChange={setIsCreatingModel}
        />
      )}

      {isCreatingMcpServer && (
        <CreateMcpServer
          isOpen={isCreatingMcpServer}
          onOpenChange={setIsCreatingMcpServer}
        />
      )}
    </div>
  )
}
