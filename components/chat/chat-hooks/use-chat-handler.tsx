import {
  useAssistantStore,
  useAttachmentsStore,
  useChatInputStore,
  useChatRuntimeStore,
  useChatStore,
  useItemsStore,
  useModelsStore,
  usePresetStore,
  useProfileStore,
  useRetrievalStore,
  useToolStore,
  useWorkspaceStore
} from "@/stores"
import { getAssistantCollectionsByAssistantId } from "@/db/assistant-collections"
import { getAssistantFilesByAssistantId } from "@/db/assistant-files"
import { getAssistantToolsByAssistantId } from "@/db/assistant-tools"
import { updateChat } from "@/db/chats"
import { getCollectionFilesByCollectionId } from "@/db/collection-files"
import { deleteMessagesIncludingAndAfter } from "@/db/messages"
import { buildFinalMessages } from "@/lib/build-prompt"
import { Tables } from "@/supabase/types"
import { ChatMessage, ChatPayload, LLMID, ModelProvider } from "@/types"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { LLM_LIST } from "../../../lib/models/llm/llm-list"
import {
  createTempMessages,
  handleCreateChat,
  handleCreateMessages,
  handleHostedChat,
  handleLocalChat,
  handleRetrieval,
  processResponse,
  validateChatSettings
} from "../chat-helpers"

export const useChatHandler = () => {
  const router = useRouter()

  const userInput = useChatStore(state => state.userInput)
  const setUserInput = useChatStore(state => state.setUserInput)
  const setChatMessages = useChatStore(state => state.setChatMessages)
  const selectedChat = useChatStore(state => state.selectedChat)
  const setSelectedChat = useChatStore(state => state.setSelectedChat)
  const chatSettings = useChatStore(state => state.chatSettings)
  const setChatSettings = useChatStore(state => state.setChatSettings)
  const chatMessages = useChatStore(state => state.chatMessages)
  const chatFileItems = useChatStore(state => state.chatFileItems)
  const setChatFileItems = useChatStore(state => state.setChatFileItems)

  const chatFiles = useAttachmentsStore(state => state.chatFiles)
  const setChatFiles = useAttachmentsStore(state => state.setChatFiles)
  const chatImages = useAttachmentsStore(state => state.chatImages)
  const setChatImages = useAttachmentsStore(state => state.setChatImages)
  const newMessageImages = useAttachmentsStore(state => state.newMessageImages)
  const setNewMessageImages = useAttachmentsStore(
    state => state.setNewMessageImages
  )
  const newMessageFiles = useAttachmentsStore(state => state.newMessageFiles)
  const setNewMessageFiles = useAttachmentsStore(
    state => state.setNewMessageFiles
  )
  const setShowFilesDisplay = useAttachmentsStore(
    state => state.setShowFilesDisplay
  )

  const profile = useProfileStore(state => state.profile)
  const setIsGenerating = useChatRuntimeStore(state => state.setIsGenerating)
  const setFirstTokenReceived = useChatRuntimeStore(
    state => state.setFirstTokenReceived
  )
  const abortController = useChatRuntimeStore(state => state.abortController)
  const setAbortController = useChatRuntimeStore(
    state => state.setAbortController
  )

  const selectedWorkspace = useWorkspaceStore(state => state.selectedWorkspace)
  const setChats = useItemsStore(state => state.setChats)
  const setSelectedTools = useToolStore(state => state.setSelectedTools)
  const setToolInUse = useToolStore(state => state.setToolInUse)
  const selectedTools = useToolStore(state => state.selectedTools)

  const selectedAssistant = useAssistantStore(state => state.selectedAssistant)
  const selectedPreset = usePresetStore(state => state.selectedPreset)
  const models = useItemsStore(state => state.models)

  const useRetrieval = useRetrievalStore(state => state.useRetrieval)
  const sourceCount = useRetrievalStore(state => state.sourceCount)

  const setIsPromptPickerOpen = useChatInputStore(
    state => state.setIsPromptPickerOpen
  )
  const setIsFilePickerOpen = useChatInputStore(
    state => state.setIsFilePickerOpen
  )
  const isPromptPickerOpen = useChatInputStore(
    state => state.isPromptPickerOpen
  )
  const isFilePickerOpen = useChatInputStore(state => state.isFilePickerOpen)
  const isToolPickerOpen = useChatInputStore(state => state.isToolPickerOpen)

  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isPromptPickerOpen || !isFilePickerOpen || !isToolPickerOpen) {
      chatInputRef.current?.focus()
    }
  }, [isPromptPickerOpen, isFilePickerOpen, isToolPickerOpen])

  const handleNewChat = async () => {
    if (!selectedWorkspace) return

    setUserInput("")
    setChatMessages([])
    setSelectedChat(null)
    setChatFileItems([])

    setIsGenerating(false)
    setFirstTokenReceived(false)

    setChatFiles([])
    setChatImages([])
    setNewMessageFiles([])
    setNewMessageImages([])
    setShowFilesDisplay(false)
    setIsPromptPickerOpen(false)
    setIsFilePickerOpen(false)

    setSelectedTools([])
    setToolInUse("none")

    if (selectedAssistant) {
      setChatSettings({
        model: selectedAssistant.model as LLMID,
        prompt: selectedAssistant.prompt,
        includeProfileContext: selectedAssistant.include_profile_context,
        includeWorkspaceInstructions:
          selectedAssistant.include_workspace_instructions,
        embeddingsProvider: selectedAssistant.embeddings_provider as
          | "openai"
          | "local"
      })

      let allFiles = []

      const assistantFiles = (
        await getAssistantFilesByAssistantId(selectedAssistant.id)
      ).files
      allFiles = [...assistantFiles]
      const assistantCollections = (
        await getAssistantCollectionsByAssistantId(selectedAssistant.id)
      ).collections
      for (const collection of assistantCollections) {
        const collectionFiles = (
          await getCollectionFilesByCollectionId(collection.id)
        ).files
        allFiles = [...allFiles, ...collectionFiles]
      }
      const assistantTools = (
        await getAssistantToolsByAssistantId(selectedAssistant.id)
      ).tools

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
    } else if (selectedPreset) {
      setChatSettings({
        model: selectedPreset.model as LLMID,
        prompt: selectedPreset.prompt,
        includeProfileContext: selectedPreset.include_profile_context,
        includeWorkspaceInstructions:
          selectedPreset.include_workspace_instructions,
        embeddingsProvider: selectedPreset.embeddings_provider as
          | "openai"
          | "local"
      })
    } else if (selectedWorkspace) {
      // setChatSettings({
      //   model: (selectedWorkspace.default_model ||
      //     "gpt-4-1106-preview") as LLMID,
      //   prompt:
      //     selectedWorkspace.default_prompt ||
      //     "You are a friendly, helpful AI assistant.",
      //   temperature: selectedWorkspace.default_temperature || 0.5,
      //   contextLength: selectedWorkspace.default_context_length || 4096,
      //   includeProfileContext:
      //     selectedWorkspace.include_profile_context || true,
      //   includeWorkspaceInstructions:
      //     selectedWorkspace.include_workspace_instructions || true,
      //   embeddingsProvider:
      //     (selectedWorkspace.embeddings_provider as "openai" | "local") ||
      //     "openai"
      // })
    }

    return router.push(`/${selectedWorkspace.id}/chat`)
  }

  const handleFocusChatInput = () => {
    chatInputRef.current?.focus()
  }

  const handleStopMessage = () => {
    if (abortController) {
      abortController.abort()
    }
  }

  const handleSendMessage = async (
    messageContent: string,
    chatMessages: ChatMessage[],
    isRegeneration: boolean
  ) => {
    const startingInput = messageContent

    try {
      setUserInput("")
      setIsGenerating(true)
      setIsPromptPickerOpen(false)
      setIsFilePickerOpen(false)
      setNewMessageImages([])

      const newAbortController = new AbortController()
      setAbortController(newAbortController)

      const modelData = [
        ...models.map(model => ({
          modelId: model.model_id as LLMID,
          modelName: model.name,
          provider: "custom" as ModelProvider,
          hostedId: model.id,
          platformLink: "",
          imageInput: false
        })),
        ...LLM_LIST
      ].find(llm => llm.modelId === chatSettings?.model)

      validateChatSettings(
        chatSettings,
        modelData,
        profile,
        selectedWorkspace,
        messageContent
      )

      let currentChat = selectedChat ? { ...selectedChat } : null

      const b64Images = newMessageImages.map(image => image.base64)

      let retrievedFileItems: Tables<"file_items">[] = []

      if (
        (newMessageFiles.length > 0 || chatFiles.length > 0) &&
        useRetrieval
      ) {
        setToolInUse("retrieval")

        retrievedFileItems = await handleRetrieval(
          userInput,
          newMessageFiles,
          chatFiles,
          chatSettings!.embeddingsProvider,
          sourceCount
        )
      }

      // Save the original length before adding temp messages
      const originalMessagesLength = chatMessages.length

      const { tempUserChatMessage, tempAssistantChatMessage } =
        createTempMessages(
          messageContent,
          chatMessages,
          chatSettings!,
          b64Images,
          isRegeneration,
          setChatMessages,
          selectedAssistant
        )

      const payload: ChatPayload = {
        chatSettings: chatSettings!,
        workspaceInstructions: selectedWorkspace!.instructions || "",
        chatMessages: isRegeneration
          ? [...chatMessages]
          : [...chatMessages, tempUserChatMessage],
        assistant: selectedChat?.assistant_id ? selectedAssistant : null,
        messageFileItems: retrievedFileItems,
        chatFileItems: chatFileItems
      }

      let generatedText = ""
      let contentBlocks: any[] = []

      if (selectedTools.length > 0) {
        setToolInUse("Tools")

        const formattedMessages = await buildFinalMessages(
          payload,
          profile!,
          chatImages
        )

        const response = await fetch("/api/chat/tools", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chatSettings: payload.chatSettings,
            messages: formattedMessages,
            selectedTools
          })
        })

        setToolInUse("none")

        const result = await processResponse(
          response,
          isRegeneration
            ? payload.chatMessages[payload.chatMessages.length - 1]
            : tempAssistantChatMessage,
          true,
          newAbortController,
          setFirstTokenReceived,
          setChatMessages,
          setToolInUse
        )
        generatedText = result.text
        contentBlocks = result.contentBlocks
      } else {
        if (modelData!.provider === "ollama") {
          const result = await handleLocalChat(
            payload,
            profile!,
            chatSettings!,
            tempAssistantChatMessage,
            isRegeneration,
            newAbortController,
            setIsGenerating,
            setFirstTokenReceived,
            setChatMessages,
            setToolInUse
          )
          generatedText = result.text
          contentBlocks = result.contentBlocks
        } else {
          if (!currentChat) {
            currentChat = await handleCreateChat(
              chatSettings!,
              profile!,
              selectedWorkspace!,
              messageContent,
              selectedAssistant,
              newMessageFiles,
              setSelectedChat,
              setChats,
              setChatFiles
            )
          }

          const result = await handleHostedChat(
            payload,
            profile!,
            modelData!,
            tempAssistantChatMessage,
            isRegeneration,
            newAbortController,
            newMessageImages,
            chatImages,
            currentChat.id,
            setIsGenerating,
            setFirstTokenReceived,
            setChatMessages,
            setToolInUse
          )
          generatedText = result.text
          contentBlocks = result.contentBlocks
        }
      }

      if (!currentChat) {
        currentChat = await handleCreateChat(
          chatSettings!,
          profile!,
          selectedWorkspace!,
          messageContent,
          selectedAssistant,
          newMessageFiles,
          setSelectedChat,
          setChats,
          setChatFiles
        )
      } else {
        const updatedChat = await updateChat(currentChat.id, {
          updated_at: new Date().toISOString(),
          model: chatSettings!.model,
          prompt: chatSettings!.prompt,
          include_profile_context: chatSettings!.includeProfileContext,
          include_workspace_instructions:
            chatSettings!.includeWorkspaceInstructions,
          embeddings_provider: chatSettings!.embeddingsProvider,
          mcp_server_ids: chatSettings!.mcpServerIds || [],
          agent_model: chatSettings!.agentModel || null,
          use_advanced_rag: chatSettings!.useAdvancedRAG || false,
          use_reranking: chatSettings!.useReranking || false,
          enable_image_generation: true, // Always enabled
          image_model: chatSettings!.imageModel || "gpt-image-1.5"
        })

        setChats(prevChats => {
          const updatedChats = prevChats.map(prevChat =>
            prevChat.id === updatedChat.id ? updatedChat : prevChat
          )

          return updatedChats
        })
      }

      await handleCreateMessages(
        chatMessages,
        currentChat,
        profile!,
        modelData!,
        messageContent,
        generatedText,
        newMessageImages,
        isRegeneration,
        retrievedFileItems,
        setChatMessages,
        setChatFileItems,
        setChatImages,
        selectedAssistant,
        contentBlocks,
        originalMessagesLength
      )

      setIsGenerating(false)
      setFirstTokenReceived(false)
    } catch (error) {
      setIsGenerating(false)
      setFirstTokenReceived(false)
      setUserInput(startingInput)
    }
  }

  const handleSendEdit = async (
    editedContent: string,
    sequenceNumber: number
  ) => {
    if (!selectedChat) return

    await deleteMessagesIncludingAndAfter(
      selectedChat.user_id,
      selectedChat.id,
      sequenceNumber
    )

    const filteredMessages = chatMessages.filter(
      chatMessage => chatMessage.message.sequence_number < sequenceNumber
    )

    setChatMessages(filteredMessages)

    handleSendMessage(editedContent, filteredMessages, false)
  }

  return {
    chatInputRef,
    prompt,
    handleNewChat,
    handleSendMessage,
    handleFocusChatInput,
    handleStopMessage,
    handleSendEdit
  }
}
