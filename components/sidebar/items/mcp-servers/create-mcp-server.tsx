import { SidebarCreateItem } from "@/components/sidebar/items/all/sidebar-create-item"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TextareaAutosize } from "@/components/ui/textarea-autosize"
import { ChatbotUIContext } from "@/context/context"
import {
  MCP_SERVER_DESCRIPTION_MAX,
  MCP_SERVER_NAME_MAX,
  MCP_SERVER_URL_MAX
} from "@/db/limits"
import { TablesInsert } from "@/supabase/types"
import { FC, useContext, useState } from "react"

interface CreateMcpServerProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

export const CreateMcpServer: FC<CreateMcpServerProps> = ({
  isOpen,
  onOpenChange
}) => {
  const { profile, selectedWorkspace } = useContext(ChatbotUIContext)
  const [isTyping, setIsTyping] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [url, setUrl] = useState("")

  if (!profile) return null
  if (!selectedWorkspace) return null

  return (
    <SidebarCreateItem
      contentType="mcp_servers"
      isOpen={isOpen}
      isTyping={isTyping}
      onOpenChange={onOpenChange}
      createState={
        {
          user_id: profile.user_id,
          name,
          description,
          url
        } as TablesInsert<"mcp_servers">
      }
      renderInputs={() => (
        <>
          <div className="space-y-1">
            <Label>Name</Label>

            <Input
              placeholder="MCP Server name..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={MCP_SERVER_NAME_MAX}
              onCompositionStart={() => setIsTyping(true)}
              onCompositionEnd={() => setIsTyping(false)}
            />
          </div>

          <div className="space-y-1">
            <Label>URL</Label>

            <Input
              placeholder="http://localhost:8000"
              value={url}
              onChange={e => setUrl(e.target.value)}
              maxLength={MCP_SERVER_URL_MAX}
              onCompositionStart={() => setIsTyping(true)}
              onCompositionEnd={() => setIsTyping(false)}
            />
          </div>

          <div className="space-y-1">
            <Label>Description</Label>

            <TextareaAutosize
              placeholder="MCP Server description..."
              value={description}
              onValueChange={setDescription}
              minRows={3}
              maxRows={6}
              onCompositionStart={() => setIsTyping(true)}
              onCompositionEnd={() => setIsTyping(false)}
            />
          </div>
        </>
      )}
    />
  )
}
