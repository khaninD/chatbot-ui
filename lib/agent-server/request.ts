import { AgentServerStreamRequest } from "@/types/agent-server"

interface BuildAgentServerRequestParams {
  sessionId: string
  workspaceId?: string
  query: string
  systemPrompt?: string
  mcpUrls?: string[]
  fileIds?: string[]
  llmConfig: AgentServerStreamRequest["llmConfig"]
  subAgents?: AgentServerStreamRequest["subAgents"]
}

export const buildAgentServerStreamRequest = (
  params: BuildAgentServerRequestParams
): AgentServerStreamRequest => ({
  sessionId: params.sessionId,
  workspaceId: params.workspaceId,
  query: params.query,
  llmConfig: params.llmConfig,
  systemPrompt: params.systemPrompt,
  mcpUrls: params.mcpUrls,
  fileIds: params.fileIds,
  subAgents: params.subAgents
})
