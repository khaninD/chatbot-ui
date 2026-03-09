import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { useChatStore } from "@/stores"
import { Tables } from "@/supabase/types"
import { FC, useState } from "react"
import { Message } from "../messages/message"

interface ChatMessagesProps {}

export const ChatMessages: FC<ChatMessagesProps> = ({}) => {
  const chatMessages = useChatStore(state => state.chatMessages)
  const chatFileItems = useChatStore(state => state.chatFileItems)

  const { handleSendEdit } = useChatHandler()

  const [editingMessage, setEditingMessage] = useState<Tables<"messages">>()

  return chatMessages
    .sort((a, b) => a.message.sequence_number - b.message.sequence_number)
    .map((chatMessage, index, array) => {
      const messageFileItems = chatFileItems.filter(
        (chatFileItem, _, self) =>
          chatMessage.fileItems.includes(chatFileItem.id) &&
          self.findIndex(item => item.id === chatFileItem.id) === _
      )

      return (
        <Message
          key={chatMessage.message.id}
          message={chatMessage.message}
          fileItems={messageFileItems}
          isEditing={editingMessage?.id === chatMessage.message.id}
          isLast={index === array.length - 1}
          onStartEdit={setEditingMessage}
          onCancelEdit={() => setEditingMessage(undefined)}
          onSubmitEdit={handleSendEdit}
          contentBlocks={chatMessage.contentBlocks}
        />
      )
    })
}
