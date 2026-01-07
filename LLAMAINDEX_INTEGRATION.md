# LlamaIndex Agent Integration

## Обзор

LlamaIndex агент интегрирован непосредственно в chatbot-ui, устраняя необходимость в отдельном agent-server. Теперь агент запускается прямо в Next.js API route.

## Изменения

### 1. Новый модуль агента (`lib/llamaindex/agent.ts`)

Создан модуль, содержащий логику агента:

- **`createAgent()`** - создаёт LlamaIndex агента с MCP инструментами
- **`runAgentStream()`** - запускает агента в режиме стриминга, возвращая async generator с событиями

**Особенности:**
- Поддержка нескольких MCP серверов одновременно
- Автоматическая очистка ресурсов (cleanup) после завершения
- Поддержка истории чата (chat history)
- Настраиваемые system prompt, model, temperature

### 2. Обновлённый API Route (`app/api/chat/llamaindex/route.ts`)

**Ключевые изменения:**
- Runtime изменён с `"edge"` на `"nodejs"` (требуется для LlamaIndex)
- Удалён fetch к внешнему agent-server
- Прямой вызов `runAgentStream()` из встроенного модуля
- Создание ReadableStream для SSE событий

**Поток данных:**
```
Request → runAgentStream() → AsyncGenerator<Event> → SSE Stream → Frontend
```

### 3. Установленные зависимости

Добавлены в `package.json`:
```json
{
  "@llamaindex/openai": "^0.4.22",
  "@llamaindex/tools": "^0.2.0",
  "@llamaindex/workflow": "^1.1.24",
  "@modelcontextprotocol/sdk": "^1.24.3"
}
```

## Архитектура

### До изменений:
```
chatbot-ui → HTTP Request → agent-server:3001 → LlamaIndex Agent
                ↓
            SSE Response
```

### После изменений:
```
chatbot-ui API Route → LlamaIndex Agent (встроенный)
           ↓
       SSE Response
```

## Преимущества

1. **Упрощённая архитектура** - один сервис вместо двух
2. **Меньше latency** - нет HTTP overhead между сервисами
3. **Проще деплой** - не нужно разворачивать отдельный agent-server
4. **Единая кодовая база** - легче поддерживать и обновлять
5. **Shared resources** - использование одного API ключа, БД соединений и т.д.

## Использование

### API Endpoint

**POST** `/api/chat/llamaindex`

**Request Body:**
```typescript
{
  chatSettings: {
    model: string
    agentModel: string
    temperature: number
    mcpServerIds: string[] // IDs MCP серверов из БД
  },
  messages: Array<{
    role: "system" | "user" | "assistant"
    content: string
  }>,
  messageFileItems?: Array<FileItem>, // RAG контент
  chatFileItems?: Array<FileItem>
}
```

**Response:** Server-Sent Events stream

### Пример событий:

```json
// Tool call
{
  "type": "content_block_start",
  "index": 0,
  "content_block": {
    "type": "tool_use",
    "id": "tool_1704067200000_1",
    "name": "list_schemas",
    "input": { "database": "bookings" }
  }
}

// Text delta
{
  "type": "content_block_delta",
  "index": 1,
  "delta": {
    "type": "text_delta",
    "text": "Нашёл 3 схемы в базе данных..."
  }
}

// Tool completion
{
  "type": "message_delta",
  "delta": {
    "stop_reason": "tool_use"
  }
}
```

## Миграция с agent-server

### Что удалить:

1. **Переменные окружения** (необязательно):
   - `NEXT_PUBLIC_LLAMAINDEX_AGENT_URL`
   - `MCP_SERVER_URL` (в agent-server)

2. **agent-server** (если больше не нужен):
   - Папка `agent-server/` может быть удалена или оставлена как standalone решение

### Что оставить:

- **MCP серверы** - продолжают работать отдельно (например, на порту 3002)
- **База данных** - таблица `mcp_servers` используется для хранения URL серверов

## Консольный вывод

Логирование в стиле Claude Code сохранено:

```
[LlamaIndex] Starting agent with 2 history messages
[LlamaIndex] MCP Server URLs: [ 'http://localhost:3002' ]
[LlamaIndex] Conversation summary:
  1. user: Привет
  2. assistant: Здравствуйте! Чем могу помочь?
Query: Покажи таблицы в базе данных...

[LlamaIndex Agent] Loading MCP tools from http://localhost:3002
[LlamaIndex Agent] Loaded 4 MCP tools from http://localhost:3002
[LlamaIndex Agent] Total tools loaded: 4

[LlamaIndex] 🔧 list_schemas
Request:
{
  "database": "bookings"
}
Response:
{
  "schemas": ["bookings", "pg_toast", "public"]
}
[LlamaIndex] ✓ Tool completed: list_schemas

[LlamaIndex] Agent completed
```

## Конфигурация

### Runtime Requirements

**Important:** API route использует `runtime = "nodejs"` вместо `"edge"` из-за ограничений LlamaIndex SDK.

### Environment Variables

Необходимые переменные:
- `OPENAI_API_KEY` - используется профилем пользователя (profile.openai_api_key)
- `NEXT_PUBLIC_SUPABASE_URL` - для доступа к БД с MCP серверами
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Опциональные:
- `NODE_ENV=development` - включает verbose режим для agent и MCP

## Troubleshooting

### Ошибка: "Cannot use import statement outside a module"

LlamaIndex SDK использует ES modules. Убедитесь что:
- `runtime = "nodejs"` в route.ts
- Зависимости установлены корректно

### Ошибка: "MCP server connection failed"

Проверьте:
- MCP сервер запущен (например, на http://localhost:3002)
- URL в БД таблице `mcp_servers` корректен
- Нет firewall блокировок

### Медленный ответ агента

Причины:
- Первый запуск загружает MCP tools (может занять 2-3 сек)
- Сложные SQL запросы занимают время
- Модель делает несколько tool calls последовательно

Решения:
- Используйте более быстрые модели (gpt-3.5-turbo)
- Оптимизируйте system prompt для меньшего количества tool calls

## Дальнейшие улучшения

- [ ] Кэширование MCP tools между запросами
- [ ] Поддержка parallel tool calls
- [ ] Rate limiting для защиты от злоупотреблений
- [ ] Metrics и monitoring (latency, token usage)
- [ ] Graceful shutdown MCP соединений
