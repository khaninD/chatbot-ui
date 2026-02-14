import {
  useAssistantStore,
  useAttachmentsStore,
  useChatInputStore,
  useChatStore,
  useRetrievalStore,
  useToolStore
} from "@/stores"
import { getAssistantCollectionsByAssistantId } from "@/db/assistant-collections"
import { getAssistantFilesByAssistantId } from "@/db/assistant-files"
import { getAssistantToolsByAssistantId } from "@/db/assistant-tools"
import { getCollectionFilesByCollectionId } from "@/db/collection-files"
import { Tables } from "@/supabase/types"
import { LLMID } from "@/types"

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
  const setAtCommand = useChatInputStore(state => state.setAtCommand)
  const setIsAssistantPickerOpen = useChatInputStore(
    state => state.setIsAssistantPickerOpen
  )
  const setSelectedAssistant = useAssistantStore(
    state => state.setSelectedAssistant
  )
  const setChatSettings = useChatStore(state => state.setChatSettings)
  const setChatFiles = useAttachmentsStore(state => state.setChatFiles)

  const handleInputChange = (value: string) => {
    const atTextRegex = /@([^ ]*)$/
    const slashTextRegex = /\/([^ ]*)$/
    const hashtagTextRegex = /#([^ ]*)$/
    const toolTextRegex = /!([^ ]*)$/
    const atMatch = value.match(atTextRegex)
    const slashMatch = value.match(slashTextRegex)
    const hashtagMatch = value.match(hashtagTextRegex)
    const toolMatch = value.match(toolTextRegex)

    if (atMatch) {
      setIsAssistantPickerOpen(true)
      setAtCommand(atMatch[1])
    } else if (slashMatch) {
      setIsPromptPickerOpen(true)
      setSlashCommand(slashMatch[1])
    } else if (hashtagMatch) {
      setIsFilePickerOpen(true)
      setHashtagCommand(hashtagMatch[1])
    } else if (toolMatch) {
      setIsToolPickerOpen(true)
      setToolCommand(toolMatch[1])
    } else {
      setIsPromptPickerOpen(false)
      setIsFilePickerOpen(false)
      setIsToolPickerOpen(false)
      setIsAssistantPickerOpen(false)
      setSlashCommand("")
      setHashtagCommand("")
      setToolCommand("")
      setAtCommand("")
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

  const handleSelectUserCollection = async (
    collection: Tables<"collections">
  ) => {
    setShowFilesDisplay(true)
    setIsFilePickerOpen(false)
    setUseRetrieval(true)

    const collectionFiles = await getCollectionFilesByCollectionId(
      collection.id
    )

    const newFiles = collectionFiles.files
      .filter(
        file =>
          !newMessageFiles.some(prevFile => prevFile.id === file.id) &&
          !chatFiles.some(chatFile => chatFile.id === file.id)
      )
      .map(file => ({
        id: file.id,
        name: file.name,
        type: file.type,
        file: null
      }))

    if (newFiles.length > 0) {
      setNewMessageFiles([...newMessageFiles, ...newFiles])
    }

    setUserInput(userInput.replace(/#[^ ]*$/, ""))
  }

  const handleSelectTool = (tool: Tables<"tools">) => {
    setIsToolPickerOpen(false)
    setUserInput(userInput.replace(/![^ ]*$/, ""))
    setSelectedTools([...selectedTools, tool])
  }

  const handleSelectAssistant = async (assistant: Tables<"assistants">) => {
    setIsAssistantPickerOpen(false)
    setUserInput(userInput.replace(/@[^ ]*$/, ""))
    setSelectedAssistant(assistant)

    setChatSettings({
      model: assistant.model as LLMID,
      prompt: assistant.prompt,
      includeProfileContext: assistant.include_profile_context,
      includeWorkspaceInstructions: assistant.include_workspace_instructions,
      embeddingsProvider: assistant.embeddings_provider as "openai" | "local"
    })

    let allFiles = []

    const assistantFiles = (await getAssistantFilesByAssistantId(assistant.id))
      .files
    allFiles = [...assistantFiles]
    const assistantCollections = (
      await getAssistantCollectionsByAssistantId(assistant.id)
    ).collections
    for (const collection of assistantCollections) {
      const collectionFiles = (
        await getCollectionFilesByCollectionId(collection.id)
      ).files
      allFiles = [...allFiles, ...collectionFiles]
    }
    const assistantTools = (await getAssistantToolsByAssistantId(assistant.id))
      .tools

    setSelectedTools(assistantTools)
    setChatFiles(
      allFiles.map(file => ({
        id: file.id,
        name: file.name,
        type: file.type,
        file: null
      }))
    )

    if (allFiles.length > 0) setShowFilesDisplay(true)
  }

  return {
    handleInputChange,
    handleSelectPrompt,
    handleSelectUserFile,
    handleSelectUserCollection,
    handleSelectTool,
    handleSelectAssistant
  }
}
