import { AgentServerStreamRequest } from "@/types/agent-server"

interface BuildAgentServerRequestParams {
  sessionId: string
  query: string
  systemPrompt?: string
  mcpUrls?: string[]
  llmConfig: AgentServerStreamRequest["llmConfig"]
  subAgents?: AgentServerStreamRequest["subAgents"]
}

export const buildAgentServerStreamRequest = (
  params: BuildAgentServerRequestParams
): AgentServerStreamRequest => ({
  sessionId: params.sessionId,
  query: params.query,
  llmConfig: params.llmConfig,
  systemPrompt: params.systemPrompt,
  mcpUrls: params.mcpUrls,
  subAgents: params.subAgents
})
