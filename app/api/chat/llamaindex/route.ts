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

    // Create a transformed stream to process SSE events
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const transformedStream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader()
        let buffer = ""

        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              controller.close()
              break
            }

            // Decode the chunk and add to buffer
            buffer += decoder.decode(value, { stream: true })

            // Process complete SSE messages (ending with \n\n)
            const lines = buffer.split("\n\n")
            buffer = lines.pop() || "" // Keep incomplete message in buffer

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6) // Remove "data: " prefix

                try {
                  const event = JSON.parse(data)

                  if (event.type === "text_delta") {
                    // Stream text deltas directly to the client
                    controller.enqueue(encoder.encode(event.data.delta))
                  } else if (event.type === "tool_call") {
                    // Show tool calls as formatted text
                    const toolInfo = `\n[Using tool: ${event.data.toolName}]\n`
                    controller.enqueue(encoder.encode(toolInfo))
                  } else if (event.type === "tool_result") {
                    // Show tool results as formatted text
                    const resultText =
                      typeof event.data.toolOutput === "string"
                        ? event.data.toolOutput
                        : JSON.stringify(event.data.toolOutput, null, 2)
                    const toolResult = `[Result from ${event.data.toolName}]:\n${resultText}\n\n`
                    controller.enqueue(encoder.encode(toolResult))
                  } else if (event.type === "error") {
                    console.error(
                      "[LlamaIndex] Stream error:",
                      event.data.error
                    )
                    controller.error(new Error(event.data.error))
                    break
                  }
                  // Ignore 'done' event, just close stream naturally
                } catch (parseError) {
                  console.error(
                    "[LlamaIndex] Failed to parse SSE data:",
                    data,
                    parseError
                  )
                }
              }
            }
          }
        } catch (error) {
          console.error("[LlamaIndex] Stream error:", error)
          controller.error(error)
        }
      }
    })

    return new Response(transformedStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
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
