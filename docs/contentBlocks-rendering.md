# 🎨 Рендеринг contentBlocks - Подробное руководство

## 📋 Оглавление
1. [Обзор системы](#обзор-системы)
2. [Типы данных](#типы-данных)
3. [Поток SSE событий](#поток-sse-событий)
4. [Парсинг событий](#парсинг-событий)
5. [Рендеринг компонентов](#рендеринг-компонентов)
6. [Примеры данных](#примеры-данных)

---

## 🎯 Обзор системы

**ContentBlocks** - это структурированный способ представления контента в стиле Anthropic Claude API, который позволяет отображать не только текст, но и вызовы инструментов (tool calls) в удобном формате.

### Архитектура потока данных

```
Backend API (LlamaIndex)
    ↓ SSE Stream
Frontend processResponse()
    ↓ Parse & Accumulate
React State (contentBlocks[])
    ↓ Props
Message Component
    ↓ Render
ToolCallBlock / MessageMarkdown
```

---

## 📦 Типы данных

### Основные типы (types/content-blocks.ts)

```typescript
// Два основных типа контент-блоков
export type ContentBlockType = "text" | "tool_use"

// Текстовый блок
export interface TextContentBlock {
  type: "text"
  text: string
}

// Блок вызова инструмента
export interface ToolUseContentBlock {
  type: "tool_use"
  id: string                        // Уникальный ID (например: "tool_1736257689_1")
  name: string                      // Имя инструмента (например: "list_tables")
  input: Record<string, any>        // Параметры вызова (JSON)
}

// Union type
export type ContentBlock = TextContentBlock | ToolUseContentBlock
```

### SSE Event Types (Server-Sent Events)

```typescript
// События стриминга от бэкенда
export type StreamEventType =
  | "content_block_start"   // Начало нового блока (tool_use или text)
  | "content_block_delta"   // Обновление блока (добавление текста)
  | "content_block_stop"    // Конец блока
  | "message_delta"         // Обновление сообщения
  | "error"                 // Ошибка

// Событие начала блока
export interface ContentBlockStartEvent {
  type: "content_block_start"
  index: number
  content_block: ContentBlock    // Полный блок tool_use или text
}

// Событие дельты (добавление текста)
export interface ContentBlockDeltaEvent {
  type: "content_block_delta"
  index: number
  delta: TextDelta | ToolInputDelta
}

// Текстовая дельта
export interface TextDelta {
  type: "text_delta"
  text: string                    // Часть текста для добавления
}

// Дельта JSON input для tool_use
export interface ToolInputDelta {
  type: "input_json_delta"
  partial_json: string            // Частичный JSON (пока не используется)
}

// Событие завершения блока
export interface ContentBlockStopEvent {
  type: "content_block_stop"
  index: number
}

// Событие обновления сообщения
export interface MessageDeltaEvent {
  type: "message_delta"
  delta: {
    stop_reason?: "end_turn" | "tool_use" | "max_tokens"
  }
}
```

---

## 🌊 Поток SSE событий

### Пример последовательности событий

```
Agent начинает работу
    ↓
[1] content_block_start (tool_use: list_tables)
    {
      type: "content_block_start",
      index: 0,
      content_block: {
        type: "tool_use",
        id: "tool_1736257689_1",
        name: "list_tables",
        input: { output_format: "simple" }
      }
    }
    ↓
[2] content_block_stop
    {
      type: "content_block_stop",
      index: 0
    }
    ↓
[3] message_delta (tool_use completed)
    {
      type: "message_delta",
      delta: { stop_reason: "tool_use" }
    }
    ↓
[4] content_block_start (tool_use: execute_sql)
    {
      type: "content_block_start",
      index: 1,
      content_block: {
        type: "tool_use",
        id: "tool_1736257689_2",
        name: "execute_sql",
        input: { sql: "SELECT ... FROM bookings" }
      }
    }
    ↓
[5] content_block_stop
    {
      type: "content_block_stop",
      index: 1
    }
    ↓
[6] message_delta (tool_use completed)
    {
      type: "message_delta",
      delta: { stop_reason: "tool_use" }
    }
    ↓
[7..N] content_block_delta (text chunks)
    {
      type: "content_block_delta",
      index: 2,
      delta: {
        type: "text_delta",
        text: "Вот топ-5 "
      }
    }
    {
      type: "content_block_delta",
      index: 2,
      delta: {
        type: "text_delta",
        text: "популярных рейсов..."
      }
    }
    ↓
Agent завершает работу
```

---

## 🔧 Парсинг событий

### Backend: API Route (app/api/chat/llamaindex/route.ts)

```typescript
// Создание SSE stream
const stream = new ReadableStream({
  async start(controller) {
    const sendSSE = (event: Record<string, unknown>) => {
      const sseData = `data: ${JSON.stringify(event)}\n\n`
      controller.enqueue(encoder.encode(sseData))
    }

    // Получаем события от агента
    for await (const event of runAgentStream(...)) {
      switch (event.type) {
        case "tool_call": {
          // Отправляем событие начала tool_use блока
          sendSSE({
            type: "content_block_start",
            index: contentBlockIndex++,
            content_block: {
              type: "tool_use",
              id: `tool_${Date.now()}_${contentBlockIndex}`,
              name: event.data.toolName,
              input: event.data.toolInput
            }
          })

          // Сразу закрываем блок (tool_use - это единый объект)
          sendSSE({
            type: "content_block_stop",
            index: contentBlockIndex - 1
          })
          break
        }

        case "text_delta": {
          // Отправляем дельту текста
          sendSSE({
            type: "content_block_delta",
            index: contentBlockIndex,
            delta: {
              type: "text_delta",
              text: event.data.delta
            }
          })
          break
        }

        case "tool_result": {
          // Инструмент завершил работу
          sendSSE({
            type: "message_delta",
            delta: { stop_reason: "tool_use" }
          })
          break
        }
      }
    }
  }
})

return new Response(stream, {
  headers: {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  }
})
```

### Frontend: processResponse (components/chat/chat-helpers/index.ts)

```typescript
export const processResponse = async (
  response: Response,
  lastChatMessage: ChatMessage,
  ...
) => {
  let fullText = ""
  let contentBlocks: any[] = []

  // Проверяем, что это SSE stream
  const contentType = response.headers.get("Content-Type") || ""
  const isSSE = contentType.includes("text/event-stream")

  await consumeReadableStream(
    response.body,
    chunk => {
      if (isSSE) {
        // Парсим SSE события
        const lines = chunk.split("\n")
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const eventData = JSON.parse(line.slice(6))

            switch (eventData.type) {
              case "content_block_start":
                // Новый блок начался (tool_use или text)
                console.log("[SSE] content_block_start:", eventData.content_block)
                contentBlocks.push(eventData.content_block)

                if (eventData.content_block.type === "tool_use") {
                  setToolInUse(eventData.content_block.name)
                }
                break

              case "content_block_delta":
                // Дельта контента (обычно текст)
                if (eventData.delta.type === "text_delta") {
                  const textToAdd = eventData.delta.text
                  fullText += textToAdd
                }
                break

              case "content_block_stop":
                // Блок закончился
                setToolInUse("none")
                break

              case "message_delta":
                // Сообщение обновилось
                if (eventData.delta.stop_reason === "tool_use") {
                  setToolInUse("none")
                }
                break

              case "error":
                console.error("[SSE] Error:", eventData.error)
                throw new Error(eventData.error)
            }
          }
        }
      }

      // Обновляем UI в реальном времени
      setChatMessages(prev =>
        prev.map(chatMessage => {
          if (chatMessage.message.id === lastChatMessage.message.id) {
            return {
              ...chatMessage,
              message: { ...chatMessage.message, content: fullText },
              contentBlocks: contentBlocks.length > 0 ? contentBlocks : undefined
            }
          }
          return chatMessage
        })
      )
    }
  )

  return { text: fullText, contentBlocks }
}
```

### Состояние contentBlocks во время стриминга

```typescript
// После первого tool_call события
contentBlocks = [
  {
    type: "tool_use",
    id: "tool_1736257689_1",
    name: "list_tables",
    input: { output_format: "simple" }
  }
]

// После второго tool_call события
contentBlocks = [
  {
    type: "tool_use",
    id: "tool_1736257689_1",
    name: "list_tables",
    input: { output_format: "simple" }
  },
  {
    type: "tool_use",
    id: "tool_1736257689_2",
    name: "execute_sql",
    input: { sql: "SELECT flight_id, COUNT(*) AS booking_count..." }
  }
]

// fullText накапливается из text_delta событий
fullText = "Вот топ-5 популярных рейсов по количеству бронирования..."
```

---

## 🎨 Рендеринг компонентов

### Иерархия компонентов

```
Message
  ├── Avatar & Header
  ├── Content Rendering:
  │   │
  │   ├─ if (contentBlocks && contentBlocks.length > 0)
  │   │   └─ contentBlocks.map(block =>
  │   │       ├─ if (block.type === "tool_use")
  │   │       │   └─ <ToolCallBlock toolBlock={block} />
  │   │       │
  │   │       └─ if (block.type === "text")
  │   │           └─ <MessageMarkdown content={block.text} />
  │   │      )
  │   │
  │   └─ else
  │       └─ <MessageMarkdown content={message.content} />
  │
  └── File Items / Sources
```

### Message Component (components/messages/message.tsx)

```typescript
export const Message: FC<MessageProps> = ({
  message,
  fileItems,
  contentBlocks,  // ← Получаем от ChatMessages
  ...
}) => {
  return (
    <div className="message-container">
      {/* Avatar, model name, timestamp... */}

      <div className="message-content">
        {isEditing ? (
          <TextareaAutosize ... />
        ) : (
          <>
            {/* КЛЮЧЕВАЯ ЛОГИКА РЕНДЕРИНГА */}
            {contentBlocks && contentBlocks.length > 0 ? (
              <div className="space-y-2">
                {contentBlocks.map((block, index) => {
                  if (block.type === "tool_use") {
                    return <ToolCallBlock key={index} toolBlock={block} />
                  } else if (block.type === "text") {
                    return <MessageMarkdown key={index} content={block.text} />
                  }
                  return null
                })}

                {/* Также рендерим накопленный текст из message.content */}
                {message.content && (
                  <MessageMarkdown content={message.content} />
                )}
              </div>
            ) : (
              // Обычный режим (без contentBlocks)
              <MessageMarkdown content={message.content} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

### ToolCallBlock Component (components/messages/tool-call-block.tsx)

```typescript
export const ToolCallBlock: FC<ToolCallBlockProps> = ({ toolBlock }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="my-2 rounded-lg border border-primary bg-secondary p-3">
      {/* Заголовок (кликабельный) */}
      <div
        className="flex cursor-pointer items-center justify-between hover:opacity-70"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <IconTool size={18} className="text-primary" />
          <span className="font-semibold">{toolBlock.name}</span>
        </div>
        {isExpanded ? (
          <IconChevronDown size={18} />
        ) : (
          <IconChevronRight size={18} />
        )}
      </div>

      {/* Развернутый контент (JSON input) */}
      {isExpanded && (
        <div className="mt-3 space-y-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-muted-foreground">
              Input:
            </div>
            <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">
              <code>{JSON.stringify(toolBlock.input, null, 2)}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Визуальный результат:**

```
┌─────────────────────────────────────────────┐
│ 🔧 list_tables                         [>] │  ← Collapsed (по умолчанию)
└─────────────────────────────────────────────┘

После клика:

┌─────────────────────────────────────────────┐
│ 🔧 list_tables                         [v] │  ← Expanded
├─────────────────────────────────────────────┤
│ Input:                                      │
│ {                                           │
│   "output_format": "simple"                 │
│ }                                           │
└─────────────────────────────────────────────┘
```

### MessageMarkdown Component (components/messages/message-markdown.tsx)

```typescript
export const MessageMarkdown: FC<MessageMarkdownProps> = ({ content }) => {
  return (
    <MessageMarkdownMemoized
      className="prose min-w-full space-y-6 break-words dark:prose-invert"
      remarkPlugins={[remarkGfm, remarkMath]}
      components={{
        // Кастомизация рендеринга Markdown элементов
        p({ children }) {
          return <p className="mb-2 last:mb-0">{children}</p>
        },
        code({ node, className, children, ...props }) {
          // Специальная обработка code blocks
          // Поддержка подсветки синтаксиса через MessageCodeBlock
          const match = /language-(\w+)/.exec(className || "")

          if (match && hasNewlines(children)) {
            return (
              <MessageCodeBlock
                language={match[1]}
                value={String(children)}
              />
            )
          }

          return <code className={className}>{children}</code>
        }
      }}
    >
      {content}
    </MessageMarkdownMemoized>
  )
}
```

---

## 📊 Примеры данных

### Пример 1: Сообщение с двумя tool calls

**contentBlocks массив:**
```typescript
[
  {
    type: "tool_use",
    id: "tool_1736257689_1",
    name: "list_tables",
    input: {
      output_format: "simple"
    }
  },
  {
    type: "tool_use",
    id: "tool_1736257689_2",
    name: "execute_sql",
    input: {
      sql: "SELECT flight_id, COUNT(*) AS booking_count FROM bookings.ticket_flights GROUP BY flight_id ORDER BY booking_count DESC LIMIT 5"
    }
  }
]
```

**message.content:**
```
"Вот топ-5 популярных рейсов по количеству бронирования (минимальное количество проданных посадочных талонов):\n\n1. Рейс с ID 9819 - 374 бронирования\n2. Рейс с ID 260 - 370 бронирований\n3. Рейс с ID 249 - 365 бронирований\n4. Рейс с ID 305 - 365 бронирований\n5. Рейс с ID 250 - 361 бронирование"
```

**Рендеринг:**
```html
<div class="space-y-2">
  <!-- Блок 1: list_tables -->
  <div class="tool-call-block">
    <div class="header">🔧 list_tables [>]</div>
  </div>

  <!-- Блок 2: execute_sql -->
  <div class="tool-call-block">
    <div class="header">🔧 execute_sql [>]</div>
  </div>

  <!-- Текстовый ответ -->
  <div class="markdown">
    <p>Вот топ-5 популярных рейсов по количеству бронирования:</p>
    <ol>
      <li>Рейс с ID 9819 - 374 бронирования</li>
      <li>Рейс с ID 260 - 370 бронирований</li>
      <li>...</li>
    </ol>
  </div>
</div>
```

### Пример 2: Сообщение без tool calls (обычный текст)

**contentBlocks:** `undefined` или `[]`

**message.content:**
```
"Здравствуйте! Чем могу помочь?"
```

**Рендеринг:**
```html
<div class="markdown">
  <p>Здравствуйте! Чем могу помочь?</p>
</div>
```

### Пример 3: Смешанный контент (text blocks + tool_use)

**Примечание:** В текущей реализации text blocks отдельно не создаются, текст накапливается в `message.content`. Но если бы были отдельные text blocks:

```typescript
contentBlocks = [
  {
    type: "text",
    text: "Сейчас проверю базу данных..."
  },
  {
    type: "tool_use",
    id: "tool_123",
    name: "query_database",
    input: { query: "SELECT * FROM users" }
  },
  {
    type: "text",
    text: "Вот результаты:"
  }
]
```

**Рендеринг:**
```html
<div class="space-y-2">
  <div class="markdown">
    <p>Сейчас проверю базу данных...</p>
  </div>

  <div class="tool-call-block">
    🔧 query_database
  </div>

  <div class="markdown">
    <p>Вот результаты:</p>
  </div>
</div>
```

---

## 🔍 Debug и отладка

### Console.log точки

```typescript
// 1. При получении content_block_start
console.log("[SSE] content_block_start:", eventData.content_block)
// Проверяем, что блоки приходят с бэкенда

// 2. При обновлении сообщения
console.log("[processResponse] Updating message with contentBlocks:", contentBlocks.length)
// Проверяем, что блоки добавляются в массив

// 3. При сохранении в БД
console.log("[handleCreateMessages] contentBlocks:",
  contentBlocks ? `Found ${contentBlocks.length} blocks` : "None"
)
// Проверяем, что блоки передаются в функцию сохранения
```

### DevTools инспекция

**В браузере можно проверить:**

1. **Network Tab → llamaindex → Response:**
   ```
   data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use",...}}

   data: {"type":"content_block_stop","index":0}

   data: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"Вот"}}
   ```

2. **React DevTools → ChatbotUIContext → chatMessages:**
   ```json
   [
     {
       "message": { "id": "...", "content": "..." },
       "contentBlocks": [
         { "type": "tool_use", "name": "list_tables", ... }
       ]
     }
   ]
   ```

3. **Elements Tab → Inspect rendered ToolCallBlock:**
   ```html
   <div class="my-2 rounded-lg border border-primary bg-secondary p-3">
     <div class="flex cursor-pointer items-center">
       <svg><!-- IconTool --></svg>
       <span class="font-semibold">list_tables</span>
     </div>
   </div>
   ```

---

## 🚀 Оптимизации и улучшения

### Текущая реализация
- ✅ Показывает tool calls в collapsed виде
- ✅ При клике разворачивает JSON input
- ✅ Сохраняет в БД в поле `content_blocks` (jsonb)
- ✅ Восстанавливает при загрузке из БД

### Возможные улучшения
- 🔄 **Tool results:** Добавить отображение результатов выполнения инструментов
- 🎨 **Стилизация:** Разные цвета для разных типов инструментов
- 📊 **Статистика:** Показывать время выполнения tool call
- 🔗 **Ссылки:** Кликабельные ссылки на таблицы/объекты в БД
- 📋 **Copy button:** Быстрое копирование input/output
- 🎯 **Фильтрация:** Скрыть/показать все tool blocks одной кнопкой

---

## 📝 Итоги

### Ключевые моменты
1. **SSE Stream** от бэкенда отправляет структурированные события
2. **processResponse()** парсит события и накапливает contentBlocks
3. **contentBlocks** сохраняются в БД как jsonb и в React state
4. **Message** компонент рендерит blocks через map()
5. **ToolCallBlock** - collapsible компонент для отображения tool calls
6. **MessageMarkdown** - рендерит Markdown текст с подсветкой кода

### Поток данных (кратко)
```
Backend Event → SSE Stream → processResponse() → contentBlocks[]
→ React State → Message Component → ToolCallBlock/MessageMarkdown
```

### Файлы для изучения
- `types/content-blocks.ts` - TypeScript типы
- `app/api/chat/llamaindex/route.ts` - Backend SSE stream
- `components/chat/chat-helpers/index.ts` - Парсинг SSE (processResponse)
- `components/messages/message.tsx` - Логика рендеринга
- `components/messages/tool-call-block.tsx` - UI для tool calls
- `components/messages/message-markdown.tsx` - Markdown рендеринг

---

Документация обновлена: 2026-01-08
