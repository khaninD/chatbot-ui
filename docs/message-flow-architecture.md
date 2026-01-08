# 📊 Схема работы вывода сообщений в чате

## 🎯 Обзор системы

Система состоит из **трёх основных потоков**:
1. **Загрузка сообщений из БД** (при открытии чата)
2. **Отправка нового сообщения** (создание и стриминг)
3. **Отображение сообщений** (рендеринг в UI)

---

## 📥 ПОТОК 1: Загрузка сообщений из БД

### 1.1 Точка входа: `ChatUI.tsx`

```
useEffect (при открытии чата с chatid)
    ↓
fetchMessages()
    ↓
getMessagesByChatId(chatid) → Supabase запрос
    ↓
Получаем массив messages из таблицы "messages"
```

### 1.2 Обработка данных

```typescript
// chat-ui.tsx:140-154
const fetchedChatMessages = fetchedMessages.map(message => {
  return {
    message,                    // Сама запись из БД
    fileItems: [...],          // ID файлов, прикрепленных к сообщению
    contentBlocks:             // Блоки контента (tool_use, text)
      (message as any).content_blocks
        ? ((message as any).content_blocks as unknown as ContentBlock[])
        : undefined
  }
})

setChatMessages(fetchedChatMessages)  // → React Context
```

**Структура ChatMessage:**
```typescript
{
  message: {
    id: string
    chat_id: string
    user_id: string
    content: string              // Основной текст сообщения
    role: "user" | "assistant"
    model: string
    sequence_number: number
    created_at: string
    updated_at: string
    image_paths: string[]
    content_blocks: jsonb | null // ← Новая колонка!
  },
  fileItems: string[],          // IDs файлов
  contentBlocks?: ContentBlock[] // Распарсенные блоки
}
```

### 1.3 Дополнительная загрузка

```
Параллельно загружаются:
├── Изображения сообщений (message.image_paths)
├── File items (прикрепленные файлы через message_file_items)
└── Chat files (файлы чата через chat_files)
```

---

## 📤 ПОТОК 2: Отправка нового сообщения

### 2.1 Пользователь отправляет сообщение

```
ChatInput → handleSendMessage()
    ↓
use-chat-handler.tsx:251
```

### 2.2 Создание временных сообщений

```typescript
// Сохраняем текущую длину массива
const originalMessagesLength = chatMessages.length  // Например: 4

// Создаём временные сообщения
createTempMessages(...)
    ↓
    Создаёт 2 временных объекта:
    ├── tempUserChatMessage (с id: uuid, content: "вопрос пользователя")
    └── tempAssistantChatMessage (с id: uuid, content: "")
    ↓
    setChatMessages([
      ...chatMessages,           // 4 существующих сообщения
      tempUserChatMessage,       // 5-е (временное user)
      tempAssistantChatMessage   // 6-е (временное assistant)
    ])
```

**Состояние chatMessages после createTempMessages:**
```
[0] user: "привет"
[1] assistant: "здравствуйте"
[2] user: "как дела?"
[3] assistant: "хорошо"
[4] user: "новый вопрос" ← ВРЕМЕННОЕ (uuid)
[5] assistant: "" ← ВРЕМЕННОЕ (uuid), будет заполняться
```

### 2.3 Стриминг ответа

```typescript
// Выбор провайдера
if (selectedTools.length > 0) {
  processResponse(...)  // Инструменты через /api/chat/tools
} else if (provider === "ollama") {
  handleLocalChat(...)  // Локальная Ollama
} else {
  handleHostedChat(...) // Hosted API (Anthropic, OpenAI и т.д.)
}
```

**Все пути ведут к `processResponse()`:**

```typescript
// chat-helpers/index.ts:288-405
processResponse(response, lastChatMessage, ...)
    ↓
    Читает stream chunk по chunk
    ↓
    if (isSSE) {  // Server-Sent Events (Anthropic/LlamaIndex)
      Парсит события:
      ├── "content_block_start" → contentBlocks.push(block)
      ├── "content_block_delta" → обновляет текст
      └── "message_stop" → завершение
    } else {
      Парсит обычный JSON stream
    }
    ↓
    При каждом chunk:
    setChatMessages(prev =>
      prev.map(chatMessage => {
        if (chatMessage.message.id === lastChatMessage.message.id) {
          return {
            ...chatMessage,
            message: { ...message, content: fullText },
            contentBlocks: contentBlocks.length > 0 ? contentBlocks : undefined
          }
        }
        return chatMessage
      })
    )
    ↓
    return { text: fullText, contentBlocks }
```

**Состояние chatMessages во время стриминга:**
```
[0] user: "привет"
[1] assistant: "здравствуйте"
[2] user: "как дела?"
[3] assistant: "хорошо"
[4] user: "новый вопрос" ← ВРЕМЕННОЕ
[5] assistant: "Я использ..." ← ОБНОВЛЯЕТСЯ В РЕАЛЬНОМ ВРЕМЕНИ
    contentBlocks: [
      { type: "tool_use", name: "list_tables", input: {...} },
      { type: "text", text: "Я использ..." }
    ]
```

### 2.4 Сохранение в БД

```typescript
// После завершения стриминга
handleCreateMessages(
  chatMessages,              // Старое значение (4 сообщения)
  currentChat,
  ...
  generatedText,             // Полный текст ответа
  contentBlocks,             // Собранные блоки
  originalMessagesLength     // 4 ← КЛЮЧЕВОЙ ПАРАМЕТР!
)
    ↓
    // Создаём записи в БД
    const createdMessages = await createMessages([
      finalUserMessage: {
        content: "новый вопрос",
        role: "user",
        sequence_number: 5,
        ...
      },
      finalAssistantMessage: {
        content: generatedText,
        role: "assistant",
        sequence_number: 6,
        content_blocks: contentBlocks ← сохраняем в jsonb
        ...
      }
    ])
    ↓
    Supabase INSERT → получаем реальные ID из БД
    ↓
    // Обновляем состояние с РЕАЛЬНЫМИ сообщениями
    setChatMessages(currentMessages => {
      const originalMessages = currentMessages.slice(0, originalMessagesLength)
      //    ↑ Берём первые 4 сообщения (до временных)

      return [
        ...originalMessages,        // [0-3] существующие
        { message: createdMessages[0], fileItems: [] },  // [4] user из БД
        {
          message: createdMessages[1],                   // [5] assistant из БД
          fileItems: [...],
          contentBlocks: contentBlocks  ← ВАЖНО!
        }
      ]
    })
```

**Финальное состояние chatMessages:**
```
[0] user: "привет" (id: db-uuid-1)
[1] assistant: "здравствуйте" (id: db-uuid-2)
[2] user: "как дела?" (id: db-uuid-3)
[3] assistant: "хорошо" (id: db-uuid-4)
[4] user: "новый вопрос" (id: db-uuid-5) ← из БД
[5] assistant: "Я использовал..." (id: db-uuid-6) ← из БД
    contentBlocks: [...]
```

---

## 🎨 ПОТОК 3: Отображение сообщений

### 3.1 Иерархия компонентов

```
ChatUI
  └── ChatMessages
        └── chatMessages.map(chatMessage =>
              <Message
                message={chatMessage.message}
                contentBlocks={chatMessage.contentBlocks}
                fileItems={messageFileItems}
              />
            )
```

### 3.2 Компонент Message

```typescript
// messages/message.tsx
Message({ message, contentBlocks, fileItems })
    ↓
    Рендерит:
    ├── Аватар (user/assistant)
    ├── Имя модели
    ├── Время создания
    ├── MessageActions (copy, regenerate, etc.)
    └── Контент:
        │
        if (contentBlocks && contentBlocks.length > 0) {
          // Anthropic-style structured content
          contentBlocks.map(block => {
            if (block.type === "tool_use") {
              return <ToolCallBlock toolBlock={block} />
            } else if (block.type === "text") {
              return <MessageMarkdown content={block.text} />
            }
          })
        } else {
          // Обычный текст
          <MessageMarkdown content={message.content} />
        }
```

### 3.3 ToolCallBlock

```typescript
// messages/tool-call-block.tsx
ToolCallBlock({ toolBlock })
    ↓
    Рендерит collapsible block:
    ┌─────────────────────────────┐
    │ 🔧 list_tables        [▼]  │  ← Заголовок с иконкой
    ├─────────────────────────────┤
    │ {                           │  ← JSON input (pretty-printed)
    │   "output_format": "simple" │
    │ }                           │
    └─────────────────────────────┘
```

---

## 🔄 Ключевые моменты работы системы

### 1. **Двойное обновление состояния**
```
Временные сообщения (uuid) → Реальные сообщения (db id)
├── Во время стриминга: обновляем временное assistant сообщение
└── После сохранения: заменяем временные на реальные из БД
```

### 2. **Передача contentBlocks**
```
processResponse() → { text, contentBlocks }
         ↓
handleCreateMessages(contentBlocks)
         ↓
createMessages([..., content_blocks: jsonb])
         ↓
finalChatMessages[...contentBlocks]
         ↓
<Message contentBlocks={...} />
```

### 3. **Сохранение длины массива**
```typescript
// ДО создания временных сообщений
const originalMessagesLength = chatMessages.length  // 4

// ПОСЛЕ временных (но мы помним исходную длину)
chatMessages.length === 6  // но originalMessagesLength === 4!

// При замене:
currentMessages.slice(0, originalMessagesLength)  // берём первые 4
// вместо
currentMessages.slice(0, -2)  // может удалить не те сообщения!
```

### 4. **React Context для глобального состояния**
```
ChatbotUIContext
  ├── chatMessages: ChatMessage[]        ← Главное состояние
  ├── setChatMessages: Dispatch<...>
  ├── chatFileItems: FileItem[]
  ├── chatImages: MessageImage[]
  └── ...
```

### 5. **Типы контента**

**Без contentBlocks (старый способ):**
```json
{
  "message": {
    "content": "Вот список таблиц: ...",
    "content_blocks": null
  }
}
```

**С contentBlocks (Anthropic/LlamaIndex):**
```json
{
  "message": {
    "content": "Полный текст ответа для поиска",
    "content_blocks": [
      {
        "type": "tool_use",
        "id": "tool_176780180826_1",
        "name": "list_tables",
        "input": { "output_format": "simple" }
      },
      {
        "type": "text",
        "text": "Вот топ-5 рейсов..."
      }
    ]
  },
  "contentBlocks": [...]  // ← Дублируется для удобства в React state
}
```

---

## 📊 Диаграмма потока данных

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT CONTEXT STATE                       │
│                                                               │
│  chatMessages: ChatMessage[]                                 │
│    ├── message: { id, content, content_blocks, ... }        │
│    ├── fileItems: string[]                                   │
│    └── contentBlocks?: ContentBlock[]                        │
└─────────────────────────────────────────────────────────────┘
         ↑                                              ↓
         │                                              │
    [Загрузка из БД]                            [Отображение]
         │                                              │
         │                                              ↓
┌────────┴──────────┐                    ┌──────────────────────┐
│   fetchMessages   │                    │   ChatMessages       │
│   getMessagesByChatId                  │     ↓                │
│   ↓                                    │   .map(msg =>        │
│   Supabase query  │                    │     <Message />      │
│   ↓               │                    │   )                  │
│   Parse content_blocks                 │     ↓                │
│   ↓               │                    │   contentBlocks?     │
│   setChatMessages │                    │     ↓                │
└───────────────────┘                    │   <ToolCallBlock />  │
         ↑                               └──────────────────────┘
         │
    [Новое сообщение]
         │
┌────────┴─────────────────────────────────────────────────────┐
│  handleSendMessage()                                          │
│    ↓                                                          │
│  createTempMessages()  ← Создаём временные [uuid]           │
│    ↓                                                          │
│  processResponse()     ← Стрим от API                        │
│    ↓ (chunk by chunk)                                        │
│  setChatMessages()     ← Обновляем временное сообщение       │
│    ↓                                                          │
│  handleCreateMessages()                                       │
│    ↓                                                          │
│  createMessages([finalUserMessage, finalAssistantMessage])   │
│    ↓                   ↑ content_blocks: jsonb               │
│  Supabase INSERT                                             │
│    ↓                                                          │
│  setChatMessages()     ← Заменяем временные на реальные     │
│    (с originalMessagesLength)                                │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Основные функции и их роль

| Функция | Файл | Роль |
|---------|------|------|
| `fetchMessages()` | chat-ui.tsx:80 | Загрузка сообщений из БД при открытии чата |
| `handleSendMessage()` | use-chat-handler.tsx:200+ | Главная функция отправки сообщения |
| `createTempMessages()` | chat-helpers/index.ts:83 | Создание временных сообщений для UI |
| `processResponse()` | chat-helpers/index.ts:288 | Обработка stream ответа от API |
| `handleCreateMessages()` | chat-helpers/index.ts:448 | Сохранение сообщений в БД |
| `ChatMessages` | chat-messages.tsx:9 | Рендеринг списка сообщений |
| `Message` | message.tsx:41 | Рендеринг одного сообщения |
| `ToolCallBlock` | tool-call-block.tsx | Рендеринг блока вызова инструмента |

---

## 🔧 Debug точки

Для отладки в коде есть console.log:
- `[SSE] content_block_start:` - начало нового блока контента
- `[processResponse] Updating message with contentBlocks:` - обновление сообщения
- `[handleCreateMessages] contentBlocks:` - проверка наличия блоков перед сохранением

---

## 📝 История изменений

### Проблема 1: contentBlocks пропадали после стриминга
**Причина:** contentBlocks собирались в `processResponse()`, но не передавались в `handleCreateMessages()`

**Решение:** Изменили возвращаемое значение `processResponse()` с `string` на `{ text: string, contentBlocks: any[] }`

### Проблема 2: Предыдущие сообщения удалялись при отправке нового
**Причина:** Использовали `chatMessages.slice(0, -2)` со старым значением из замыкания, не учитывая реальное состояние после `createTempMessages()`

**Решение:**
1. Сохраняем `originalMessagesLength` ДО вызова `createTempMessages()`
2. Передаём это значение в `handleCreateMessages()`
3. Используем функциональное обновление `setChatMessages(currentMessages => ...)` и `currentMessages.slice(0, originalMessagesLength)`

---

Вот полная схема работы системы! Основная сложность - это синхронизация временных сообщений с реальными и правильная передача contentBlocks через всю цепочку.
