import { openai } from "@llamaindex/openai"
import { anthropic } from "@llamaindex/anthropic"
import { mcp } from "@llamaindex/tools"
import {
  agent,
  agentStreamEvent,
  agentToolCallEvent,
  agentToolCallResultEvent
} from "@llamaindex/workflow"
import { createImageGenerationTool } from "./tools/image-generation-tool"
import {
  createImageEditTool,
  setUserImages,
  clearUserImages
} from "./tools/image-edit-tool"

/**
 * Create a LlamaIndex agent with MCP tools
 */
export async function createAgent(
  customSystemPrompt?: string,
  apiKey?: string,
  model?: string,
  toolUrls?: string[],
  temperature?: number,
  useCometAPI?: boolean,
  enableImageGeneration?: boolean,
  userId?: string
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

    console.log(`[LlamaIndex Agent] MCP tools loaded: ${allTools.length}`)

    // Add image generation tool if enabled
    if (enableImageGeneration && apiKey) {
      const imageGenTool = createImageGenerationTool({
        apiKey,
        baseURL: useCometAPI ? "https://api.cometapi.com/v1" : undefined,
        model: "gpt-image-1.5",
        userId
      })
      allTools.push(imageGenTool)
      console.log(`[LlamaIndex Agent] Image generation tool enabled`)

      // Also add image editing tool
      const imageEditTool = createImageEditTool({
        apiKey,
        baseURL: useCometAPI ? "https://api.cometapi.com/v1" : undefined,
        model: "gpt-image-1.5",
        userId
      })
      allTools.push(imageEditTool)
      console.log(`[LlamaIndex Agent] Image editing tool enabled`)
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
  useCometAPI?: boolean,
  enableImageGeneration?: boolean,
  images?: string[],
  userId?: string
) {
  const { agent: sqlAgent, servers } = await createAgent(
    systemPrompt,
    apiKey,
    model,
    toolUrls,
    temperature,
    useCometAPI,
    enableImageGeneration,
    userId
  )

  try {
    // Convert chat history to ChatMessage format if provided
    const formattedHistory = chatHistory?.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // If images are provided, make them available to image editing tool
    // IMPORTANT: Don't add image data to query - it would exceed token limits
    let finalQuery = query

    if (images && images.length > 0) {
      console.log(
        `[LlamaIndex Agent] Setting ${images.length} user images for editing tools`
      )
      // Set images for the edit tool to use (stored separately, not in context)
      setUserImages(images)

      // Add SHORT context to the query so the agent knows images are available
      // Don't include the actual image data!
      if (images.length === 1) {
        finalQuery =
          query +
          " [IMAGE_ATTACHED: User uploaded 1 image. Use edit_image tool to modify it.]"
      } else {
        finalQuery =
          query +
          ` [IMAGES_ATTACHED: User uploaded ${images.length} images (numbered 0-${images.length - 1}). Use edit_image tool with image_index parameter to modify a specific image. If user doesn't specify which image, ask them or default to image 0.]`
      }
    } else {
      // Clear any previously set images
      clearUserImages()
    }

    // Get the stream of events with chat history
    const events = sqlAgent.runStream(finalQuery, {
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
