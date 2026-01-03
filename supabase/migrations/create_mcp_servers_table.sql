-- Create mcp_servers table
CREATE TABLE IF NOT EXISTS mcp_servers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL,
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    sharing TEXT NOT NULL DEFAULT 'private'
);

-- Create index on user_id for faster queries
CREATE INDEX idx_mcp_servers_user_id ON mcp_servers(user_id);

-- Create index on folder_id for faster queries
CREATE INDEX idx_mcp_servers_folder_id ON mcp_servers(folder_id);

-- Enable Row Level Security
ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own mcp servers
CREATE POLICY "Users can view their own mcp servers"
    ON mcp_servers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mcp servers"
    ON mcp_servers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mcp servers"
    ON mcp_servers FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mcp servers"
    ON mcp_servers FOR DELETE
    USING (auth.uid() = user_id);

-- Create mcp_server_workspaces junction table
CREATE TABLE IF NOT EXISTS mcp_server_workspaces (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mcp_server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    PRIMARY KEY (mcp_server_id, workspace_id)
);

-- Create indexes for junction table
CREATE INDEX idx_mcp_server_workspaces_user_id ON mcp_server_workspaces(user_id);
CREATE INDEX idx_mcp_server_workspaces_mcp_server_id ON mcp_server_workspaces(mcp_server_id);
CREATE INDEX idx_mcp_server_workspaces_workspace_id ON mcp_server_workspaces(workspace_id);

-- Enable Row Level Security
ALTER TABLE mcp_server_workspaces ENABLE ROW LEVEL SECURITY;

-- Create policies for junction table
CREATE POLICY "Users can view their own mcp server workspaces"
    ON mcp_server_workspaces FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mcp server workspaces"
    ON mcp_server_workspaces FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mcp server workspaces"
    ON mcp_server_workspaces FOR DELETE
    USING (auth.uid() = user_id);
