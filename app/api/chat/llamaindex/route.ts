import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { StreamingTextResponse } from "ai"
import { ServerRuntime } from "next"

export const runtime: ServerRuntime = "edge"

// LlamaIndex Agent Server URL - can be configured via env variable
const LLAMAINDEX_AGENT_URL =
  process.env.LLAMAINDEX_AGENT_URL || "http://localhost:3001"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: any[]
  }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.openai_api_key, "OpenAI")

    // Extract last user message
    const lastMessage = messages[messages.length - 1]
    const userQuery =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : lastMessage.content[0]?.text || ""

    // Extract system prompt from messages
    const systemMessage = messages.find((msg: any) => msg.role === "system")
    const systemPrompt = systemMessage?.content || ""

    console.log(
      `[LlamaIndex] Sending request to agent server: ${LLAMAINDEX_AGENT_URL}`
    )

    // Call LlamaIndex agent server
    const response = await fetch(`${LLAMAINDEX_AGENT_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: userQuery,
        systemPrompt: systemPrompt,
        apiKey: profile.openai_api_key // Pass API key to agent server
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Agent server error")
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || "Agent returned error")
    }

    // Format result
    let result = data.result
    if (typeof result === "object") {
      result = JSON.stringify(result, null, 2)
    }

    console.log(`[LlamaIndex] Received response from agent server`)

    // Create ReadableStream for streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(result))
        controller.close()
      }
    })

    return new StreamingTextResponse(stream)
  } catch (error: any) {
    console.error("[LlamaIndex] Error:", error)

    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "OpenAI API Key not found. Please set it in your profile settings."
    } else if (errorMessage.toLowerCase().includes("incorrect api key")) {
      errorMessage =
        "OpenAI API Key is incorrect. Please fix it in your profile settings."
    } else if (
      errorMessage.toLowerCase().includes("fetch failed") ||
      errorMessage.toLowerCase().includes("econnrefused")
    ) {
      errorMessage =
        "LlamaIndex Agent Server is not running. Please start the agent server on port 3001."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
