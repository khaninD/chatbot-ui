/**
 * Multi-Agent Coordinator
 * Creates and manages a multi-agent workflow with specialized agents
 */

import { multiAgent, AgentWorkflow } from "@llamaindex/workflow"
import { ToolCallLLM, BaseToolWithCall } from "@llamaindex/core/llms"
import { Memory } from "@llamaindex/core/memory"
import { createSpecializedAgents } from "./specialized-agents"

/**
 * Configuration for multi-agent coordinator
 */
export interface MultiAgentConfig {
  llm: ToolCallLLM
  tools: BaseToolWithCall[]
  memory?: Memory
  verbose?: boolean
  enabledAgents?: {
    researcher?: boolean
    coder?: boolean
    dataAnalyst?: boolean
    imageSpecialist?: boolean
    customTools?: boolean
  }
}

/**
 * Create a multi-agent coordinator workflow
 *
 * This creates a workflow with multiple specialized agents that can:
 * - Delegate tasks to each other
 * - Work together on complex problems
 * - Automatically route to the best agent for each subtask
 *
 * @param config - Configuration for the multi-agent system
 * @returns AgentWorkflow with all specialized agents
 */
export function createMultiAgentCoordinator(
  config: MultiAgentConfig
): AgentWorkflow {
  const { llm, tools, memory, verbose = false, enabledAgents = {} } = config

  // Default: enable all agents
  const enabled = {
    researcher: enabledAgents.researcher !== false,
    coder: enabledAgents.coder !== false,
    dataAnalyst: enabledAgents.dataAnalyst !== false,
    imageSpecialist: enabledAgents.imageSpecialist !== false,
    customTools: enabledAgents.customTools !== false
  }

  // Create specialized agents
  const specializedAgents = createSpecializedAgents(llm, tools)

  // Select enabled agents
  const activeAgents = []
  if (enabled.researcher) activeAgents.push(specializedAgents.researcher)
  if (enabled.coder) activeAgents.push(specializedAgents.coder)
  if (enabled.dataAnalyst) activeAgents.push(specializedAgents.dataAnalyst)
  if (enabled.imageSpecialist)
    activeAgents.push(specializedAgents.imageSpecialist)
  if (enabled.customTools) activeAgents.push(specializedAgents.customTools)

  if (activeAgents.length === 0) {
    throw new Error(
      "At least one agent must be enabled in multi-agent coordinator"
    )
  }

  // if (verbose) {
  //   console.log(`[Multi-Agent] Creating coordinator with agents:`)
  //   activeAgents.forEach((agent) => {
  //     console.log(`  - ${agent.name}: ${agent.description}`)
  //   })
  // }

  // Determine root agent based on available agents
  // Priority: researcher > coder > data_analyst > image_specialist
  // Researcher is best as root because it can delegate to everyone
  let rootAgent
  if (enabled.researcher) {
    rootAgent = specializedAgents.researcher
  } else if (enabled.coder) {
    rootAgent = specializedAgents.coder
  } else if (enabled.dataAnalyst) {
    rootAgent = specializedAgents.dataAnalyst
  } else {
    rootAgent = activeAgents[0]
  }

  // if (verbose) {
  //   console.log(`[Multi-Agent] Root agent: ${rootAgent.name}`)
  // }

  // Create multi-agent workflow
  const workflow = multiAgent({
    agents: activeAgents,
    rootAgent: rootAgent,
    memory,
    verbose
  })

  return workflow
}

/**
 * Create a single-agent workflow (backward compatible)
 * This is useful when you want to use just one specialized agent
 * NOTE: For single agent, we just return the agent itself - no need for multiAgent wrapper
 */
export function createSingleSpecializedAgent(
  agentType: "researcher" | "coder" | "data_analyst" | "image_specialist",
  llm: ToolCallLLM,
  tools: BaseToolWithCall[],
  memory?: Memory,
  verbose?: boolean
): AgentWorkflow {
  const specializedAgents = createSpecializedAgents(llm, tools)

  // Return the specific agent directly - it's already an AgentWorkflow
  switch (agentType) {
    case "researcher":
      return specializedAgents.researcher
    case "coder":
      return specializedAgents.coder
    case "data_analyst":
      return specializedAgents.dataAnalyst
    case "image_specialist":
      return specializedAgents.imageSpecialist
  }
}

/**
 * Utility to determine which agent to use based on query
 * This can be used for intelligent routing
 */
export function suggestAgentForQuery(query: string): string[] {
  const lowercaseQuery = query.toLowerCase()
  const suggestions: string[] = []

  // Research-related keywords
  if (
    /search|find|look|explore|read|understand|what is|where is|how does/i.test(
      query
    )
  ) {
    suggestions.push("researcher")
  }

  // Code-related keywords
  if (
    /write|create|implement|build|add|modify|edit|refactor|fix|code|function|class/i.test(
      query
    )
  ) {
    suggestions.push("coder")
  }

  // Data-related keywords
  if (
    /query|sql|database|data|analyze|report|statistics|aggregate|count|sum|table/i.test(
      query
    )
  ) {
    suggestions.push("data_analyst")
  }

  // Image-related keywords
  if (
    /image|picture|photo|generate|draw|create.*image|edit.*image|visual/i.test(
      query
    )
  ) {
    suggestions.push("image_specialist")
  }

  // Default to coder if no specific match
  if (suggestions.length === 0) {
    suggestions.push("coder")
  }

  return suggestions
}
