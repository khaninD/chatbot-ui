import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { buildRetrievalText } from "@/lib/build-prompt"
import { Database, Tables } from "@/supabase/types"
import { ChatSettings } from "@/types"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { ServerRuntime } from "next"
import { buildAgentServerStreamRequest } from "@/lib/agent-server/request"
import { parseAgentServerSseBuffer } from "@/lib/agent-server/stream"
import { AgentServerStreamEvent } from "@/types/agent-server"
import { createRAGQueryEngine, queryRAG } from "@/lib/llamaindex/rag"

export const runtime: ServerRuntime = "nodejs"

interface MessageContentPart {
  type: string
  text?: string
  image_url?: { url: string }
}

interface Message {
  role: "system" | "user" | "assistant"
  content: string | MessageContentPart[]
}

interface AgentChatRequestBody {
  chatSettings: ChatSettings
  messages: Message[]
  messageFileItems?: Tables<"file_items">[]
  chatFileItems?: Tables<"file_items">[]
  sessionId?: string
  workspaceId?: string
  fileIds?: string[]
}

const sendSseEvent = (
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  event: AgentServerStreamEvent
) => {
  const sseData = `data: ${JSON.stringify(event)}\n\n`
  controller.enqueue(encoder.encode(sseData))
}

const sendStreamError = (
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  errorMessage: string
) => {
  sendSseEvent(controller, encoder, {
    type: "content_block_delta",
    index: 0,
    delta: {
      type: "text_delta",
      text: `\n\n❌ Error: ${errorMessage}\n\nThe agent encountered an error and will stop processing. Please try again or rephrase your request.`
    }
  })
  sendSseEvent(controller, encoder, {
    type: "message_delta",
    delta: {
      stop_reason: "error"
    }
  })
  sendSseEvent(controller, encoder, {
    type: "message_stop"
  })
}

export async function POST(request: Request) {
  const json = (await request.json()) as AgentChatRequestBody
  const { chatSettings, messages, sessionId, workspaceId, fileIds } = json
  console.log("ChatSettings Model:", chatSettings.model)
  try {
    if (!sessionId) {
      return new Response("Missing sessionId", { status: 400 })
    }

    const profile = await getServerProfile()

    const apiKey = process.env.LLM_API_KEY
    if (!apiKey) {
      return new Response("Missing API key", { status: 400 })
    }
    checkApiKey(apiKey || null, "OpenAI")

    const lastMessage = messages[messages.length - 1]
    let userQuery = ""

    if (typeof lastMessage.content === "string") {
      userQuery = lastMessage.content
    } else if (Array.isArray(lastMessage.content)) {
      for (const part of lastMessage.content) {
        if (part.type === "text" && part.text) {
          userQuery += part.text
        }
      }
    }

    const systemMessage = messages.find(msg => msg.role === "system")
    const systemPrompt =
      typeof systemMessage?.content === "string"
        ? systemMessage.content
        : systemMessage?.content?.[0]?.text || ""

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
          console.error("[AgentServer] Error fetching MCP servers:", error)
        } else if (mcpServers) {
          mcpUrls = mcpServers.map(server => server.url)
        }
      } catch (error) {
        console.error("[AgentServer] Error fetching MCP servers:", error)
      }
    }

    const baseURL = process.env.LLM_BASE_URL || undefined

    const agentServerUrl = process.env.AGENT_SERVER_URL || ""

    if (!agentServerUrl) {
      return new Response("Missing agent server URL", { status: 500 })
    }
    console.log("AGENT-server Config:", {
      sessionId,
      workspaceId,
      query: userQuery,
      systemPrompt,
      mcpUrls,
      fileIds,
      llmConfig: {
        provider: "openai",
        apiKey,
        model: chatSettings.model || "gpt-4o",
        baseURL
      }
    })
    const agentRequest = buildAgentServerStreamRequest({
      sessionId,
      workspaceId,
      query: userQuery,
      systemPrompt,
      mcpUrls,
      fileIds,
      llmConfig: {
        provider: "openai",
        apiKey,
        model: chatSettings.model || "gpt-4o",
        baseURL
      }
    })

    const agentResponse = await fetch(
      `${agentServerUrl.replace(/\/$/, "")}/api/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(agentRequest)
      }
    )
    console.log("AGENT-server Response:", agentResponse)
    if (!agentResponse.ok) {
      const errorText = await agentResponse.text()
      return new Response(errorText || "Agent server error", {
        status: agentResponse.status
      })
    }

    if (!agentResponse.body) {
      return new Response("Agent server returned empty body", { status: 500 })
    }

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    let buffer = ""

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = agentResponse.body!.getReader()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })

            const parsed = parseAgentServerSseBuffer(buffer)
            buffer = parsed.remainder
            for (const event of parsed.events) {
              sendSseEvent(controller, encoder, event)
            }
          }

          if (buffer.trim().length > 0) {
            const parsed = parseAgentServerSseBuffer(`${buffer}\n\n`)
            for (const event of parsed.events) {
              sendSseEvent(controller, encoder, event)
            }
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown stream error"
          console.error("[AgentServer] Stream error:", error)
          sendStreamError(controller, encoder, message)
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      }
    })
  } catch (error) {
    console.error("[AgentServer] Error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return new Response(message, { status: 500 })
  }
}
