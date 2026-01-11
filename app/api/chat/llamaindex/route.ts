import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { buildRetrievalText } from "@/lib/build-prompt"
import { Database, Tables } from "@/supabase/types"
import { ChatSettings } from "@/types"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { ServerRuntime } from "next"
import { runAgentStream } from "@/lib/llamaindex/agent"

export const runtime: ServerRuntime = "nodejs" // Changed from "edge" to support LlamaIndex

interface Message {
  role: "system" | "user" | "assistant"
  content: string | Array<{ text?: string }>
}

interface TextDeltaEvent {
  type: "text_delta"
  data: {
    delta: string
  }
}

interface ToolCallEvent {
  type: "tool_call"
  data: {
    toolName: string
    toolInput: Record<string, unknown>
  }
}

interface ToolResultEvent {
  type: "tool_result"
  data: {
    toolName: string
    toolOutput: unknown
  }
}

interface DoneEvent {
  type: "done"
  data: Record<string, never>
}

export async function POST(request: Request) {
  const json = await request.json()
  const {
    chatSettings,
    messages,
    messageFileItems,
    chatFileItems: _chatFileItems
  } = json as {
    chatSettings: ChatSettings
    messages: Message[]
    messageFileItems?: Tables<"file_items">[]
    chatFileItems?: Tables<"file_items">[]
  }

  try {
    const profile = await getServerProfile()

    // Determine which API key to use - prefer Comet if available, fallback to OpenAI
    const cometApiKey = profile.comet_api_key || process.env.COMET_API_KEY
    const apiKeyToUse =
      cometApiKey || profile.openai_api_key || process.env.OPENAI_API_KEY

    if (cometApiKey) {
      checkApiKey(cometApiKey, "Comet")
    } else {
      checkApiKey(
        profile.openai_api_key || process.env.OPENAI_API_KEY || null,
        "OpenAI"
      )
    }

    // Extract last user message
    const lastMessage = messages[messages.length - 1]
    let userQuery =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : lastMessage.content[0]?.text || ""

    // Add RAG content if file items are provided (reusing buildRetrievalText)
    if (messageFileItems && messageFileItems.length > 0) {
      const retrievalText = buildRetrievalText(messageFileItems)
      userQuery = `${userQuery}\n\n${retrievalText}`
      console.log(
        `[LlamaIndex] Added RAG content from ${messageFileItems.length} file items`
      )
    }

    // Extract system prompt from messages
    const systemMessage = messages.find(msg => msg.role === "system")
    const systemPrompt =
      typeof systemMessage?.content === "string"
        ? systemMessage.content
        : systemMessage?.content?.[0]?.text || ""

    // Build conversation history from all messages (excluding system message and last user message)
    const conversationMessages = messages
      .filter(msg => msg.role !== "system")
      .slice(0, -1) // Remove last message as it's the query
      .map(msg => ({
        role: msg.role as "user" | "assistant",
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
      `[LlamaIndex] Starting agent with ${conversationMessages.length} history messages`
    )
    console.log(`[LlamaIndex] MCP Server URLs:`, mcpUrls)

    // Log conversation summary (first 100 chars of each message)
    console.log("[LlamaIndex] Conversation summary:")
    conversationMessages.forEach((msg, i) => {
      const preview = msg.content.substring(0, 100).replace(/\n/g, " ")
      console.log(
        `  ${i + 1}. ${msg.role}: ${preview}${msg.content.length > 100 ? "..." : ""}`
      )
    })
    console.log(`Query: ${userQuery.substring(0, 100)}...`)

    // For llamaindex-sql-agent model, temperature must be 1 (default)
    // For other models, use the temperature from chatSettings
    const temperature =
      chatSettings.agentModel === "llamaindex-sql-agent"
        ? 1
        : chatSettings.temperature || 1

    // Create a readable stream from the agent generator
    const encoder = new TextEncoder()
    let contentBlockIndex = 0
    // Map to store tool_use IDs for matching with tool_results
    const toolUseIdMap = new Map<string, string>()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Helper to send SSE event
          const sendSSE = (event: Record<string, unknown>) => {
            const sseData = `data: ${JSON.stringify(event)}\n\n`
            controller.enqueue(encoder.encode(sseData))
          }

          // Run the agent and stream events
          const events = runAgentStream(
            userQuery,
            systemPrompt,
            apiKeyToUse || undefined,
            chatSettings.agentModel || "gpt-4o",
            mcpUrls,
            temperature,
            conversationMessages,
            !!cometApiKey
          )

          for await (const event of events) {
            switch (event.type) {
              case "text_delta": {
                const textEvent = event as TextDeltaEvent
                // Send text delta event (Anthropic-style)
                sendSSE({
                  type: "content_block_delta",
                  index: contentBlockIndex,
                  delta: {
                    type: "text_delta",
                    text: textEvent.data.delta
                  }
                })
                break
              }

              case "tool_call": {
                const toolCallEvent = event as ToolCallEvent
                // Log tool call with request details (like Claude Code)
                console.log(`\n[LlamaIndex] 🔧 ${toolCallEvent.data.toolName}`)
                if (toolCallEvent.data.toolInput) {
                  console.log("Request:")
                  console.log(
                    JSON.stringify(toolCallEvent.data.toolInput, null, 2)
                  )
                }

                // Generate unique tool_use ID and store it
                const toolUseId = `tool_${Date.now()}_${contentBlockIndex}`
                toolUseIdMap.set(toolCallEvent.data.toolName, toolUseId)

                // Send tool_use content block start (Anthropic-style)
                sendSSE({
                  type: "content_block_start",
                  index: contentBlockIndex++,
                  content_block: {
                    type: "tool_use",
                    id: toolUseId,
                    name: toolCallEvent.data.toolName,
                    input: toolCallEvent.data.toolInput
                  }
                })

                // Send content block stop
                sendSSE({
                  type: "content_block_stop",
                  index: contentBlockIndex - 1
                })
                break
              }

              case "tool_result": {
                const toolResultEvent = event as ToolResultEvent
                // Log tool result with response details (like Claude Code)
                console.log("Response:")
                if (typeof toolResultEvent.data.toolOutput === "string") {
                  try {
                    const parsed = JSON.parse(toolResultEvent.data.toolOutput)
                    console.log(JSON.stringify(parsed, null, 2))
                  } catch {
                    console.log(toolResultEvent.data.toolOutput)
                  }
                } else {
                  console.log(
                    JSON.stringify(toolResultEvent.data.toolOutput, null, 2)
                  )
                }
                console.log(
                  `[LlamaIndex] ✓ Tool completed: ${toolResultEvent.data.toolName}\n`
                )

                // Get the matching tool_use_id from the map
                const toolUseId = toolUseIdMap.get(
                  toolResultEvent.data.toolName
                )

                // Send tool_result content block to frontend
                sendSSE({
                  type: "content_block_start",
                  index: contentBlockIndex++,
                  content_block: {
                    type: "tool_result",
                    tool_use_id:
                      toolUseId || `tool_unknown_${contentBlockIndex}`,
                    tool_name: toolResultEvent.data.toolName,
                    content: toolResultEvent.data.toolOutput
                  }
                })

                // Send content block stop
                sendSSE({
                  type: "content_block_stop",
                  index: contentBlockIndex - 1
                })

                // Also send a message delta to indicate tool use completion
                sendSSE({
                  type: "message_delta",
                  delta: {
                    stop_reason: "tool_use"
                  }
                })

                // Clean up the map entry after use
                toolUseIdMap.delete(toolResultEvent.data.toolName)
                break
              }

              case "done":
                // Agent finished
                console.log("[LlamaIndex] Agent completed")
                break
            }
          }

          controller.close()
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Agent error"
          console.error("[LlamaIndex] Agent error:", error)
          const sseData = `data: ${JSON.stringify({
            type: "error",
            error: errorMessage
          })}\n\n`
          controller.enqueue(encoder.encode(sseData))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no" // Disable nginx buffering
      }
    })
  } catch (error) {
    console.error("[LlamaIndex] Error:", error)

    let errorMessage = "An unexpected error occurred"
    let errorCode = 500

    if (error instanceof Error) {
      errorMessage = error.message
      // Log the full error for debugging
      console.error("[LlamaIndex] Full error details:", {
        message: error.message,
        stack: error.stack
      })
    }

    // Check if error has status property
    if (typeof error === "object" && error !== null && "status" in error) {
      errorCode = (error as { status: number }).status
    }

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
