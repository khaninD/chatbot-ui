import {
  useChatInputStore,
  useChatRuntimeStore,
  useChatStore,
  useToolStore
} from "@/stores"
import useHotkey from "@/lib/hooks/use-hotkey"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { cn } from "@/lib/utils"
import {
  IconBolt,
  IconCirclePlus,
  IconPlayerStopFilled,
  IconSend
} from "@tabler/icons-react"
import { FC, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Input } from "../ui/input"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { ChatCommandInput } from "./chat-command-input"
import { ChatFilesDisplay } from "./chat-files-display"
import { useChatHandler } from "./chat-hooks/use-chat-handler"
import { useChatHistoryHandler } from "./chat-hooks/use-chat-history"
import { usePromptAndCommand } from "./chat-hooks/use-prompt-and-command"
import { useSelectFileHandler } from "./chat-hooks/use-select-file-handler"

interface ChatInputProps {}

export const ChatInput: FC<ChatInputProps> = ({}) => {
  const { t } = useTranslation()

  useHotkey("l", () => {
    handleFocusChatInput()
  })

  const [isTyping, setIsTyping] = useState<boolean>(false)

  const focusPrompt = useChatInputStore(state => state.focusPrompt)
  const setFocusPrompt = useChatInputStore(state => state.setFocusPrompt)
  const focusFile = useChatInputStore(state => state.focusFile)
  const setFocusFile = useChatInputStore(state => state.setFocusFile)
  const focusTool = useChatInputStore(state => state.focusTool)
  const setFocusTool = useChatInputStore(state => state.setFocusTool)
  const isToolPickerOpen = useChatInputStore(state => state.isToolPickerOpen)
  const isPromptPickerOpen = useChatInputStore(
    state => state.isPromptPickerOpen
  )
  const setIsPromptPickerOpen = useChatInputStore(
    state => state.setIsPromptPickerOpen
  )
  const isFilePickerOpen = useChatInputStore(state => state.isFilePickerOpen)

  const userInput = useChatStore(state => state.userInput)
  const setUserInput = useChatStore(state => state.setUserInput)
  const chatMessages = useChatStore(state => state.chatMessages)
  const chatSettings = useChatStore(state => state.chatSettings)

  const isGenerating = useChatRuntimeStore(state => state.isGenerating)
  const selectedTools = useToolStore(state => state.selectedTools)
  const setSelectedTools = useToolStore(state => state.setSelectedTools)

  const {
    chatInputRef,
    handleSendMessage,
    handleStopMessage,
    handleFocusChatInput
  } = useChatHandler()

  const handleInputChange = (value: string) => {
    const slashTextRegex = /\/([^ ]*)$/
    const hashtagTextRegex = /#([^ ]*)$/
    const toolTextRegex = /!([^ ]*)$/
    const slashMatch = value.match(slashTextRegex)
    const hashtagMatch = value.match(hashtagTextRegex)
    const toolMatch = value.match(toolTextRegex)

    if (slashMatch) {
      setIsPromptPickerOpen(true)
      // setSlashCommand(slashMatch[1])
    } else if (hashtagMatch) {
      // setIsFilePickerOpen(true)
      // setHashtagCommand(hashtagMatch[1])
    } else if (toolMatch) {
      // setIsToolPickerOpen(true)
      // setToolCommand(toolMatch[1])
    } else {
      setIsPromptPickerOpen(false)
      // setIsFilePickerOpen(false)
      // setIsToolPickerOpen(false)
    }

    setUserInput(value)
  }

  const { filesToAccept, handleSelectDeviceFile } = useSelectFileHandler()

  const {
    setNewMessageContentToNextUserMessage,
    setNewMessageContentToPreviousUserMessage
  } = useChatHistoryHandler()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isTyping && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      setIsPromptPickerOpen(false)
      handleSendMessage(userInput, chatMessages, false)
    }

    // Consolidate conditions to avoid TypeScript error
    if (isPromptPickerOpen || isFilePickerOpen || isToolPickerOpen) {
      if (
        event.key === "Tab" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown"
      ) {
        event.preventDefault()
        // Toggle focus based on picker type
        if (isPromptPickerOpen) setFocusPrompt(!focusPrompt)
        if (isFilePickerOpen) setFocusFile(!focusFile)
        if (isToolPickerOpen) setFocusTool(!focusTool)
      }
    }

    if (event.key === "ArrowUp" && event.shiftKey && event.ctrlKey) {
      event.preventDefault()
      setNewMessageContentToPreviousUserMessage()
    }

    if (event.key === "ArrowDown" && event.shiftKey && event.ctrlKey) {
      event.preventDefault()
      setNewMessageContentToNextUserMessage()
    }

    //use shift+ctrl+up and shift+ctrl+down to navigate through chat history
    if (event.key === "ArrowUp" && event.shiftKey && event.ctrlKey) {
      event.preventDefault()
      setNewMessageContentToPreviousUserMessage()
    }

    if (event.key === "ArrowDown" && event.shiftKey && event.ctrlKey) {
      event.preventDefault()
      setNewMessageContentToNextUserMessage()
    }
  }

  const handlePaste = (event: React.ClipboardEvent) => {
    const imagesAllowed = LLM_LIST.find(
      llm => llm.modelId === chatSettings?.model
    )?.imageInput

    const items = event.clipboardData.items
    for (const item of items) {
      if (item.type.indexOf("image") === 0) {
        if (!imagesAllowed) {
          toast.error(
            `Images are not supported for this model. Use models like GPT-4 Vision instead.`
          )
          return
        }
        const file = item.getAsFile()
        if (!file) return
        handleSelectDeviceFile(file)
      }
    }
  }

  return (
    <>
      <div className="flex flex-col flex-wrap justify-center gap-2">
        <ChatFilesDisplay />

        {selectedTools &&
          selectedTools.map((tool, index) => (
            <div
              key={index}
              className="flex justify-center"
              onClick={() =>
                setSelectedTools(
                  selectedTools.filter(
                    selectedTool => selectedTool.id !== tool.id
                  )
                )
              }
            >
              <div className="flex cursor-pointer items-center justify-center space-x-1 rounded-lg bg-purple-600 px-3 py-1 hover:opacity-50">
                <IconBolt size={20} />

                <div>{tool.name}</div>
              </div>
            </div>
          ))}
      </div>

      <div className="relative mt-3 flex min-h-[60px] w-full items-center justify-center rounded-xl border-2 border-input">
        <div className="absolute bottom-[76px] left-0 max-h-[300px] w-full overflow-auto rounded-xl dark:border-none">
          <ChatCommandInput />
        </div>

        <>
          <IconCirclePlus
            className="absolute bottom-[12px] left-3 cursor-pointer p-1 hover:opacity-50"
            size={32}
            onClick={() => fileInputRef.current?.click()}
          />

          {/* Hidden input to select files from device */}
          <Input
            ref={fileInputRef}
            className="hidden"
            type="file"
            onChange={e => {
              if (!e.target.files) return
              handleSelectDeviceFile(e.target.files[0])
            }}
            accept={filesToAccept}
          />
        </>

        <TextareaAutosize
          textareaRef={chatInputRef}
          className="text-md flex w-full resize-none rounded-md border-none bg-transparent px-14 py-2 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={t("chat.askAnything")}
          onValueChange={handleInputChange}
          value={userInput}
          minRows={1}
          maxRows={18}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onCompositionStart={() => setIsTyping(true)}
          onCompositionEnd={() => setIsTyping(false)}
        />

        <div className="absolute bottom-[14px] right-3 cursor-pointer hover:opacity-50">
          {isGenerating ? (
            <IconPlayerStopFilled
              className="animate-pulse rounded bg-transparent p-1 hover:bg-background"
              onClick={handleStopMessage}
              size={30}
            />
          ) : (
            <IconSend
              className={cn(
                "rounded bg-primary p-1 text-secondary",
                !userInput && "cursor-not-allowed opacity-50"
              )}
              onClick={() => {
                if (!userInput) return

                handleSendMessage(userInput, chatMessages, false)
              }}
              size={30}
            />
          )}
        </div>
      </div>
    </>
  )
}
