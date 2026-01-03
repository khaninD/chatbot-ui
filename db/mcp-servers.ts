import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"

export const getMcpServerById = async (mcpServerId: string) => {
  const { data: mcpServer, error } = await supabase
    .from("mcp_servers")
    .select("*")
    .eq("id", mcpServerId)
    .single()

  if (!mcpServer) {
    throw new Error(error.message)
  }

  return mcpServer
}

export const getMcpServerWorkspacesByWorkspaceId = async (
  workspaceId: string
) => {
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select(
      `
      id,
      name,
      mcp_servers (*)
    `
    )
    .eq("id", workspaceId)
    .single()

  if (!workspace) {
    throw new Error(error.message)
  }

  return workspace
}

export const getMcpServerWorkspacesByMcpServerId = async (
  mcpServerId: string
) => {
  const { data: mcpServer, error } = await supabase
    .from("mcp_servers")
    .select(
      `
      id,
      name,
      workspaces (*)
    `
    )
    .eq("id", mcpServerId)
    .single()

  if (!mcpServer) {
    throw new Error(error.message)
  }

  return mcpServer
}

export const createMcpServer = async (
  mcpServer: TablesInsert<"mcp_servers">,
  workspace_id: string
) => {
  const { data: createdMcpServer, error } = await supabase
    .from("mcp_servers")
    .insert([mcpServer])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await createMcpServerWorkspace({
    user_id: createdMcpServer.user_id,
    mcp_server_id: createdMcpServer.id,
    workspace_id
  })

  return createdMcpServer
}

export const createMcpServers = async (
  mcpServers: TablesInsert<"mcp_servers">[],
  workspace_id: string
) => {
  const { data: createdMcpServers, error } = await supabase
    .from("mcp_servers")
    .insert(mcpServers)
    .select("*")

  if (error) {
    throw new Error(error.message)
  }

  await createMcpServerWorkspaces(
    createdMcpServers.map(mcpServer => ({
      user_id: mcpServer.user_id,
      mcp_server_id: mcpServer.id,
      workspace_id
    }))
  )

  return createdMcpServers
}

export const createMcpServerWorkspace = async (item: {
  user_id: string
  mcp_server_id: string
  workspace_id: string
}) => {
  const { data: createdMcpServerWorkspace, error } = await supabase
    .from("mcp_server_workspaces")
    .insert([item])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdMcpServerWorkspace
}

export const createMcpServerWorkspaces = async (
  items: { user_id: string; mcp_server_id: string; workspace_id: string }[]
) => {
  const { data: createdMcpServerWorkspaces, error } = await supabase
    .from("mcp_server_workspaces")
    .insert(items)
    .select("*")

  if (error) throw new Error(error.message)

  return createdMcpServerWorkspaces
}

export const updateMcpServer = async (
  mcpServerId: string,
  mcpServer: TablesUpdate<"mcp_servers">
) => {
  const { data: updatedMcpServer, error } = await supabase
    .from("mcp_servers")
    .update(mcpServer)
    .eq("id", mcpServerId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedMcpServer
}

export const deleteMcpServer = async (mcpServerId: string) => {
  const { error } = await supabase
    .from("mcp_servers")
    .delete()
    .eq("id", mcpServerId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

export const deleteMcpServerWorkspace = async (
  mcpServerId: string,
  workspaceId: string
) => {
  const { error } = await supabase
    .from("mcp_server_workspaces")
    .delete()
    .eq("mcp_server_id", mcpServerId)
    .eq("workspace_id", workspaceId)

  if (error) throw new Error(error.message)

  return true
}
