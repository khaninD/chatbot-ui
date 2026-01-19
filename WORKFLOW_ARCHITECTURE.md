# Workflow Architecture - Current State

## Важное открытие ✅

**Текущая реализация УЖЕ использует Workflow архитектуру!**

Функция `agent()` из `@llamaindex/workflow` — это **не простой helper**, а полноценная Workflow система. Под капотом она создает `AgentWorkflow` класс с event-driven архитектурой.

## Что такое `agent()` helper на самом деле

```typescript
// lib/llamaindex/agent.ts:144
const sqlAgent = agent({
  name: "SQL Assistant",
  systemPrompt: finalSystemPrompt,
  tools: allTools as Parameters<typeof agent>[0]["tools"],
  llm,
  verbose: process.env.NODE_ENV === "development"
})
```

### Что происходит под капотом:

1. **`agent()` создает `AgentWorkflow` класс**
   ```typescript
   // @llamaindex/workflow/dist/index.d.ts:181
   declare const agent: (params: SingleAgentParams) => AgentWorkflow;
   ```

2. **`AgentWorkflow` implements `Workflow` interface**
   ```typescript
   // @llamaindex/workflow/dist/index.d.ts:189
   declare class AgentWorkflow implements Workflow {
     private stateful;
     private workflow;
     private agents;
     //...
   }
   ```

3. **Workflow использует event-driven steps**:
   - `agentInputEvent` - начальный вход
   - `agentToolCallEvent` - вызов инструмента
   - `agentToolCallResultEvent` - результат инструмента
   - `agentStreamEvent` - стриминг текста
   - `agentOutputEvent` - финальный выход
   - `stopAgentEvent` - завершение

## Архитектура текущего агента

### Execution Flow (уже реализовано)

```
User Query
    ↓
[Start Event]
    ↓
[Setup Agent Step]
    - Load tools (MCP + custom)
    - Initialize memory
    - Set system prompt
    ↓
[Run Agent Step]
    - LLM decides: use tools OR respond
    ↓
    ├─→ [Parse Output: Tool Calls]
    │       ↓
    │   [Execute Tool Calls]
    │       - Run each tool
    │       - Emit agentToolCallEvent
    │       - Emit agentToolCallResultEvent
    │       ↓
    │   [Process Tool Results]
    │       - Add results to memory
    │       - Continue to Run Agent Step (loop)
    │
    └─→ [Parse Output: Final Response]
            - Emit agentStreamEvent (text tokens)
            ↓
        [Stop Event]
```

### Built-in Events

```typescript
// Встроенные события в @llamaindex/workflow:

agentToolCallEvent: WorkflowEvent<{
  agentName: string
  toolName: string
  toolKwargs: Record<string, JSONValue>
  toolId: string
}>

agentToolCallResultEvent: WorkflowEvent<{
  toolName: string
  toolOutput: ToolResult
  returnDirect: boolean
}>

agentStreamEvent: WorkflowEvent<{
  delta: string
  response: string
  currentAgentName: string
}>

agentOutputEvent: WorkflowEvent<{
  response: ChatMessage
  toolCalls: AgentToolCall[]
}>
```

### State Management

`AgentWorkflow` уже имеет встроенный state management:

```typescript
type AgentWorkflowState = {
  memory: Memory              // Conversation history
  scratchpad: ChatMessage[]   // Temporary working memory
  agents: string[]            // Available agents
  currentAgentName: string    // Active agent
  nextAgentName?: string      // For handoffs
  responseFormat?: ZodSchema  // Structured output
}
```

## Как это используется сейчас

### 1. Создание агента

```typescript
// lib/llamaindex/agent.ts:20
export async function createAgent(
  customSystemPrompt?: string,
  apiKey?: string,
  model?: string,
  toolUrls?: string[],
  temperature?: number,
  useCometAPI?: boolean,
  enableImageGeneration?: boolean,
  userId?: string,
  enableImageEditTool?: boolean,
  imageModel?: string
): Promise<{
  agent: ReturnType<typeof agent>  // Returns AgentWorkflow
  servers: Array<{ cleanup: () => Promise<void> }>
}>
```

### 2. Streaming events

```typescript
// lib/llamaindex/agent.ts:171
export async function* runAgentStream(...) {
  // Создаем AgentWorkflow
  const { agent: sqlAgent, servers } = await createAgent(...)

  // Получаем stream events
  const events = sqlAgent.runStream(finalQuery, {
    chatHistory: formattedHistory
  })

  // Обрабатываем встроенные workflow события
  for await (const event of events as any) {
    if (agentToolCallEvent.include(event)) {
      yield { type: "tool_call", data: {...} }
    }
    if (agentToolCallResultEvent.include(event)) {
      yield { type: "tool_result", data: {...} }
    }
    if (agentStreamEvent.include(event)) {
      yield { type: "text_delta", data: {...} }
    }
  }
}
```

### 3. API Route использует workflow stream

```typescript
// app/api/chat/llamaindex/route.ts:259
const events = runAgentStream(
  userQuery,
  systemPrompt,
  apiKeyToUse,
  chatSettings.agentModel,
  mcpUrls,
  temperature,
  conversationMessages,
  //...
)

for await (const event of events) {
  switch (event.type) {
    case "tool_call":
      // Workflow emitted agentToolCallEvent
      sendSSE({ type: "content_block_start", ... })
      break
    case "tool_result":
      // Workflow emitted agentToolCallResultEvent
      sendSSE({ type: "content_block_start", ... })
      break
    case "text_delta":
      // Workflow emitted agentStreamEvent
      sendSSE({ type: "content_block_delta", ... })
      break
  }
}
```

## Преимущества текущей архитектуры

### ✅ Уже есть все benefits Workflow:

1. **Event-driven** - Все коммуникации через события
2. **State management** - Memory + scratchpad
3. **Streaming** - Нативная поддержка через `agentStreamEvent`
4. **Tool execution** - Автоматический loop с tool calls
5. **Verbose logging** - Встроенное логирование steps
6. **Composable** - Можно добавлять агенты через `canHandoffTo`

### ✅ Multi-agent готовность:

```typescript
// Можно создать multi-agent workflow
import { multiAgent } from "@llamaindex/workflow"

const workflow = multiAgent({
  agents: [
    researchAgent,  // Специализированный агент для исследований
    codeAgent,      // Специализированный агент для кода
    dataAgent       // Специализированный агент для данных
  ],
  rootAgent: researchAgent,
  memory: sharedMemory
})
```

### ✅ A2A готовность:

Каждый `AgentWorkflow` можно экспонировать как A2A endpoint:

```typescript
// app/api/agents/research/route.ts
export async function POST(req: Request) {
  const { thread_id, messages } = await req.json()

  const researchAgent = agent({
    name: "Research Agent",
    systemPrompt: "Expert in research tasks",
    tools: mcpTools,
    llm: openai({ model: "gpt-4o" })
  })

  const result = await researchAgent.run(
    messages[messages.length - 1].content,
    { chatHistory: messages.slice(0, -1) }
  )

  return Response.json({
    type: "message",
    content: result.data.result,
    thread_id,
    metadata: { agent: "research" }
  })
}
```

## Что дальше? Следующие шаги для улучшения

### 1. Добавить Multi-Agent координацию

Вместо одного агента, создать несколько специализированных:

```typescript
// lib/llamaindex/multi-agent.ts
import { multiAgent, FunctionAgent } from "@llamaindex/workflow"

export function createMultiAgentWorkflow(llm, mcpTools) {
  const researchAgent = new FunctionAgent({
    name: "researcher",
    description: "Searches documentation and web sources",
    systemPrompt: "You are a research specialist",
    tools: mcpTools.filter(t => t.name.includes("search")),
    llm
  })

  const codeAgent = new FunctionAgent({
    name: "coder",
    description: "Writes and refactors code",
    systemPrompt: "You are a code specialist",
    tools: mcpTools.filter(t => t.name.includes("write")),
    llm,
    canHandoffTo: ["researcher"] // Может делегировать researcher'у
  })

  return multiAgent({
    agents: [researchAgent, codeAgent],
    rootAgent: codeAgent,
    verbose: true
  })
}
```

### 2. Добавить A2A Endpoints

Создать отдельные API routes для каждого агента:

```
app/api/agents/
├── main/route.ts          # Главный координирующий агент
├── research/route.ts      # Исследовательский агент
├── code/route.ts          # Кодогенерирующий агент
└── data/route.ts          # Аналитический агент
```

Каждый endpoint будет A2A-совместимым:
- Принимает `thread_id` и `messages`
- Возвращает A2A-формат ответа
- Поддерживает streaming

### 3. Добавить Custom Workflow Steps

Можно создать кастомные steps через `workflow.handle()`:

```typescript
import { Workflow, WorkflowContext, workflowEvent } from "@llamaindex/workflow"

const CustomEvent = workflowEvent<{ data: string }>({
  debugLabel: "CustomEvent"
})

const workflow = agent({...})

// Добавить кастомный handler
workflow.handle([CustomEvent], async (ctx: WorkflowContext, ev) => {
  // Custom logic
  console.log("Custom step:", ev.data)

  // Emit next event
  return someOtherEvent.with({ ... })
})
```

### 4. Интеграция с LangGraph через A2A

```typescript
// LangGraph агент может вызывать LlamaIndex агент через A2A:
const llamaIndexTool = {
  name: "llamaindex_agent",
  description: "Call LlamaIndex agent for complex tasks",
  execute: async (query: string) => {
    const response = await fetch('/api/agents/main', {
      method: 'POST',
      body: JSON.stringify({
        thread_id: currentThread,
        messages: [{ role: 'user', content: query }]
      })
    })
    return response.json()
  }
}
```

## Сравнение: До vs После понимания

| Аспект | Что думали | Реальность |
|--------|------------|------------|
| Архитектура | "Simple helper" | ✅ Full Workflow system |
| Events | Нет | ✅ Event-driven из коробки |
| State | Скрытый | ✅ Явный AgentWorkflowState |
| Tool execution | Автоматический | ✅ Event loop с agentToolCallEvent |
| Streaming | Кастомный | ✅ Нативный через agentStreamEvent |
| Multi-agent | Невозможно | ✅ Встроенная поддержка |
| A2A ready | Нет | ✅ Полностью готово |

## Выводы

**Не нужно переписывать на Workflow — мы УЖЕ используем Workflow!**

Текущая архитектура:
- ✅ Полностью event-driven
- ✅ Имеет state management
- ✅ Поддерживает streaming
- ✅ Готова к multi-agent
- ✅ Готова к A2A интеграции

**Следующие шаги:**
1. Создать специализированных агентов (research, code, data)
2. Использовать `multiAgent()` для координации
3. Добавить A2A endpoints
4. Интегрировать с LangGraph через A2A

**Не нужно:**
- ❌ Переписывать на кастомный Workflow
- ❌ Создавать собственные events
- ❌ Реимплементировать state management

## See Also

- [@llamaindex/workflow Documentation](https://docs.llamaindex.ai/en/stable/module_guides/workflow/)
- [LLAMAINDEX_INTEGRATION.md](./LLAMAINDEX_INTEGRATION.md) - LlamaIndex integration docs
- [ANTHROPIC_STYLE_IMPLEMENTATION.md](./ANTHROPIC_STYLE_IMPLEMENTATION.md) - Structured content blocks
