import { openai } from "@llamaindex/openai"
import { anthropic } from "@llamaindex/anthropic"
import { mcp } from "@llamaindex/tools"
import {
  agent,
  agentStreamEvent,
  agentToolCallEvent,
  agentToolCallResultEvent
} from "@llamaindex/workflow"

/**
 * Create a LlamaIndex agent with MCP tools
 */
export async function createAgent(
  customSystemPrompt?: string,
  apiKey?: string,
  model?: string,
  toolUrls?: string[],
  temperature?: number,
  useCometAPI?: boolean
): Promise<{
  agent: ReturnType<typeof agent>
  servers: Array<{ cleanup: () => Promise<void> }>
}> {
  const mcpServers: Array<{ cleanup: () => Promise<void> }> = []
  const allTools: unknown[] = []

  try {
    // Load tools from all MCP servers
    if (toolUrls && toolUrls.length > 0) {
      for (const url of toolUrls) {
        console.log(`[LlamaIndex Agent] Loading MCP tools from ${url}`)
        const mcpServer = mcp({
          url,
          verbose: process.env.NODE_ENV === "development"
        })
        mcpServers.push(mcpServer)

        const tools = await mcpServer.tools()
        allTools.push(...tools)
        console.log(
          `[LlamaIndex Agent] Loaded ${tools.length} MCP tools from ${url}`
        )
      }
    }

    console.log(`[LlamaIndex Agent] Total tools loaded: ${allTools.length}`)

    const finalSystemPrompt = customSystemPrompt || ""

    const modelId = model || "gpt-4o"
    const isClaudeModel = modelId.toLowerCase().startsWith("claude-")

    // Create LLM with API key and conditionally add baseURL for Comet
    const llmConfig: {
      model: string
      apiKey: string
      temperature: number
      baseURL?: string
    } = {
      model: modelId,
      apiKey: apiKey || process.env.OPENAI_API_KEY || "",
      temperature: temperature !== undefined ? temperature : 1
    }

    // Determine which provider to use
    // IMPORTANT: Comet API is OpenAI-compatible, so always use OpenAI provider with Comet
    let useAnthropicProvider = false

    if (useCometAPI) {
      // Comet API - always use OpenAI provider (OpenAI-compatible)
      llmConfig.baseURL = "https://api.cometapi.com/v1"
      console.log(
        `[LlamaIndex Agent] Using Comet API (OpenAI-compatible) with model: ${llmConfig.model}`
      )
    } else {
      // Direct API access - use native provider
      if (isClaudeModel) {
        useAnthropicProvider = true
        console.log(
          `[LlamaIndex Agent] Using native Anthropic API with model: ${llmConfig.model}`
        )
      } else {
        console.log(
          `[LlamaIndex Agent] Using native OpenAI API with model: ${llmConfig.model}`
        )
      }
    }

    console.log(`[LlamaIndex Agent] LLM Config:`, {
      model: llmConfig.model,
      provider: useAnthropicProvider ? "anthropic" : "openai",
      temperature: llmConfig.temperature,
      baseURL: llmConfig.baseURL || "default",
      apiKeyLength: llmConfig.apiKey.length,
      usingCometAPI: useCometAPI
    })

    // Use Anthropic provider only for direct Anthropic API access
    // For Comet API (OpenAI-compatible), always use OpenAI provider
    const llm = useAnthropicProvider ? anthropic(llmConfig) : openai(llmConfig)

    // Create agent
    const sqlAgent = agent({
      name: "SQL Assistant",
      systemPrompt: finalSystemPrompt,
      tools: allTools as Parameters<typeof agent>[0]["tools"],
      llm,
      verbose: process.env.NODE_ENV === "development"
    })

    // Return cleanup functions for all MCP servers
    const cleanupFunctions = mcpServers.map(server => ({
      cleanup: server.cleanup.bind(server)
    }))

    return {
      agent: sqlAgent,
      servers: cleanupFunctions
    }
  } catch (error) {
    // Cleanup all servers on error
    await Promise.all(mcpServers.map(server => server.cleanup()))
    throw error
  }
}

/**
 * Stream agent responses with tool calls and text deltas
 */
export async function* runAgentStream(
  query: string,
  systemPrompt?: string,
  apiKey?: string,
  model?: string,
  toolUrls?: string[],
  temperature?: number,
  chatHistory?: Array<{ role: "user" | "assistant"; content: string }>,
  useCometAPI?: boolean
) {
  const { agent: sqlAgent, servers } = await createAgent(
    systemPrompt,
    apiKey,
    model,
    toolUrls,
    temperature,
    useCometAPI
  )

  try {
    // Convert chat history to ChatMessage format if provided
    const formattedHistory = chatHistory?.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // Get the stream of events with chat history
    const events = sqlAgent.runStream(query, {
      chatHistory: formattedHistory
    })

    // Stream events to the caller
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const event of events as any) {
      try {
        if (agentToolCallEvent.include(event)) {
          // Yield tool call information
          yield {
            type: "tool_call",
            data: {
              toolName: event.data.toolName,
              toolInput: event.data.toolKwargs
            }
          }
        }

        if (agentToolCallResultEvent.include(event)) {
          // Yield tool call result
          yield {
            type: "tool_result",
            data: {
              toolName: event.data.toolName,
              toolOutput: event.data.toolOutput
            }
          }
        }

        if (agentStreamEvent.include(event)) {
          // Yield text delta
          yield {
            type: "text_delta",
            data: {
              delta: event.data.delta
            }
          }
        }
      } catch (eventError) {
        console.error(`[LlamaIndex Agent] Error processing event:`, eventError)
        console.error(`[LlamaIndex Agent] Event data:`, event)
        // Continue processing other events
      }
    }

    // Signal completion
    yield {
      type: "done",
      data: {}
    }

    // Cleanup all servers
    await Promise.all(servers.map(server => server.cleanup()))
  } catch (error) {
    // Cleanup all servers on error
    await Promise.all(servers.map(server => server.cleanup()))
    throw error
  }
}
