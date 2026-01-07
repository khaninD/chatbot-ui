import { openai } from "@llamaindex/openai"
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
  temperature?: number
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

    // Create LLM with API key
    const llm = openai({
      model: model || "gpt-4o",
      apiKey: apiKey || process.env.OPENAI_API_KEY,
      temperature: temperature !== undefined ? temperature : 1
    })

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
  chatHistory?: Array<{ role: "user" | "assistant"; content: string }>
) {
  const { agent: sqlAgent, servers } = await createAgent(
    systemPrompt,
    apiKey,
    model,
    toolUrls,
    temperature
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
