/**
 * Main Coordinator Agent A2A Endpoint
 * Multi-agent coordinator that can delegate to specialized agents
 */

import { ServerRuntime } from "next"
import { openai } from "@llamaindex/openai"
import { anthropic } from "@llamaindex/anthropic"
import { mcp } from "@llamaindex/tools"
import { createMultiAgentCoordinator } from "@/lib/llamaindex/agents/multi-agent-coordinator"
import {
  validateA2ARequest,
  createA2AResponse,
  createA2AError,
  fromA2AMessages
} from "@/lib/llamaindex/agents/a2a-types"
import { getServerProfile, checkApiKey } from "@/lib/server/server-chat-helpers"

export const runtime: ServerRuntime = "nodejs"

/**
 * POST /api/agents/main
 * Main coordinator agent endpoint following A2A protocol
 * This agent can delegate to specialized agents automatically
 */
export async function POST(request: Request) {
  try {
    // Parse and validate A2A request
    const body = await request.json()
    const a2aRequest = validateA2ARequest(body)

    console.log(
      `[A2A Main Coordinator] Request received - thread: ${a2aRequest.thread_id}`
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

    // Load MCP tools (all tools available to coordinator)
    const mcpTools: unknown[] = []
    const mcpServerUrl = process.env.MCP_SERVER_URL

    if (mcpServerUrl) {
      console.log(
        `[A2A Main Coordinator] Loading MCP tools from ${mcpServerUrl}`
      )
      const mcpServer = mcp({
        url: mcpServerUrl,
        verbose: process.env.NODE_ENV === "development"
      })

      const tools = await mcpServer.tools()
      mcpTools.push(...tools)
      console.log(`[A2A Main Coordinator] Loaded ${tools.length} MCP tools`)
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

    // Create multi-agent coordinator workflow
    const coordinatorWorkflow = createMultiAgentCoordinator({
      llm,
      tools: mcpTools as any,
      verbose: process.env.NODE_ENV === "development",
      enabledAgents: {
        researcher: true,
        coder: true,
        dataAnalyst: true,
        imageSpecialist: true
      }
    })

    // Convert A2A messages to ChatMessage format
    const chatHistory = fromA2AMessages(a2aRequest.messages.slice(0, -1))
    const userQuery =
      a2aRequest.messages[a2aRequest.messages.length - 1].content

    console.log(
      `[A2A Main Coordinator] Query: ${userQuery.substring(0, 100)}...`
    )
    console.log(
      `[A2A Main Coordinator] Chat history: ${chatHistory.length} messages`
    )

    // Run the multi-agent coordinator
    const result = await coordinatorWorkflow.run(userQuery, {
      chatHistory
    })

    console.log(`[A2A Main Coordinator] Response generated`)
    console.log(
      `[A2A Main Coordinator] Agent handoffs: ${result.data.state?.agents?.length || 0}`
    )

    // Create A2A response
    const response = createA2AResponse(
      a2aRequest.thread_id,
      result.data.result as string,
      "main_coordinator",
      {
        model: modelId,
        tool_calls: result.data.state?.scratchpad?.length || 0,
        agents_involved: result.data.state?.agents || ["coder"],
        current_agent: result.data.state?.currentAgentName || "coder"
      }
    )

    return Response.json(response)
  } catch (error) {
    console.error("[A2A Main Coordinator] Error:", error)

    const errorMessage =
      error instanceof Error ? error.message : "Main coordinator error"

    return Response.json(
      createA2AError("unknown", errorMessage, "main_coordinator"),
      { status: 500 }
    )
  }
}
