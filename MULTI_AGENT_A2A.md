# Multi-Agent System with A2A Protocol

This document describes the multi-agent architecture and A2A (Agent-to-Agent) protocol implementation.

## Overview

The system now supports **multiple specialized agents** that can work together and communicate via the **A2A protocol**:

- **Research Agent** - Searches, reads files, gathers information
- **Code Agent** - Writes, edits, and executes code
- **Data Agent** - Queries databases and analyzes data
- **Image Agent** - Generates and edits images
- **Main Coordinator** - Orchestrates all agents and delegates tasks

## Architecture

```
User Request
    ↓
Main Coordinator Agent
    ↓
┌─────────────────────────────────────┐
│  Intelligent Task Delegation        │
├─────────────────────────────────────┤
│                                     │
├→ Research Agent                     │
│   - Search documentation            │
│   - Read files                      │
│   - Gather information              │
│                                     │
├→ Code Agent                         │
│   - Write code                      │
│   - Edit files                      │
│   - Run commands                    │
│                                     │
├→ Data Agent                         │
│   - SQL queries                     │
│   - Data analysis                   │
│   - Generate reports                │
│                                     │
└→ Image Agent                        │
    - Generate images                 │
    - Edit images                     │
    - Image transformations           │
                                      │
        ↓                             │
    Combined Result                   │
└─────────────────────────────────────┘
```

## File Structure

```
lib/llamaindex/agents/
├── index.ts                         # Main exports
├── specialized-agents.ts            # Individual agent definitions
├── multi-agent-coordinator.ts       # Multi-agent orchestration
└── a2a-types.ts                     # A2A protocol types

app/api/agents/
├── research/route.ts                # Research agent A2A endpoint
├── code/route.ts                    # Code agent A2A endpoint
└── main/route.ts                    # Main coordinator A2A endpoint
```

## Specialized Agents

### 1. Research Agent

**Specialization:** Information gathering and exploration

**Tools:**
- Search (grep, glob patterns)
- Read files
- Fetch web content
- Navigate documentation

**System Prompt:**
```
You are a research specialist agent.
- Search and find information
- Read and understand files
- Extract key information
- Provide clear findings with file:line references
```

**Use cases:**
- "Find all API endpoints in the codebase"
- "Search for authentication logic"
- "What files handle user registration?"
- "Explore the database schema"

### 2. Code Agent

**Specialization:** Writing and modifying code

**Tools:**
- Write files
- Edit files
- Execute commands (bash)
- Create directories

**System Prompt:**
```
You are a code specialist agent.
- Write clean, maintainable code
- Edit existing code carefully
- Follow best practices
- Test changes after implementation
```

**Use cases:**
- "Implement a login function"
- "Add validation to the user form"
- "Refactor the API handler"
- "Fix the TypeScript errors"

### 3. Data Agent

**Specialization:** Database and data analysis

**Tools:**
- SQL queries
- Database operations
- Data aggregation
- Analytics

**System Prompt:**
```
You are a data analyst specialist agent.
- Write efficient SQL queries
- Analyze data patterns
- Generate insights
- Create reports
```

**Use cases:**
- "Show me all users registered this month"
- "Analyze sales trends"
- "Find duplicate records"
- "Generate a usage report"

### 4. Image Agent

**Specialization:** Image generation and editing

**Tools:**
- Generate images
- Edit images
- Image transformations

**System Prompt:**
```
You are an image specialist agent.
- Create images from descriptions
- Modify existing images
- Apply transformations
- Maintain quality
```

**Use cases:**
- "Generate a logo for my app"
- "Edit this image to add a border"
- "Create a hero image for the landing page"

## Multi-Agent Coordinator

The **Main Coordinator** manages all specialized agents and automatically delegates tasks:

```typescript
import { createMultiAgentCoordinator } from "@/lib/llamaindex/agents"

const coordinator = createMultiAgentCoordinator({
  llm: openai({ model: "gpt-4o" }),
  tools: allTools,
  verbose: true,
  enabledAgents: {
    researcher: true,
    coder: true,
    dataAnalyst: true,
    imageSpecialist: true
  }
})

// Coordinator will automatically delegate to the right agent
const result = await coordinator.run("Find the login function and add 2FA support")
```

### How Delegation Works

1. **User sends request** to Main Coordinator
2. **Coordinator analyzes task** and determines which agent(s) to use
3. **Agents can delegate to each other**:
   - Code Agent → Research Agent (to find existing code)
   - Research Agent → Code Agent (to implement findings)
   - Data Agent → Research Agent (to understand schema)
4. **Results are combined** and returned to user

## A2A Protocol

### Overview

A2A (Agent-to-Agent) is a standardized HTTP protocol for agents to communicate:

- **Standard message format** (thread_id, messages)
- **HTTP-based** (REST API)
- **Stateful conversations** (via thread_id)
- **Agent interoperability** (any agent can call any agent)

### A2A Request Format

```typescript
POST /api/agents/{agent_name}

{
  "thread_id": "unique-thread-id",
  "messages": [
    {
      "role": "user",
      "content": "Find all API endpoints"
    }
  ],
  "stream": false,
  "metadata": {}
}
```

### A2A Response Format

```typescript
{
  "type": "message",
  "content": "I found 12 API endpoints...",
  "thread_id": "unique-thread-id",
  "metadata": {
    "agent": "researcher",
    "model": "gpt-4o",
    "tool_calls": 5,
    "timestamp": "2026-01-19T..."
  }
}
```

### A2A Endpoints

| Endpoint | Agent | Purpose |
|----------|-------|---------|
| `/api/agents/main` | Main Coordinator | Multi-agent orchestration |
| `/api/agents/research` | Research Agent | Information gathering |
| `/api/agents/code` | Code Agent | Code writing/editing |

### Example: Agent-to-Agent Communication

```typescript
// LangGraph agent calling LlamaIndex research agent via A2A
const researchTool = {
  name: "research_agent",
  description: "Search and gather information",
  execute: async (query: string) => {
    const response = await fetch('/api/agents/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        thread_id: currentThread,
        messages: [{ role: 'user', content: query }]
      })
    })
    const result = await response.json()
    return result.content
  }
}

// Now LangGraph can use LlamaIndex agents as tools
const langGraphAgent = new Agent({
  tools: [researchTool, codeAgentTool, dataAgentTool]
})
```

## Usage Examples

### 1. Single Specialized Agent

```typescript
import { createSingleSpecializedAgent } from "@/lib/llamaindex/agents"

const researchAgent = createSingleSpecializedAgent(
  "researcher",
  llm,
  tools,
  memory,
  true // verbose
)

const result = await researchAgent.run("Find authentication code")
```

### 2. Multi-Agent Coordinator

```typescript
import { createMultiAgentCoordinator } from "@/lib/llamaindex/agents"

const coordinator = createMultiAgentCoordinator({
  llm,
  tools,
  verbose: true
})

// Coordinator automatically delegates
const result = await coordinator.run(
  "Find the user model, then add email validation"
)
// → Research Agent finds the model
// → Code Agent adds validation
```

### 3. A2A Call from External Agent

```bash
# Call research agent via A2A
curl -X POST http://localhost:3000/api/agents/research \
  -H "Content-Type: application/json" \
  -d '{
    "thread_id": "thread-123",
    "messages": [
      {"role": "user", "content": "Find all React components"}
    ]
  }'

# Response
{
  "type": "message",
  "content": "I found 15 React components...",
  "thread_id": "thread-123",
  "metadata": {
    "agent": "researcher",
    "tool_calls": 3
  }
}
```

### 4. Intelligent Agent Routing

```typescript
import { suggestAgentForQuery } from "@/lib/llamaindex/agents"

const query = "Find the database schema and generate a migration"
const suggestedAgents = suggestAgentForQuery(query)
// → ["researcher", "coder", "data_analyst"]

// Use suggested agents to create targeted workflow
```

## Integration with Existing System

### Option 1: Replace Single Agent with Multi-Agent

```typescript
// Old: lib/llamaindex/agent.ts
const agent = agent({
  name: "SQL Assistant",
  tools: allTools,
  llm
})

// New: lib/llamaindex/agents/multi-agent-coordinator.ts
const coordinator = createMultiAgentCoordinator({
  llm,
  tools: allTools,
  verbose: true
})
```

### Option 2: Add Multi-Agent as Optional Mode

```typescript
// app/api/chat/llamaindex/route.ts
if (chatSettings.useMultiAgent) {
  // Use multi-agent coordinator
  const workflow = createMultiAgentCoordinator({...})
} else {
  // Use single agent (current behavior)
  const workflow = agent({...})
}
```

### Option 3: A2A-Only (External Agents)

Keep current single agent for main chat, expose A2A endpoints for external agents (LangGraph, other services) to call.

## Benefits

### 1. **Specialization**
Each agent is an expert in its domain:
- Research agent knows how to search efficiently
- Code agent knows coding best practices
- Data agent knows SQL optimization

### 2. **Composability**
Agents can be combined in different ways:
- Single agent workflows
- Multi-agent coordination
- A2A cross-system communication

### 3. **Scalability**
- Each agent can run independently
- Horizontal scaling (different servers)
- Load balancing per agent type

### 4. **Maintainability**
- Clear separation of concerns
- Easy to add new agents
- Agent-specific prompts and tools

### 5. **Interoperability**
- A2A protocol enables cross-framework communication
- LangGraph ↔ LlamaIndex
- Any agent can call any agent

## Configuration

### Environment Variables

```bash
# MCP Server for tools
MCP_SERVER_URL=http://localhost:3002

# Default model
DEFAULT_MODEL=gpt-4o

# Enable verbose logging
NODE_ENV=development
```

### Agent Configuration

```typescript
// Enable specific agents
const config: MultiAgentConfig = {
  llm,
  tools,
  enabledAgents: {
    researcher: true,
    coder: true,
    dataAnalyst: false,  // Disable if no DB tools
    imageSpecialist: false  // Disable if no image tools
  }
}
```

## Next Steps

### 1. Add Streaming Support
Currently A2A endpoints return full responses. Add streaming:

```typescript
export async function POST(request: Request) {
  // ... setup ...

  if (a2aRequest.stream) {
    return new Response(streamEvents(workflow, query), {
      headers: { 'Content-Type': 'text/event-stream' }
    })
  }

  // ... non-streaming ...
}
```

### 2. Add Memory Persistence
Save conversation state across A2A calls:

```typescript
const memory = await loadMemory(a2aRequest.thread_id)
const workflow = createMultiAgentCoordinator({
  llm,
  tools,
  memory
})
// ... after run ...
await saveMemory(a2aRequest.thread_id, workflow.state)
```

### 3. Add Authentication
Secure A2A endpoints:

```typescript
const apiKey = request.headers.get('x-api-key')
if (!validateApiKey(apiKey)) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### 4. LangGraph Integration
Create LangGraph agents that use LlamaIndex agents as tools via A2A.

### 5. Agent Marketplace
Allow users to add custom agents to the system dynamically.

## See Also

- [WORKFLOW_ARCHITECTURE.md](./WORKFLOW_ARCHITECTURE.md) - Understanding LlamaIndex Workflow
- [LLAMAINDEX_INTEGRATION.md](./LLAMAINDEX_INTEGRATION.md) - LlamaIndex integration details
- [@llamaindex/workflow Documentation](https://docs.llamaindex.ai/en/stable/module_guides/workflow/)
