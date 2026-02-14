import { useAttachmentsStore, useChatInputStore } from "@/stores"
import { FC } from "react"
import { usePromptAndCommand } from "./chat-hooks/use-prompt-and-command"
import { FilePicker } from "./file-picker"
import { PromptPicker } from "./prompt-picker"
import { ToolPicker } from "./tool-picker"

interface ChatCommandInputProps {}

export const ChatCommandInput: FC<ChatCommandInputProps> = ({}) => {
  const newMessageFiles = useAttachmentsStore(state => state.newMessageFiles)
  const chatFiles = useAttachmentsStore(state => state.chatFiles)
  const isFilePickerOpen = useChatInputStore(state => state.isFilePickerOpen)
  const setIsFilePickerOpen = useChatInputStore(
    state => state.setIsFilePickerOpen
  )
  const hashtagCommand = useChatInputStore(state => state.hashtagCommand)
  const focusFile = useChatInputStore(state => state.focusFile)

  const { handleSelectUserFile, handleSelectUserCollection } =
    usePromptAndCommand()

  return (
    <>
      <PromptPicker />

      <FilePicker
        isOpen={isFilePickerOpen}
        searchQuery={hashtagCommand}
        onOpenChange={setIsFilePickerOpen}
        selectedFileIds={[...newMessageFiles, ...chatFiles].map(
          file => file.id
        )}
        selectedCollectionIds={[]}
        onSelectFile={handleSelectUserFile}
        onSelectCollection={handleSelectUserCollection}
        isFocused={focusFile}
      />

      <ToolPicker />
    </>
  )
}
