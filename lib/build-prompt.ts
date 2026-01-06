import { Tables } from "@/supabase/types"
import { ChatPayload, MessageImage } from "@/types"
import { encode } from "gpt-tokenizer"
import { getBase64FromDataURL, getMediaTypeFromDataURL } from "@/lib/utils"

const buildBasePrompt = (
  prompt: string,
  profileContext: string,
  workspaceInstructions: string,
  assistant: Tables<"assistants"> | null
) => {
  let fullPrompt = ""

  if (assistant) {
    fullPrompt += `<INJECT ROLE>\nYou are not an AI. You are ${assistant.name}.\n</INJECT ROLE>\n\n`
  }

  fullPrompt += `Today is ${new Date().toLocaleDateString()}.\n\n`

  if (profileContext) {
    fullPrompt += `User Info:\n${profileContext}\n\n`
  }

  if (workspaceInstructions) {
    fullPrompt += `System Instructions:\n${workspaceInstructions}\n\n`
  }

  fullPrompt += `User Instructions:\n${prompt}`

  return fullPrompt
}

export async function buildFinalMessages(
  payload: ChatPayload,
  profile: Tables<"profiles">,
  chatImages: MessageImage[]
) {
  const {
    chatSettings,
    workspaceInstructions,
    chatMessages,
    assistant,
    messageFileItems,
    chatFileItems
  } = payload

  const BUILT_PROMPT = buildBasePrompt(
    chatSettings.prompt,
    chatSettings.includeProfileContext ? profile.profile_context || "" : "",
    chatSettings.includeWorkspaceInstructions ? workspaceInstructions : "",
    assistant
  )

  const CHUNK_SIZE = chatSettings.contextLength
  const PROMPT_TOKENS = encode(chatSettings.prompt).length

  // Claude Code strategy: Reserve tokens for system prompt and response
  const RESERVED_FOR_RESPONSE = 4000 // Reserve tokens for model response
  const RESERVED_FOR_SYSTEM = PROMPT_TOKENS + 500 // System prompt + overhead

  // Available tokens for conversation history
  let availableTokens = CHUNK_SIZE - RESERVED_FOR_SYSTEM - RESERVED_FOR_RESPONSE

  // Always include last N messages (Claude Code strategy)
  const ALWAYS_INCLUDE_LAST_N = 6 // Last 3 exchanges (user + assistant pairs)

  const processedChatMessages = chatMessages.map((chatMessage, index) => {
    const nextChatMessage = chatMessages[index + 1]

    if (nextChatMessage === undefined) {
      return chatMessage
    }

    const nextChatMessageFileItems = nextChatMessage.fileItems

    if (nextChatMessageFileItems.length > 0) {
      const findFileItems = nextChatMessageFileItems
        .map(fileItemId =>
          chatFileItems.find(chatFileItem => chatFileItem.id === fileItemId)
        )
        .filter(item => item !== undefined) as Tables<"file_items">[]

      const retrievalText = buildRetrievalText(findFileItems)

      return {
        message: {
          ...chatMessage.message,
          content:
            `${chatMessage.message.content}\n\n${retrievalText}` as string
        },
        fileItems: []
      }
    }

    return chatMessage
  })

  // Clean tool usage markers from assistant messages (Claude Code approach)
  // Tool calls are shown in real-time during execution but not saved to history
  const cleanedMessages = processedChatMessages.map(chatMessage => {
    const message = chatMessage.message

    if (message.role === "assistant") {
      // Remove tool usage markers (both old and new formats)
      let cleanContent = message.content
        // New format: 🔧 tool_name
        .replace(/\n🔧 [^\n]+\n/g, "\n")
        .replace(/✓ [^\n]+\n/g, "")
        // Old format: **[Using tool: ...]** **[Result from ...]:**
        .replace(/\*\*\[Using tool: [^\]]+\]\*\*\s*/g, "")
        .replace(
          /\*\*\[Result from [^\]]+\]:\*\*\n```json\n[\s\S]*?\n```\n\n/g,
          ""
        )
        .replace(/\n{3,}/g, "\n\n") // Replace multiple newlines with double
        .trim()

      if (!cleanContent) {
        cleanContent = "[Processing...]"
      }

      return {
        ...chatMessage,
        message: {
          ...message,
          content: cleanContent
        }
      }
    }

    return chatMessage
  })

  let finalMessages = []
  let usedTokens = 0

  // Split messages into guaranteed (recent) and optional (older)
  const totalMessages = cleanedMessages.length
  const guaranteedMessages = cleanedMessages.slice(-ALWAYS_INCLUDE_LAST_N)
  const optionalMessages = cleanedMessages.slice(0, -ALWAYS_INCLUDE_LAST_N)

  // First, add optional messages from most recent to oldest
  for (let i = optionalMessages.length - 1; i >= 0; i--) {
    const message = optionalMessages[i].message
    const messageTokens = encode(message.content).length

    if (usedTokens + messageTokens <= availableTokens) {
      usedTokens += messageTokens
      finalMessages.unshift(message)
    }
    // Continue even if message doesn't fit - try older ones
  }

  // Always add guaranteed recent messages (even if over limit)
  for (const chatMessage of guaranteedMessages) {
    const message = chatMessage.message
    const messageTokens = encode(message.content).length
    usedTokens += messageTokens
    finalMessages.push(message)
  }

  // Log context management stats
  console.log(
    `[Context Management] Total: ${totalMessages} msgs | ` +
      `Included: ${finalMessages.length} msgs | ` +
      `Tokens: ${usedTokens}/${CHUNK_SIZE} | ` +
      `Reserved: ${RESERVED_FOR_SYSTEM + RESERVED_FOR_RESPONSE} | ` +
      `Available: ${availableTokens}`
  )

  const tempSystemMessage: Tables<"messages"> = {
    chat_id: "",
    assistant_id: null,
    content: BUILT_PROMPT,
    created_at: "",
    id: processedChatMessages.length + "",
    image_paths: [],
    model: payload.chatSettings.model,
    role: "system",
    sequence_number: processedChatMessages.length,
    updated_at: "",
    user_id: ""
  }

  finalMessages.unshift(tempSystemMessage)

  finalMessages = finalMessages.map(message => {
    let content

    if (message.image_paths.length > 0) {
      content = [
        {
          type: "text",
          text: message.content
        },
        ...message.image_paths.map(path => {
          let formedUrl = ""

          if (path.startsWith("data")) {
            formedUrl = path
          } else {
            const chatImage = chatImages.find(image => image.path === path)

            if (chatImage) {
              formedUrl = chatImage.base64
            }
          }

          return {
            type: "image_url",
            image_url: {
              url: formedUrl
            }
          }
        })
      ]
    } else {
      content = message.content
    }

    return {
      role: message.role,
      content
    }
  })

  if (messageFileItems.length > 0) {
    const retrievalText = buildRetrievalText(messageFileItems)

    finalMessages[finalMessages.length - 1] = {
      ...finalMessages[finalMessages.length - 1],
      content: `${
        finalMessages[finalMessages.length - 1].content
      }\n\n${retrievalText}`
    }
  }

  return finalMessages
}

function buildRetrievalText(fileItems: Tables<"file_items">[]) {
  const retrievalText = fileItems
    .map(item => `<BEGIN SOURCE>\n${item.content}\n</END SOURCE>`)
    .join("\n\n")

  return `You may use the following sources if needed to answer the user's question. If you don't know the answer, say "I don't know."\n\n${retrievalText}`
}

function adaptSingleMessageForGoogleGemini(message: any) {
  const adaptedParts = []

  let rawParts = []
  if (!Array.isArray(message.content)) {
    rawParts.push({ type: "text", text: message.content })
  } else {
    rawParts = message.content
  }

  for (let i = 0; i < rawParts.length; i++) {
    const rawPart = rawParts[i]

    if (rawPart.type == "text") {
      adaptedParts.push({ text: rawPart.text })
    } else if (rawPart.type === "image_url") {
      adaptedParts.push({
        inlineData: {
          data: getBase64FromDataURL(rawPart.image_url.url),
          mimeType: getMediaTypeFromDataURL(rawPart.image_url.url)
        }
      })
    }
  }

  let role = "user"
  if (["user", "system"].includes(message.role)) {
    role = "user"
  } else if (message.role === "assistant") {
    role = "model"
  }

  return {
    role: role,
    parts: adaptedParts
  }
}

function adaptMessagesForGeminiVision(messages: any[]) {
  // Gemini Pro Vision cannot process multiple messages
  // Reformat, using all texts and last visual only

  const basePrompt = messages[0].parts[0].text
  const baseRole = messages[0].role
  const lastMessage = messages[messages.length - 1]
  const visualMessageParts = lastMessage.parts
  const visualQueryMessages = [
    {
      role: "user",
      parts: [
        `${baseRole}:\n${basePrompt}\n\nuser:\n${visualMessageParts[0].text}\n\n`,
        visualMessageParts.slice(1)
      ]
    }
  ]
  return visualQueryMessages
}

export async function adaptMessagesForGoogleGemini(
  payload: ChatPayload,
  messages: any[]
) {
  let geminiMessages = []
  for (let i = 0; i < messages.length; i++) {
    const adaptedMessage = adaptSingleMessageForGoogleGemini(messages[i])
    geminiMessages.push(adaptedMessage)
  }

  if (payload.chatSettings.model === "gemini-pro-vision") {
    geminiMessages = adaptMessagesForGeminiVision(geminiMessages)
  }
  return geminiMessages
}
