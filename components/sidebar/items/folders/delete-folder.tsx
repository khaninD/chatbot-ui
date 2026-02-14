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
import { deleteFolder } from "@/db/folders"
import { supabase } from "@/lib/supabase/browser-client"
import { Tables } from "@/supabase/types"
import { ContentType } from "@/types"
import { IconTrash } from "@tabler/icons-react"
import { FC, useRef, useState } from "react"
import { toast } from "sonner"

interface DeleteFolderProps {
  folder: Tables<"folders">
  contentType: ContentType
}

export const DeleteFolder: FC<DeleteFolderProps> = ({
  folder,
  contentType
}) => {
  const setChats = useItemsStore(state => state.setChats)
  const setFolders = useItemsStore(state => state.setFolders)
  const setPrompts = useItemsStore(state => state.setPrompts)
  const setFiles = useItemsStore(state => state.setFiles)
  const setCollections = useItemsStore(state => state.setCollections)
  const setTools = useItemsStore(state => state.setTools)
  const setModels = useItemsStore(state => state.setModels)
  const setMcpServers = useItemsStore(state => state.setMcpServers)

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [showFolderDialog, setShowFolderDialog] = useState(false)

  const updateStateList = (
    updater: (
      items: Array<{ id: string; folder_id?: string | null }>
    ) => Array<{ id: string; folder_id?: string | null }>
  ) => {
    switch (contentType) {
      case "chats":
        setChats(prev => updater(prev) as Tables<"chats">[])
        break
      case "prompts":
        setPrompts(prev => updater(prev) as Tables<"prompts">[])
        break
      case "files":
        setFiles(prev => updater(prev) as Tables<"files">[])
        break
      case "collections":
        setCollections(prev => updater(prev) as Tables<"collections">[])
        break
      case "tools":
        setTools(prev => updater(prev) as Tables<"tools">[])
        break
      case "models":
        setModels(prev => updater(prev) as Tables<"models">[])
        break
      case "mcp_servers":
        setMcpServers(prev => updater(prev) as Tables<"mcp_servers">[])
        break
      default:
        break
    }
  }

  const handleDeleteFolderOnly = async () => {
    await deleteFolder(folder.id)

    setFolders(prevState => prevState.filter(c => c.id !== folder.id))

    setShowFolderDialog(false)

    updateStateList(prevItems =>
      prevItems.map(item => {
        if (item.folder_id === folder.id) {
          return {
            ...item,
            folder_id: null
          }
        }

        return item
      })
    )
  }

  const handleDeleteFolderAndItems = async () => {
    const { error } = await supabase
      .from(contentType)
      .delete()
      .eq("folder_id", folder.id)

    if (error) {
      toast.error(error.message)
    }

    updateStateList(prevItems =>
      prevItems.filter(item => item.folder_id !== folder.id)
    )

    handleDeleteFolderOnly()
  }

  return (
    <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
      <DialogTrigger asChild>
        <IconTrash className="hover:opacity-50" size={18} />
      </DialogTrigger>

      <DialogContent className="min-w-[550px]">
        <DialogHeader>
          <DialogTitle>Delete {folder.name}</DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this folder?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowFolderDialog(false)}>
            Cancel
          </Button>

          <Button
            ref={buttonRef}
            variant="destructive"
            onClick={handleDeleteFolderAndItems}
          >
            Delete Folder & Included Items
          </Button>

          <Button
            ref={buttonRef}
            variant="destructive"
            onClick={handleDeleteFolderOnly}
          >
            Delete Folder Only
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
