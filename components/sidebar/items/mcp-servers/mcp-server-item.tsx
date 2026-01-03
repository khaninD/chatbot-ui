import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TextareaAutosize } from "@/components/ui/textarea-autosize"
import {
  MCP_SERVER_DESCRIPTION_MAX,
  MCP_SERVER_NAME_MAX,
  MCP_SERVER_URL_MAX
} from "@/db/limits"
import { Tables } from "@/supabase/types"
import { IconPlugConnected } from "@tabler/icons-react"
import { FC, useState } from "react"
import { SidebarItem } from "../all/sidebar-display-item"

interface McpServerItemProps {
  mcpServer: Tables<"mcp_servers">
}

export const McpServerItem: FC<McpServerItemProps> = ({ mcpServer }) => {
  const [name, setName] = useState(mcpServer.name)
  const [description, setDescription] = useState(mcpServer.description)
  const [url, setUrl] = useState(mcpServer.url)
  const [isTyping, setIsTyping] = useState(false)

  return (
    <SidebarItem
      item={mcpServer}
      isTyping={isTyping}
      contentType="mcp_servers"
      icon={<IconPlugConnected size={30} />}
      updateState={{ name, description, url }}
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
