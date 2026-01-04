import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { Database } from "@/supabase/types"
import { ChatSettings } from "@/types"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { ServerRuntime } from "next"

export const runtime: ServerRuntime = "edge"

// LlamaIndex Agent Server URL - configured via env variable
const LLAMAINDEX_AGENT_URL =
  process.env.NEXT_PUBLIC_LLAMAINDEX_AGENT_URL || "http://localhost:3001"

// Helper function to format tool results
function formatToolResult(toolOutput: unknown): string {
  if (typeof toolOutput === "string") {
    // Try to parse as JSON for better formatting
    try {
      const parsed = JSON.parse(toolOutput)
      return `\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``
    } catch {
      // Not JSON, display as-is
      return toolOutput
    }
  }

  if (typeof toolOutput === "object" && toolOutput !== null) {
    // Object - format as JSON
    return `\`\`\`json\n${JSON.stringify(toolOutput, null, 2)}\n\`\`\``
  }

  // Primitive type
  return String(toolOutput)
}

// Create a TransformStream to convert SSE events to text
function createSSETransformStream(): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ""

  return new TransformStream({
    transform(chunk, controller) {
      // Decode chunk and add to buffer
      buffer += decoder.decode(chunk, { stream: true })

      // Process complete SSE messages (ending with \n\n)
      const lines = buffer.split("\n\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue

        const data = line.slice(6)

        try {
          const event = JSON.parse(data)

          switch (event.type) {
            case "text_delta":
              controller.enqueue(encoder.encode(event.data.delta))
              break

            case "tool_call":
              controller.enqueue(
                encoder.encode(`\n**[Using tool: ${event.data.toolName}]**\n`)
              )
              break

            case "tool_result": {
              const resultText = formatToolResult(event.data.toolOutput)
              controller.enqueue(
                encoder.encode(
                  `\n**[Result from ${event.data.toolName}]:**\n${resultText}\n\n`
                )
              )
              break
            }

            case "error":
              console.error("[LlamaIndex] Stream error:", event.data.error)
              controller.error(new Error(event.data.error))
              break
          }
        } catch (parseError) {
          console.error(
            "[LlamaIndex] Failed to parse SSE data:",
            data,
            parseError
          )
        }
      }
    },

    flush(controller) {
      // Process any remaining data in buffer
      if (buffer.trim()) {
        console.log("[LlamaIndex] Remaining buffer:", buffer)
      }
      controller.terminate()
    }
  })
}

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

    // Build conversation history from all messages (excluding system message)
    // This matches the approach used by other providers (OpenAI, Anthropic, etc.)
    const conversationMessages = messages
      .filter((msg: any) => msg.role !== "system")
      .map((msg: any) => ({
        role: msg.role,
        content:
          typeof msg.content === "string"
            ? msg.content
            : msg.content[0]?.text || ""
      }))

    // Get MCP server URLs if mcpServerIds is provided
    let mcpUrls: string[] = []
    if (chatSettings.mcpServerIds && chatSettings.mcpServerIds.length > 0) {
      try {
        const cookieStore = await cookies()
        const supabase = createServerClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              get(name: string) {
                return cookieStore.get(name)?.value
              }
            }
          }
        )

        const { data: mcpServers, error } = await supabase
          .from("mcp_servers")
          .select("*")
          .in("id", chatSettings.mcpServerIds)

        if (error) {
          console.error("[LlamaIndex] Error fetching MCP servers:", error)
        } else if (mcpServers) {
          mcpUrls = mcpServers.map(server => server.url)
        }
      } catch (error) {
        console.error("[LlamaIndex] Error fetching MCP servers:", error)
      }
    }

    console.log(
      `[LlamaIndex] Sending streaming request to agent server: ${LLAMAINDEX_AGENT_URL} (${conversationMessages.length} messages)`
    )

    // Call LlamaIndex agent server streaming endpoint
    console.log("MCP SERVER URLs:", mcpUrls)
    const response = await fetch(`${LLAMAINDEX_AGENT_URL}/api/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: userQuery,
        systemPrompt: systemPrompt,
        apiKey: profile.openai_api_key,
        model: chatSettings.agentModel || "gpt-4o",
        mcpUrls: mcpUrls,
        messages: conversationMessages
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || "Agent server error")
    }

    if (!response.body) {
      throw new Error("No response body from agent server")
    }

    console.log(`[LlamaIndex] Streaming response from agent server`)

    // Create a clean SSE-to-text transform stream
    const sseTransformer = createSSETransformStream()
    const textStream = response.body!.pipeThrough(sseTransformer)

    return new Response(textStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      }
    })
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
