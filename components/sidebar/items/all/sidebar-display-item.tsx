import { useAssistantStore, useItemsStore, useWorkspaceStore } from "@/stores"
import { createChat } from "@/db/chats"
import { cn } from "@/lib/utils"
import { Tables } from "@/supabase/types"
import { ContentType, DataItemType } from "@/types"
import { useRouter } from "next/navigation"
import { FC, useRef, useState } from "react"
import { SidebarUpdateItem } from "./sidebar-update-item"

interface SidebarItemProps {
  item: DataItemType
  isTyping: boolean
  contentType: ContentType
  icon: React.ReactNode
  updateState: unknown
  renderInputs: (renderState: unknown) => React.JSX.Element
}

export const SidebarItem: FC<SidebarItemProps> = ({
  item,
  contentType,
  updateState,
  renderInputs,
  icon,
  isTyping
}) => {
  const selectedWorkspace = useWorkspaceStore(state => state.selectedWorkspace)
  const chats = useItemsStore(state => state.chats)
  const setChats = useItemsStore(state => state.setChats)
  const setSelectedAssistant = useAssistantStore(
    state => state.setSelectedAssistant
  )

  const router = useRouter()

  const itemRef = useRef<HTMLDivElement>(null)

  const [isHovering, setIsHovering] = useState(false)

  const actionMap: Record<ContentType, (item: DataItemType) => Promise<void>> =
    {
      chats: async () => {},
      presets: async () => {},
      prompts: async () => {},
      files: async () => {},
      collections: async () => {},
      assistants: async (assistant: Tables<"assistants">) => {
        if (!selectedWorkspace) return

        const createdChat = await createChat({
          user_id: assistant.user_id,
          workspace_id: selectedWorkspace.id,
          assistant_id: assistant.id,
          context_length: assistant.context_length,
          include_profile_context: assistant.include_profile_context,
          include_workspace_instructions:
            assistant.include_workspace_instructions,
          model: assistant.model,
          name: `Chat with ${assistant.name}`,
          prompt: assistant.prompt,
          temperature: assistant.temperature,
          embeddings_provider: assistant.embeddings_provider
        })

        setChats([createdChat, ...chats])
        setSelectedAssistant(assistant)

        return router.push(`/${selectedWorkspace.id}/chat/${createdChat.id}`)
      },
      tools: async () => {},
      models: async () => {},
      mcp_servers: async () => {}
    }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.stopPropagation()
      itemRef.current?.click()
    }
  }

  // const handleClickAction = async (
  //   e: React.MouseEvent<SVGSVGElement, MouseEvent>
  // ) => {
  //   e.stopPropagation()

  //   const action = actionMap[contentType]

  //   await action(item as any)
  // }

  return (
    <SidebarUpdateItem
      item={item}
      isTyping={isTyping}
      contentType={contentType}
      updateState={updateState}
      renderInputs={renderInputs}
    >
      <div
        ref={itemRef}
        className={cn(
          "flex w-full cursor-pointer items-center rounded p-2 hover:bg-accent hover:opacity-50 focus:outline-none"
        )}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {icon}

        <div className="ml-3 flex-1 truncate text-sm font-semibold">
          {item.name}
        </div>

        {/* TODO */}
        {/* {isHovering && (
          <WithTooltip
            delayDuration={1000}
            display={<div>Start chat with {contentType.slice(0, -1)}</div>}
            trigger={
              <IconSquarePlus
                className="cursor-pointer hover:text-blue-500"
                size={20}
                onClick={handleClickAction}
              />
            }
          />
        )} */}
      </div>
    </SidebarUpdateItem>
  )
}
