import {
  useAttachmentsStore,
  useChatInputStore,
  useChatStore,
  useRetrievalStore,
  useToolStore
} from "@/stores"
import { Tables } from "@/supabase/types"

export const usePromptAndCommand = () => {
  const chatFiles = useAttachmentsStore(state => state.chatFiles)
  const newMessageFiles = useAttachmentsStore(state => state.newMessageFiles)
  const setNewMessageFiles = useAttachmentsStore(
    state => state.setNewMessageFiles
  )
  const userInput = useChatStore(state => state.userInput)
  const setUserInput = useChatStore(state => state.setUserInput)
  const setShowFilesDisplay = useAttachmentsStore(
    state => state.setShowFilesDisplay
  )
  const setIsPromptPickerOpen = useChatInputStore(
    state => state.setIsPromptPickerOpen
  )
  const setIsFilePickerOpen = useChatInputStore(
    state => state.setIsFilePickerOpen
  )
  const setSlashCommand = useChatInputStore(state => state.setSlashCommand)
  const setHashtagCommand = useChatInputStore(state => state.setHashtagCommand)
  const setUseRetrieval = useRetrievalStore(state => state.setUseRetrieval)
  const setToolCommand = useChatInputStore(state => state.setToolCommand)
  const setIsToolPickerOpen = useChatInputStore(
    state => state.setIsToolPickerOpen
  )
  const selectedTools = useToolStore(state => state.selectedTools)
  const setSelectedTools = useToolStore(state => state.setSelectedTools)
  const setChatFiles = useAttachmentsStore(state => state.setChatFiles)

  const handleInputChange = (value: string) => {
    const slashTextRegex = /\/([^ ]*)$/
    const hashtagTextRegex = /#([^ ]*)$/
    const toolTextRegex = /!([^ ]*)$/
    const slashMatch = value.match(slashTextRegex)
    const hashtagMatch = value.match(hashtagTextRegex)
    const toolMatch = value.match(toolTextRegex)

    if (slashMatch) {
      setIsPromptPickerOpen(true)
      setSlashCommand(slashMatch[1])
    } /* else if (hashtagMatch) {
      setIsFilePickerOpen(true)
      setHashtagCommand(hashtagMatch[1])
    } */ /* else if (toolMatch) {
      setIsToolPickerOpen(true)
      setToolCommand(toolMatch[1])
    } */ else {
      setIsPromptPickerOpen(false)
      setIsFilePickerOpen(false)
      setIsToolPickerOpen(false)
      setSlashCommand("")
      setHashtagCommand("")
      setToolCommand("")
    }

    setUserInput(value)
  }

  const handleSelectPrompt = (prompt: Tables<"prompts">) => {
    setIsPromptPickerOpen(false)
    setUserInput(userInput.replace(/\/[^ ]*$/, "") + prompt.content)
  }

  const handleSelectUserFile = async (file: Tables<"files">) => {
    setShowFilesDisplay(true)
    setIsFilePickerOpen(false)
    setUseRetrieval(true)

    const fileAlreadySelected =
      newMessageFiles.some(prevFile => prevFile.id === file.id) ||
      chatFiles.some(chatFile => chatFile.id === file.id)

    if (!fileAlreadySelected) {
      setNewMessageFiles([
        ...newMessageFiles,
        {
          id: file.id,
          name: file.name,
          type: file.type,
          file: null
        }
      ])
    }

    setUserInput(userInput.replace(/#[^ ]*$/, ""))
  }

  const handleSelectTool = (tool: Tables<"tools">) => {
    setIsToolPickerOpen(false)
    setUserInput(userInput.replace(/![^ ]*$/, ""))
    setSelectedTools([...selectedTools, tool])
  }

  return {
    handleInputChange,
    handleSelectPrompt,
    handleSelectUserFile,
    handleSelectTool
  }
}
