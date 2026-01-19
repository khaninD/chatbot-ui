# Quick Start: Multi-Agent System with A2A

## What Was Built

We created a **multi-agent system** with **A2A (Agent-to-Agent) protocol** support:

### ✅ Specialized Agents
- **Research Agent** - Searches, reads files, gathers info
- **Code Agent** - Writes, edits, executes code
- **Data Agent** - SQL queries, data analysis
- **Image Agent** - Generates and edits images

### ✅ Multi-Agent Coordinator
- Orchestrates multiple agents working together
- Automatic task delegation
- Agent-to-agent handoffs

### ✅ A2A Endpoints
- `/api/agents/research` - Research agent endpoint
- `/api/agents/code` - Code agent endpoint
- `/api/agents/main` - Main coordinator endpoint

## Quick Test

### 1. Test A2A Endpoint (Manual)

```bash
# Test research agent via A2A
curl -X POST http://localhost:3000/api/agents/research \
  -H "Content-Type: application/json" \
  -d '{
    "thread_id": "test-123",
    "messages": [
      {"role": "user", "content": "Find all TypeScript files in the project"}
    ]
  }'

# Expected response:
{
  "type": "message",
  "content": "I found X TypeScript files...",
  "thread_id": "test-123",
  "metadata": {
    "agent": "researcher",
    "model": "gpt-4o"
  }
}
```

### 2. Use Multi-Agent Coordinator

```typescript
// In your code
import { createMultiAgentCoordinator } from "@/lib/llamaindex/agents"
import { openai } from "@llamaindex/openai"

const coordinator = createMultiAgentCoordinator({
  llm: openai({ model: "gpt-4o", apiKey: process.env.OPENAI_API_KEY }),
  tools: allTools,
  verbose: true
})

// Coordinator automatically delegates to specialized agents
const result = await coordinator.run(
  "Find the user authentication code and add email validation"
)

// Result will show:
// - Research agent found the auth code
// - Code agent added email validation
```

### 3. Test Agent Handoffs

```bash
# Multi-agent request that requires multiple agents
curl -X POST http://localhost:3000/api/agents/main \
  -H "Content-Type: application/json" \
  -d '{
    "thread_id": "test-456",
    "messages": [
      {"role": "user", "content": "Find the database schema and create a migration for adding a new users table"}
    ]
  }'

# Expected flow:
# 1. Research agent finds schema files
# 2. Code agent creates migration file
# 3. Combined result returned
```

## Integration Options

### Option 1: Replace Single Agent (Full Migration)

```typescript
// lib/llamaindex/agent.ts
// OLD:
const sqlAgent = agent({
  name: "SQL Assistant",
  tools: allTools,
  llm
})

// NEW:
import { createMultiAgentCoordinator } from "./agents"

const coordinator = createMultiAgentCoordinator({
  llm,
  tools: allTools,
  verbose: true
})
```

### Option 2: Add as Optional Mode (Recommended)

```typescript
// app/api/chat/llamaindex/route.ts
import { createMultiAgentCoordinator } from "@/lib/llamaindex/agents"

// In POST handler:
let workflow
if (chatSettings.useMultiAgent) {
  workflow = createMultiAgentCoordinator({
    llm,
    tools: allTools
  })
} else {
  workflow = agent({ /* current single agent */ })
}

const result = await workflow.run(query)
```

### Option 3: A2A Only (No Changes to Main Chat)

Keep current single agent for main chat UI.
Use A2A endpoints for:
- External systems calling your agents
- LangGraph agents using LlamaIndex agents as tools
- Agent-to-agent coordination across services

## Environment Variables

```bash
# Required for agents
OPENAI_API_KEY=sk-...
# OR
COMET_API_KEY=...

# Optional: MCP server for tools
MCP_SERVER_URL=http://localhost:3002

# Enable verbose logging
NODE_ENV=development
```

## Testing Checklist

- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] Dev server starts (`npm run dev`)
- [ ] A2A endpoints are accessible (`/api/agents/research`, `/api/agents/code`, `/api/agents/main`)
- [ ] Can make test A2A request via curl
- [ ] Multi-agent coordinator delegates correctly
- [ ] Agent handoffs work (research → code)

## Architecture Summary

```
lib/llamaindex/agents/
├── specialized-agents.ts       # 4 specialized agents
├── multi-agent-coordinator.ts  # Orchestration logic
├── a2a-types.ts               # A2A protocol types
└── index.ts                   # Exports

app/api/agents/
├── research/route.ts          # Research agent A2A endpoint
├── code/route.ts             # Code agent A2A endpoint
└── main/route.ts             # Coordinator A2A endpoint
```

## Next Steps

1. **Add to UI** - Create toggle for single vs multi-agent mode
2. **Add Streaming** - Implement SSE streaming for A2A endpoints
3. **Add Memory** - Persist conversation state per thread_id
4. **LangGraph Integration** - Create LangGraph agents that call these A2A endpoints
5. **Monitoring** - Add metrics for agent performance

## Documentation

- [MULTI_AGENT_A2A.md](./MULTI_AGENT_A2A.md) - Full documentation
- [WORKFLOW_ARCHITECTURE.md](./WORKFLOW_ARCHITECTURE.md) - Workflow architecture details
- [LLAMAINDEX_INTEGRATION.md](./LLAMAINDEX_INTEGRATION.md) - LlamaIndex integration

## Troubleshooting

### "Cannot find module '@/lib/llamaindex/agents'"

Run type-check to ensure no TypeScript errors:
```bash
npm run type-check
```

### "MCP tools not loading"

Set MCP_SERVER_URL environment variable:
```bash
export MCP_SERVER_URL=http://localhost:3002
```

### "API key not found"

Ensure OPENAI_API_KEY or COMET_API_KEY is set:
```bash
export OPENAI_API_KEY=sk-...
```

### Agent not delegating

Enable verbose logging to see delegation:
```bash
NODE_ENV=development npm run dev
```

Check logs for:
```
[Multi-Agent] Creating coordinator with agents:
  - researcher: Expert in research tasks
  - coder: Expert in writing code
  ...
```

## Example Use Cases

### 1. Complex Refactoring
```
User: "Find all API routes and add rate limiting"

Flow:
1. Research Agent → Finds all API routes
2. Code Agent → Adds rate limiting to each route
3. Code Agent → Runs tests
```

### 2. Data-Driven Feature
```
User: "Show me top users by activity and generate a dashboard component"

Flow:
1. Data Agent → Queries database for top users
2. Code Agent → Creates React dashboard component
3. Code Agent → Integrates data into component
```

### 3. Documentation Search + Implementation
```
User: "How does authentication work? Then add 2FA support"

Flow:
1. Research Agent → Finds and explains auth code
2. Code Agent → Implements 2FA based on findings
```

## Success Criteria

✅ All TypeScript compiles
✅ All A2A endpoints respond correctly
✅ Multi-agent coordinator delegates tasks
✅ Agents can handoff to each other
✅ Ready for LangGraph integration

---

**Status: Ready for Testing & Integration** 🚀
