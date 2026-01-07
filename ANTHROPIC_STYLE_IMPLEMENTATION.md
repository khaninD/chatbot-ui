# Anthropic-Style Structured Responses Implementation

## Обзор

Реализован подход к обработке ответов агента в стиле Anthropic API, где tool calls и текстовые ответы передаются как структурированные блоки контента (content blocks) через Server-Sent Events (SSE).

## Что изменилось

### 1. Типы данных (`types/content-blocks.ts`)

Созданы TypeScript типы для структурированных событий:

- `ContentBlock` - базовый тип для блоков контента (text | tool_use)
- `TextContentBlock` - блок текстового контента
- `ToolUseContentBlock` - блок вызова инструмента
- `StreamEvent` - типы событий SSE (content_block_start, content_block_delta, content_block_stop, message_delta, error)

### 2. Backend (`app/api/chat/llamaindex/route.ts`)

**Изменения:**
- `createSSETransformStream()` теперь отправляет структурированные SSE события вместо простого текста
- При `tool_call` отправляется событие `content_block_start` с типом `tool_use`
- При `text_delta` отправляется событие `content_block_delta` с типом `text_delta`
- Content-Type изменён на `text/event-stream`
- Консольный вывод остался в стиле Claude Code (Request/Response)

**Пример события tool_call:**
```json
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
```

### 3. Frontend обработка (`components/chat/chat-helpers/index.ts`)

**Изменения в `processResponse()`:**
- Определение типа ответа по Content-Type заголовку
- Парсинг SSE событий для `text/event-stream`
- Сбор contentBlocks отдельно от текстового контента
- Обновление chatMessages с полем `contentBlocks`

**Логика:**
```typescript
if (isSSE) {
  // Парсим SSE события
  case "content_block_start":
    contentBlocks.push(eventData.content_block)
  case "content_block_delta":
    if (eventData.delta.type === "text_delta") {
      fullText += eventData.delta.text
    }
}
```

### 4. UI компоненты

#### `components/messages/tool-call-block.tsx`
Новый компонент для отображения tool calls:
- Раскрывающийся блок с названием инструмента
- Показывает JSON параметры запроса при раскрытии
- Стилизован в стиле Claude Desktop

#### `components/messages/message.tsx`
Обновлён для поддержки contentBlocks:
- Добавлен проп `contentBlocks?: any[]`
- Рендерит `ToolCallBlock` для блоков типа `tool_use`
- Рендерит `MessageMarkdown` для блоков типа `text`
- Fallback на обычный рендер если contentBlocks отсутствуют

#### `components/chat/chat-messages.tsx`
Передаёт `contentBlocks` в компонент Message:
```tsx
<Message
  contentBlocks={chatMessage.contentBlocks}
  // ... other props
/>
```

### 5. Типы сообщений (`types/chat-message.ts`)

Обновлён интерфейс `ChatMessage`:
```typescript
export interface ChatMessage {
  message: Tables<"messages">
  fileItems: string[]
  contentBlocks?: ContentBlock[] // Новое поле
}
```

### 6. Build Prompt (`lib/build-prompt.ts`)

**Упрощена очистка сообщений:**
- Больше не нужно удалять маркеры инструментов (🔧, ✓) из текста
- Tool calls хранятся отдельно в contentBlocks
- message.content содержит только чистый текст

## Архитектура потока данных

```
LlamaIndex Agent → SSE Events → route.ts Transform → SSE to Frontend
                                      ↓
                          content_block_start (tool_use)
                          content_block_delta (text_delta)
                          content_block_stop
                                      ↓
                          processResponse() parses events
                                      ↓
                          Updates chatMessages with:
                          - content: accumulated text
                          - contentBlocks: [tool_use, text blocks]
                                      ↓
                          Message component renders:
                          - ToolCallBlock for tool_use
                          - MessageMarkdown for text
```

## Преимущества нового подхода

1. **Чистое разделение**: Tool calls и текст хранятся отдельно
2. **Как в Claude Desktop**: UI отображает инструменты в раскрывающихся блоках
3. **Детальная отладка**: В консоли Request/Response для каждого инструмента
4. **Масштабируемость**: Легко добавить новые типы блоков (images, files)
5. **Экономия токенов**: message.content содержит только текст, без маркеров

## Обратная совместимость

Код поддерживает оба подхода:
- SSE (Anthropic-style) для llamaindex
- Обычный текстовый стриминг для других провайдеров (OpenAI, Ollama)

Проверка в `processResponse()`:
```typescript
const isSSE = contentType.includes("text/event-stream")
```

## Консольный вывод (Claude Code style)

Остался прежним для удобства отладки:

```
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
```

## Дальнейшие улучшения

- [ ] Добавить хранение contentBlocks в базу данных (сейчас только в runtime)
- [ ] Добавить отображение результатов tool calls (tool_result blocks)
- [ ] Поддержка изображений как content blocks
- [ ] Анимация появления tool blocks в реальном времени
