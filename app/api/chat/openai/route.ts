import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { ServerRuntime } from "next"

export const runtime: ServerRuntime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: any[]
  }

  try {
    const profile = await getServerProfile()
    console.log("profile.openai_api_key", profile.openai_api_key)
    checkApiKey(profile.openai_api_key, "OpenAI")

    const openai = createOpenAI({
      apiKey: profile.openai_api_key || "",
      ...(profile.openai_organization_id && {
        organization: profile.openai_organization_id
      })
    })

    // Преобразуем сообщения для поддержки изображений в формате AI SDK v6
    const formattedMessages = messages.map((message: any) => {
      if (!message.content) return message

      // Если content это строка, возвращаем как есть
      if (typeof message.content === "string") {
        return message
      }

      // Если content это массив (multimodal сообщение с текстом и изображениями)
      if (Array.isArray(message.content)) {
        const formattedContent = message.content.map((part: any) => {
          // Текстовый контент
          if (part.type === "text" || typeof part === "string") {
            return typeof part === "string"
              ? { type: "text", text: part }
              : part
          }

          // Изображение в формате OpenAI (image_url)
          if (part.type === "image_url" && part.image_url?.url) {
            return {
              type: "image",
              image: part.image_url.url
            }
          }

          return part
        })

        return {
          ...message,
          content: formattedContent
        }
      }

      return message
    })

    const result = streamText({
      model: openai(chatSettings.model),
      messages: formattedMessages,
      temperature: chatSettings.temperature
    })

    return result.toTextStreamResponse()
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "OpenAI API Key not found. Please set it in your profile settings."
    } else if (errorMessage.toLowerCase().includes("incorrect api key")) {
      errorMessage =
        "OpenAI API Key is incorrect. Please fix it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
