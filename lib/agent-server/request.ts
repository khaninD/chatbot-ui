import { AgentServerStreamRequest } from "@/types/agent-server"

interface BuildAgentServerRequestParams {
  sessionId: string
  workspaceId?: string
  query: string
  systemPrompt?: string
  mcpServers?: AgentServerStreamRequest["mcpServers"]
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
  mcpServers: params.mcpServers,
  fileIds: params.fileIds,
  subAgents: params.subAgents
})
