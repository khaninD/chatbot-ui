// Only used in use-chat-handler.tsx to keep it clean

import { createChatFiles } from "@/db/chat-files"
import { createChat } from "@/db/chats"
import { createMessageFileItems } from "@/db/message-file-items"
import { createMessages, updateMessage } from "@/db/messages"
import { uploadMessageImage } from "@/db/storage/message-images"
import {
  buildFinalMessages,
  adaptMessagesForGoogleGemini
} from "@/lib/build-prompt"
import { consumeReadableStream } from "@/lib/consume-stream"
import { Json, Tables, TablesInsert } from "@/supabase/types"
import {
  ChatFile,
  ChatMessage,
  ChatPayload,
  ChatSettings,
  LLM,
  MessageImage
} from "@/types"
import i18next from "i18next"
import React from "react"
import { toast } from "sonner"
import { v4 as uuidv4 } from "uuid"

export const validateChatSettings = (
  chatSettings: ChatSettings | null,
  modelData: LLM | undefined,
  profile: Tables<"profiles"> | null,
  selectedWorkspace: Tables<"workspaces"> | null,
  messageContent: string
) => {
  if (!chatSettings) {
    throw new Error(i18next.t("errors.chatSettingsNotFound"))
  }

  if (!modelData) {
    throw new Error(i18next.t("errors.modelNotFound"))
  }

  if (!profile) {
    throw new Error(i18next.t("errors.profileNotFound"))
  }

  if (!selectedWorkspace) {
    throw new Error(i18next.t("errors.workspaceNotFound"))
  }

  if (!messageContent) {
    throw new Error(i18next.t("errors.messageContentNotFound"))
  }
}

export const handleRetrieval = async (
  userInput: string,
  newMessageFiles: ChatFile[],
  chatFiles: ChatFile[],
  embeddingsProvider: "openai" | "local",
  sourceCount: number
) => {
  const response = await fetch("/api/retrieval/retrieve", {
    method: "POST",
    body: JSON.stringify({
      userInput,
      fileIds: [...newMessageFiles, ...chatFiles].map(file => file.id),
      embeddingsProvider,
      sourceCount
    })
  })

  if (!response.ok) {
    console.error("Error retrieving:", response)
  }

  const { results } = (await response.json()) as {
    results: Tables<"file_items">[]
  }

  return results
}

export const createTempMessages = (
  messageContent: string,
  chatMessages: ChatMessage[],
  chatSettings: ChatSettings,
  b64Images: string[],
  isRegeneration: boolean,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  selectedAssistant: Tables<"assistants"> | null
) => {
  const tempUserChatMessage: ChatMessage = {
    message: {
      chat_id: "",
      assistant_id: null,
      content: messageContent,
      created_at: "",
      id: uuidv4(),
      image_paths: b64Images,
      model: chatSettings.model,
      role: "user",
      sequence_number: chatMessages.length,
      updated_at: "",
      user_id: ""
    },
    fileItems: []
  }

  const tempAssistantChatMessage: ChatMessage = {
    message: {
      chat_id: "",
      assistant_id: selectedAssistant?.id || null,
      content: "",
      created_at: "",
      id: uuidv4(),
      image_paths: [],
      model: chatSettings.model,
      role: "assistant",
      sequence_number: chatMessages.length + 1,
      updated_at: "",
      user_id: ""
    },
    fileItems: []
  }

  let newMessages = []

  if (isRegeneration) {
    const lastMessageIndex = chatMessages.length - 1
    chatMessages[lastMessageIndex].message.content = ""
    newMessages = [...chatMessages]
  } else {
    newMessages = [
      ...chatMessages,
      tempUserChatMessage,
      tempAssistantChatMessage
    ]
  }

  setChatMessages(newMessages)

  return {
    tempUserChatMessage,
    tempAssistantChatMessage
  }
}

export const handleLocalChat = async (
  payload: ChatPayload,
  profile: Tables<"profiles">,
  chatSettings: ChatSettings,
  tempAssistantMessage: ChatMessage,
  isRegeneration: boolean,
  newAbortController: AbortController,
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>,
  setFirstTokenReceived: React.Dispatch<React.SetStateAction<boolean>>,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setToolInUse: React.Dispatch<React.SetStateAction<string>>
) => {
  const formattedMessages = await buildFinalMessages(payload, profile, [])

  // Ollama API: https://github.com/jmorganca/ollama/blob/main/docs/api.md
  const response = await fetchChatResponse(
    process.env.NEXT_PUBLIC_OLLAMA_URL + "/api/chat",
    {
      model: chatSettings.model,
      messages: formattedMessages,
      options: {
        temperature: payload.chatSettings.temperature
      }
    },
    false,
    newAbortController,
    setIsGenerating,
    setChatMessages
  )

  return await processResponse(
    response,
    isRegeneration
      ? payload.chatMessages[payload.chatMessages.length - 1]
      : tempAssistantMessage,
    false,
    newAbortController,
    setFirstTokenReceived,
    setChatMessages,
    setToolInUse
  )
}

export const handleHostedChat = async (
  payload: ChatPayload,
  profile: Tables<"profiles">,
  modelData: LLM,
  tempAssistantChatMessage: ChatMessage,
  isRegeneration: boolean,
  newAbortController: AbortController,
  newMessageImages: MessageImage[],
  chatImages: MessageImage[],
  sessionId: string,
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>,
  setFirstTokenReceived: React.Dispatch<React.SetStateAction<boolean>>,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setToolInUse: React.Dispatch<React.SetStateAction<string>>
) => {
  const draftMessages = await buildFinalMessages(payload, profile, chatImages)

  // All requests now go through agent-server proxy
  const apiEndpoint = "/api/chat/agent"

  // Use the selected model as the agent model
  const agentModel = modelData.hostedId || modelData.modelId

  const requestBody = {
    chatSettings: {
      ...payload.chatSettings,
      agentModel: agentModel // Pass selected model to LlamaIndex
    },
    messages: draftMessages,
    // Always pass file items for RAG support
    messageFileItems: payload.messageFileItems,
    chatFileItems: payload.chatFileItems,
    sessionId
  }

  const response = await fetchChatResponse(
    apiEndpoint,
    requestBody,
    true,
    newAbortController,
    setIsGenerating,
    setChatMessages
  )

  return await processResponse(
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
}

export const fetchChatResponse = async (
  url: string,
  body: object,
  isHosted: boolean,
  controller: AbortController,
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
) => {
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    signal: controller.signal
  })

  if (!response.ok) {
    if (response.status === 404 && !isHosted) {
      toast.error(i18next.t("errors.modelNotFoundOllama"))
    }

    const errorData = await response.json()

    toast.error(errorData.message)

    setIsGenerating(false)
    setChatMessages(prevMessages => prevMessages.slice(0, -2))
  }

  return response
}

export const processResponse = async (
  response: Response,
  lastChatMessage: ChatMessage,
  isHosted: boolean,
  controller: AbortController,
  setFirstTokenReceived: React.Dispatch<React.SetStateAction<boolean>>,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setToolInUse: React.Dispatch<React.SetStateAction<string>>
) => {
  let fullText = ""
  let contentToAdd = ""
  let contentBlocks: any[] = []
  // Buffer for incomplete SSE data (chunks may split across boundaries)
  let sseBuffer = ""

  // Check if response is Server-Sent Events (Anthropic-style)
  const contentType = response.headers.get("Content-Type") || ""
  const isSSE = contentType.includes("text/event-stream")

  if (response.body) {
    await consumeReadableStream(
      response.body,
      chunk => {
        setFirstTokenReceived(true)
        setToolInUse("none")

        try {
          if (isSSE) {
            // Accumulate buffer with new chunk
            sseBuffer += chunk

            // Process complete SSE events (each ends with \n\n)
            const events = sseBuffer.split("\n\n")
            // Keep the last incomplete event in buffer
            sseBuffer = events.pop() || ""

            for (const event of events) {
              const lines = event.split("\n")
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const jsonStr = line.slice(6)
                  if (!jsonStr.trim()) continue

                  let eventData: any
                  try {
                    eventData = JSON.parse(jsonStr)
                  } catch (parseError) {
                    console.warn(
                      "[SSE] Failed to parse JSON, skipping:",
                      jsonStr.substring(0, 100)
                    )
                    continue
                  }

                  switch (eventData.type) {
                    case "content_block_start":
                      // New content block started (text or tool_use)
                      console.log(
                        "[SSE] content_block_start:",
                        eventData.content_block
                      )
                      contentBlocks.push(eventData.content_block)
                      if (eventData.content_block.type === "tool_use") {
                        setToolInUse(eventData.content_block.name)
                      }
                      break

                    case "content_block_delta":
                      // Content delta (text or tool input)
                      if (eventData.delta.type === "text_delta") {
                        contentToAdd = eventData.delta.text
                        fullText += contentToAdd
                      }
                      break

                    case "content_block_stop":
                      // Content block ended
                      setToolInUse("none")
                      break

                    case "message_delta":
                      // Message ended
                      if (eventData.delta.stop_reason === "tool_use") {
                        setToolInUse("none")
                      }
                      break

                    case "error":
                      console.error("[SSE] Error:", eventData.error)
                      throw new Error(eventData.error)
                  }
                }
              }
            }
          } else {
            // Original text-based response handling
            contentToAdd = isHosted
              ? chunk
              : // Ollama's streaming endpoint returns new-line separated JSON
                // objects. A chunk may have more than one of these objects, so we
                // need to split the chunk by new-lines and handle each one
                // separately.
                chunk
                  .trimEnd()
                  .split("\n")
                  .reduce(
                    (acc, line) => acc + JSON.parse(line).message.content,
                    ""
                  )
            fullText += contentToAdd
          }
        } catch (error) {
          console.error("Error parsing response:", error)
        }

        setChatMessages(prev =>
          prev.map(chatMessage => {
            if (chatMessage.message.id === lastChatMessage.message.id) {
              console.log(
                "[processResponse] Updating message with contentBlocks:",
                contentBlocks.length
              )
              const updatedChatMessage: ChatMessage = {
                message: {
                  ...chatMessage.message,
                  content: fullText
                },
                fileItems: chatMessage.fileItems,
                contentBlocks:
                  contentBlocks.length > 0 ? contentBlocks : undefined
              }

              return updatedChatMessage
            }

            return chatMessage
          })
        )
      },
      controller.signal
    )

    return { text: fullText, contentBlocks }
  } else {
    throw new Error(i18next.t("errors.responseBodyNull"))
  }
}

export const handleCreateChat = async (
  chatSettings: ChatSettings,
  profile: Tables<"profiles">,
  selectedWorkspace: Tables<"workspaces">,
  messageContent: string,
  selectedAssistant: Tables<"assistants"> | null,
  newMessageFiles: ChatFile[],
  setSelectedChat: React.Dispatch<React.SetStateAction<Tables<"chats"> | null>>,
  setChats: React.Dispatch<React.SetStateAction<Tables<"chats">[]>>,
  setChatFiles: React.Dispatch<React.SetStateAction<ChatFile[]>>
) => {
  const createdChat = await createChat({
    user_id: profile.user_id,
    workspace_id: selectedWorkspace.id,
    assistant_id: selectedAssistant?.id || null,
    context_length: chatSettings.contextLength,
    include_profile_context: chatSettings.includeProfileContext,
    include_workspace_instructions: chatSettings.includeWorkspaceInstructions,
    model: chatSettings.model,
    name: messageContent.substring(0, 100),
    prompt: chatSettings.prompt,
    temperature: chatSettings.temperature,
    embeddings_provider: chatSettings.embeddingsProvider,
    mcp_server_ids: chatSettings.mcpServerIds || [],
    agent_model: chatSettings.agentModel || null,
    use_advanced_rag: chatSettings.useAdvancedRAG || false,
    use_reranking: chatSettings.useReranking || false,
    enable_image_generation: true, // Always enabled
    image_model: chatSettings.imageModel || "gpt-image-1.5"
  })

  setSelectedChat(createdChat)
  setChats(chats => [createdChat, ...chats])

  await createChatFiles(
    newMessageFiles.map(file => ({
      user_id: profile.user_id,
      chat_id: createdChat.id,
      file_id: file.id
    }))
  )

  setChatFiles(prev => [...prev, ...newMessageFiles])

  return createdChat
}

export const handleCreateMessages = async (
  chatMessages: ChatMessage[],
  currentChat: Tables<"chats">,
  profile: Tables<"profiles">,
  modelData: LLM,
  messageContent: string,
  generatedText: string,
  newMessageImages: MessageImage[],
  isRegeneration: boolean,
  retrievedFileItems: Tables<"file_items">[],
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setChatFileItems: React.Dispatch<
    React.SetStateAction<Tables<"file_items">[]>
  >,
  setChatImages: React.Dispatch<React.SetStateAction<MessageImage[]>>,
  selectedAssistant: Tables<"assistants"> | null,
  contentBlocks?: any[],
  originalMessagesLength?: number
) => {
  // Debug: log contentBlocks to see if they exist
  console.log(
    "[handleCreateMessages] contentBlocks:",
    contentBlocks ? `Found ${contentBlocks.length} blocks` : "None"
  )

  const finalUserMessage: TablesInsert<"messages"> = {
    chat_id: currentChat.id,
    assistant_id: null,
    user_id: profile.user_id,
    content: messageContent,
    model: modelData.modelId,
    role: "user",
    sequence_number: chatMessages.length,
    image_paths: []
  }

  const finalAssistantMessage: TablesInsert<"messages"> & {
    content_blocks?: Json | null
  } = {
    chat_id: currentChat.id,
    assistant_id: selectedAssistant?.id || null,
    user_id: profile.user_id,
    content: generatedText,
    model: modelData.modelId,
    role: "assistant",
    sequence_number: chatMessages.length + 1,
    image_paths: [],
    content_blocks: contentBlocks ? (contentBlocks as unknown as Json) : null
  }

  let finalChatMessages: ChatMessage[] = []

  if (isRegeneration) {
    const lastStartingMessage = chatMessages[chatMessages.length - 1].message

    const updatedMessage = await updateMessage(lastStartingMessage.id, {
      ...lastStartingMessage,
      content: generatedText,
      content_blocks: contentBlocks ? (contentBlocks as unknown as Json) : null
    } as any)

    chatMessages[chatMessages.length - 1].message = updatedMessage
    chatMessages[chatMessages.length - 1].contentBlocks = contentBlocks

    finalChatMessages = [...chatMessages]

    setChatMessages(finalChatMessages)
  } else {
    const createdMessages = await createMessages([
      finalUserMessage,
      finalAssistantMessage
    ])

    // Upload each image (stored in newMessageImages) for the user message to message_images bucket
    const uploadPromises = newMessageImages
      .filter(obj => obj.file !== null)
      .map(obj => {
        const filePath = `${profile.user_id}/${currentChat.id}/${
          createdMessages[0].id
        }/${uuidv4()}`

        return uploadMessageImage(filePath, obj.file as File).catch(error => {
          console.error(`Failed to upload image at ${filePath}:`, error)
          return null
        })
      })

    const paths = (await Promise.all(uploadPromises)).filter(
      Boolean
    ) as string[]

    setChatImages(prevImages => [
      ...prevImages,
      ...newMessageImages.map((obj, index) => ({
        ...obj,
        messageId: createdMessages[0].id,
        path: paths[index]
      }))
    ])

    const updatedMessage = await updateMessage(createdMessages[0].id, {
      ...createdMessages[0],
      image_paths: paths
    })

    const createdMessageFileItems = await createMessageFileItems(
      retrievedFileItems.map(fileItem => {
        return {
          user_id: profile.user_id,
          message_id: createdMessages[1].id,
          file_item_id: fileItem.id
        }
      })
    )

    // Use setChatMessages with a function to get the current state
    setChatMessages(currentMessages => {
      // Keep only the original messages (before temp messages were added)
      const originalMessages =
        originalMessagesLength !== undefined
          ? currentMessages.slice(0, originalMessagesLength)
          : currentMessages.slice(0, -2)

      finalChatMessages = [
        ...originalMessages,
        {
          message: updatedMessage,
          fileItems: []
        },
        {
          message: createdMessages[1],
          fileItems: retrievedFileItems.map(fileItem => fileItem.id),
          contentBlocks: contentBlocks
        }
      ]

      return finalChatMessages
    })

    setChatFileItems(prevFileItems => {
      const newFileItems = retrievedFileItems.filter(
        fileItem => !prevFileItems.some(prevItem => prevItem.id === fileItem.id)
      )

      return [...prevFileItems, ...newFileItems]
    })
  }
}
