/**
 * Research Agent A2A Endpoint
 * Exposes the research specialist agent via A2A protocol
 */

import { ServerRuntime } from "next"
import { openai } from "@llamaindex/openai"
import { anthropic } from "@llamaindex/anthropic"
import { mcp } from "@llamaindex/tools"
import { createSingleSpecializedAgent } from "@/lib/llamaindex/agents/multi-agent-coordinator"
import {
  validateA2ARequest,
  createA2AResponse,
  createA2AError,
  fromA2AMessages
} from "@/lib/llamaindex/agents/a2a-types"
import { getServerProfile, checkApiKey } from "@/lib/server/server-chat-helpers"

export const runtime: ServerRuntime = "nodejs"

/**
 * POST /api/agents/research
 * Research agent endpoint following A2A protocol
 */
export async function POST(request: Request) {
  try {
    // Parse and validate A2A request
    const body = await request.json()
    const a2aRequest = validateA2ARequest(body)

    console.log(
      `[A2A Research Agent] Request received - thread: ${a2aRequest.thread_id}`
    )

    // Get user profile for API keys
    const profile = await getServerProfile()
    const cometApiKey = profile.comet_api_key || process.env.COMET_API_KEY
    const apiKeyToUse =
      cometApiKey || profile.openai_api_key || process.env.OPENAI_API_KEY

    if (cometApiKey) {
      checkApiKey(cometApiKey, "Comet")
    } else {
      checkApiKey(apiKeyToUse || null, "OpenAI")
    }

    // Load MCP tools (research agent needs search/read tools)
    const mcpTools: unknown[] = []
    // You can configure specific MCP servers for research agent
    // For now, we'll use environment variable or default config
    const mcpServerUrl = process.env.MCP_SERVER_URL

    if (mcpServerUrl) {
      console.log(`[A2A Research Agent] Loading MCP tools from ${mcpServerUrl}`)
      const mcpServer = mcp({
        url: mcpServerUrl,
        verbose: process.env.NODE_ENV === "development"
      })

      const tools = await mcpServer.tools()
      mcpTools.push(...tools)
      console.log(`[A2A Research Agent] Loaded ${tools.length} MCP tools`)

      // Cleanup will happen automatically when request completes
    }

    // Create LLM
    const modelId = "gpt-4o" // Default model for A2A agents
    const isClaudeModel = modelId.toLowerCase().startsWith("claude-")

    const llmConfig: {
      model: string
      apiKey: string
      temperature: number
      baseURL?: string
    } = {
      model: modelId,
      apiKey: apiKeyToUse || "",
      temperature: 1 // Default temperature
    }

    if (cometApiKey) {
      llmConfig.baseURL = "https://api.cometapi.com/v1"
    }

    const llm = isClaudeModel ? anthropic(llmConfig) : openai(llmConfig)

    // Create research agent workflow
    const researchWorkflow = createSingleSpecializedAgent(
      "researcher",
      llm,
      mcpTools as any,
      undefined,
      process.env.NODE_ENV === "development"
    )

    // Convert A2A messages to ChatMessage format
    const chatHistory = fromA2AMessages(a2aRequest.messages.slice(0, -1))
    const userQuery =
      a2aRequest.messages[a2aRequest.messages.length - 1].content

    console.log(`[A2A Research Agent] Query: ${userQuery.substring(0, 100)}...`)

    // Run the research agent
    const result = await researchWorkflow.run(userQuery, {
      chatHistory
    })

    console.log(`[A2A Research Agent] Response generated`)

    // Create A2A response
    const response = createA2AResponse(
      a2aRequest.thread_id,
      result.data.result as string,
      "researcher",
      {
        model: modelId,
        tool_calls: result.data.state?.scratchpad?.length || 0
      }
    )

    return Response.json(response)
  } catch (error) {
    console.error("[A2A Research Agent] Error:", error)

    const errorMessage =
      error instanceof Error ? error.message : "Research agent error"

    return Response.json(
      createA2AError("unknown", errorMessage, "researcher"),
      { status: 500 }
    )
  }
}
