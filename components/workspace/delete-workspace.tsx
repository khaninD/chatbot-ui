import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
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
import { useItemsStore, useWorkspaceStore } from "@/stores"
import { deleteWorkspace } from "@/db/workspaces"
import { Tables } from "@/supabase/types"
import { FC, useRef, useState } from "react"
import { Input } from "../ui/input"
import { useRouter } from "next/navigation"

interface DeleteWorkspaceProps {
  workspace: Tables<"workspaces">
  onDelete: () => void
}

export const DeleteWorkspace: FC<DeleteWorkspaceProps> = ({
  workspace,
  onDelete
}) => {
  const workspaces = useItemsStore(state => state.workspaces)
  const setWorkspaces = useItemsStore(state => state.setWorkspaces)
  const setSelectedWorkspace = useWorkspaceStore(
    state => state.setSelectedWorkspace
  )
  const { handleNewChat } = useChatHandler()
  const router = useRouter()

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [showWorkspaceDialog, setShowWorkspaceDialog] = useState(false)

  const [name, setName] = useState("")

  const handleDeleteWorkspace = async () => {
    await deleteWorkspace(workspace.id)

    const filteredWorkspaces = workspaces.filter(w => w.id !== workspace.id)
    setWorkspaces(filteredWorkspaces)

    const defaultWorkspace = filteredWorkspaces[0]
    if (defaultWorkspace) {
      setSelectedWorkspace(defaultWorkspace)
      router.push(`/${defaultWorkspace.id}/chat`)
    }

    setShowWorkspaceDialog(false)
    onDelete()

    handleNewChat()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      buttonRef.current?.click()
    }
  }

  return (
    <Dialog open={showWorkspaceDialog} onOpenChange={setShowWorkspaceDialog}>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete</Button>
      </DialogTrigger>

      <DialogContent onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Delete {workspace.name}</DialogTitle>

          <DialogDescription className="space-y-1">
            WARNING: Deleting a workspace will delete all of its data.
          </DialogDescription>
        </DialogHeader>

        <Input
          className="mt-4"
          placeholder="Type the name of this workspace to confirm"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowWorkspaceDialog(false)}>
            Cancel
          </Button>

          <Button
            ref={buttonRef}
            variant="destructive"
            onClick={handleDeleteWorkspace}
            disabled={name !== workspace.name}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
