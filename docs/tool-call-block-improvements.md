# 🎨 Улучшения ToolCallBlock - Умное форматирование

## 📋 Обзор

Обновленный компонент `ToolCallBlock` теперь автоматически определяет тип содержимого в параметрах инструментов и рендерит их с подсветкой синтаксиса вместо простого JSON.

---

## ✨ Что изменилось

### До улучшений

```typescript
// Все параметры рендерились как JSON
{
  "sql": "SELECT\n  f.flight_id,\n  f.flight_no,\n  f.departure_airport..."
}
```

**Проблема:** SQL запросы отображались как экранированные строки JSON без форматирования и подсветки синтаксиса.

### После улучшений

SQL код теперь отображается с:
- ✅ Подсветкой синтаксиса (используя react-syntax-highlighter)
- ✅ Правильным форматированием (переносы строк, отступы)
- ✅ Кнопками "Copy" и "Download"
- ✅ Темной темой (oneDark)

---

## 🔧 Как это работает

### 1. Определение типа контента

Компонент автоматически определяет язык программирования по паттернам в строке:

```typescript
const detectCodeLanguage = (str: string): string | null => {
  // SQL - проверяем наличие ключевых слов
  if (/\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN)\b/i.test(str)) {
    return "sql"
  }

  // Python - проверяем синтаксис Python
  if (/\b(def |import |from |class |if __name__|print\()/i.test(str)) {
    return "python"
  }

  // JavaScript/TypeScript
  if (/\b(function |const |let |var |=>|console\.log)/i.test(str)) {
    return "javascript"
  }

  // JSON - пытаемся распарсить
  if (/^\s*[\{\[]/.test(str)) {
    try {
      JSON.parse(str)
      return "json"
    } catch {
      return null
    }
  }

  return null
}
```

### 2. Условный рендеринг

В зависимости от определенного языка, параметр рендерится по-разному:

```typescript
const renderInputValue = (key: string, value: any): React.JSX.Element => {
  if (typeof value === "string") {
    const language = detectCodeLanguage(value)

    if (language) {
      // Рендерим с подсветкой синтаксиса
      return (
        <div key={key}>
          <div className="text-xs font-semibold">{key}:</div>
          <MessageCodeBlock language={language} value={value} />
        </div>
      )
    }
  }

  // Обычный JSON рендеринг для остальных типов
  return (
    <div key={key}>
      <div className="text-xs font-semibold">{key}:</div>
      <pre className="rounded bg-muted p-2 text-xs">
        <code>{typeof value === "string" ? value : JSON.stringify(value, null, 2)}</code>
      </pre>
    </div>
  )
}
```

### 3. Использование MessageCodeBlock

`MessageCodeBlock` - это существующий компонент, который:
- Использует `react-syntax-highlighter` с темой `oneDark`
- Предоставляет кнопки "Copy" и "Download"
- Показывает название языка
- Поддерживает горизонтальную прокрутку

---

## 📊 Примеры

### Пример 1: SQL запрос

**Input:**
```json
{
  "type": "tool_use",
  "name": "execute_sql",
  "input": {
    "sql": "SELECT\n  f.flight_id,\n  COUNT(*) AS booking_count\nFROM bookings.ticket_flights\nGROUP BY f.flight_id\nORDER BY booking_count DESC\nLIMIT 5"
  }
}
```

**Рендеринг:**

```
┌─────────────────────────────────────────────┐
│ 🔧 execute_sql                         [v] │
├─────────────────────────────────────────────┤
│ sql:                                        │
│ ┌─────────────────────────────────────────┐ │
│ │ sql                      [↓] [📋]       │ │ ← Кнопки download/copy
│ ├─────────────────────────────────────────┤ │
│ │ SELECT                                  │ │ ← Подсветка синтаксиса
│ │   f.flight_id,                          │ │
│ │   COUNT(*) AS booking_count             │ │
│ │ FROM bookings.ticket_flights            │ │
│ │ GROUP BY f.flight_id                    │ │
│ │ ORDER BY booking_count DESC             │ │
│ │ LIMIT 5                                 │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Пример 2: Python код

**Input:**
```json
{
  "type": "tool_use",
  "name": "run_python",
  "input": {
    "code": "def calculate_sum(numbers):\n    return sum(numbers)\n\nresult = calculate_sum([1, 2, 3, 4, 5])\nprint(result)"
  }
}
```

**Рендеринг:**

```
┌─────────────────────────────────────────────┐
│ 🔧 run_python                          [v] │
├─────────────────────────────────────────────┤
│ code:                                       │
│ ┌─────────────────────────────────────────┐ │
│ │ python                   [↓] [📋]       │ │
│ ├─────────────────────────────────────────┤ │
│ │ def calculate_sum(numbers):             │ │ ← Подсветка Python
│ │     return sum(numbers)                 │ │
│ │                                         │ │
│ │ result = calculate_sum([1, 2, 3, 4, 5]) │ │
│ │ print(result)                           │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Пример 3: Простые параметры

**Input:**
```json
{
  "type": "tool_use",
  "name": "list_tables",
  "input": {
    "output_format": "simple",
    "max_results": 10
  }
}
```

**Рендеринг:**

```
┌─────────────────────────────────────────────┐
│ 🔧 list_tables                         [v] │
├─────────────────────────────────────────────┤
│ output_format:                              │
│ ┌─────────────────────────────────────────┐ │
│ │ simple                                  │ │ ← Обычный текст
│ └─────────────────────────────────────────┘ │
│                                             │
│ max_results:                                │
│ ┌─────────────────────────────────────────┐ │
│ │ 10                                      │ │ ← JSON.stringify для чисел
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Пример 4: JSON объект

**Input:**
```json
{
  "type": "tool_use",
  "name": "api_call",
  "input": {
    "payload": "{\"user_id\": 123, \"action\": \"update\", \"data\": {\"name\": \"John\"}}"
  }
}
```

**Рендеринг:**

```
┌─────────────────────────────────────────────┐
│ 🔧 api_call                            [v] │
├─────────────────────────────────────────────┤
│ payload:                                    │
│ ┌─────────────────────────────────────────┐ │
│ │ json                     [↓] [📋]       │ │
│ ├─────────────────────────────────────────┤ │
│ │ {                                       │ │ ← Подсветка JSON
│ │   "user_id": 123,                       │ │
│ │   "action": "update",                   │ │
│ │   "data": {                             │ │
│ │     "name": "John"                      │ │
│ │   }                                     │ │
│ │ }                                       │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## 🎯 Поддерживаемые языки

### Автоматически определяемые языки:

1. **SQL**
   - Ключевые слова: SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, FROM, WHERE, JOIN, GROUP BY, ORDER BY, LIMIT, OFFSET
   - Минимальная длина: 20 символов

2. **Python**
   - Паттерны: def, import, from, class, if __name__, print()

3. **JavaScript/TypeScript**
   - Паттерны: function, const, let, var, =>, console.log, import, export

4. **JSON**
   - Начинается с `{` или `[`
   - Валидный JSON (проверяется через JSON.parse)

### Расширение поддержки

Чтобы добавить поддержку нового языка, обновите функцию `detectCodeLanguage`:

```typescript
// Добавить Go
if (/\b(func |package |import |type |struct |interface )/i.test(str)) {
  return "go"
}

// Добавить Rust
if (/\b(fn |let mut |impl |trait |struct |enum )/i.test(str)) {
  return "rust"
}
```

---

## 🔍 Технические детали

### Зависимости

- `highlight.js@11.11.1` - профессиональная библиотека для детекции и подсветки синтаксиса кода
- `react-syntax-highlighter` - React компонент для подсветки синтаксиса
- `oneDark` theme - темная тема для кода
- `MessageCodeBlock` - существующий компонент для рендеринга кода с подсветкой

### Использование highlight.js

```typescript
import hljs from "highlight.js/lib/core"
import sql from "highlight.js/lib/languages/sql"
// ... import других языков

// Регистрируем языки
hljs.registerLanguage("sql", sql)

// Автоопределение языка
const result = hljs.highlightAuto(str, ["sql", "python", "javascript", ...])

// Проверяем уверенность (relevance)
if (result.relevance > 5 && result.language) {
  return result.language
}
```

### Преимущества highlight.js

1. **Профессиональная детекция** - использует статистические модели и паттерны
2. **Высокая точность** - relevance score показывает уверенность в определении
3. **Поддержка 190+ языков** - мы импортируем только нужные (bundle optimization)
4. **Активная поддержка** - регулярные обновления и исправления
5. **Типы TypeScript** - полная поддержка типов из коробки

### Файлы

- `components/messages/tool-call-block.tsx` - основной компонент с детекцией языка
- `components/messages/message-codeblock.tsx` - компонент для рендеринга кода с подсветкой

### Производительность

- Детекция языка - O(n) где n - длина строки (highlight.js оптимизирован)
- Рендеринг кода - мемоизирован в MessageCodeBlock
- Bundle size - импортируем только нужные языки (tree-shaking)
- Минимальная длина - 10 символов (для избежания ложных срабатываний)

---

## 🚀 Будущие улучшения

### Возможные дополнения:

1. **Tool Results (результаты выполнения)**
   ```typescript
   {
     type: "tool_result",
     tool_use_id: "tool_123",
     content: "результат выполнения SQL"
   }
   ```
   Можно отображать результаты также с форматированием.

2. **Больше языков**
   - Go
   - Rust
   - Ruby
   - PHP
   - Shell scripts

3. **Автоматическое форматирование**
   - Использовать prettier для автоформатирования SQL/JS
   - Использовать sqlformat для SQL

4. **Inline preview**
   - Показывать первые несколько строк SQL в collapsed виде
   - "SELECT ... FROM bookings.flights (5 lines)"

5. **Выполнение запросов**
   - Кнопка "Run Query" для SQL (если есть подключение к БД)
   - Показывать результаты прямо в UI

6. **Статистика**
   - Время выполнения tool call
   - Количество затронутых строк (для SQL)
   - Размер результата

---

## 📝 Примечания

### Особенности текущей реализации:

1. **Детекция по паттернам** - простая и быстрая, но может давать ложные срабатывания
   - Решение: можно добавить минимальный confidence score

2. **SQL ключевые слова case-insensitive** - работает с SELECT, select, Select
   - Это правильное поведение для SQL

3. **JSON парсинг в try/catch** - безопасно, но может быть дорого для больших строк
   - Решение: добавить лимит на размер строки для парсинга

4. **Каждый параметр рендерится отдельно** - если в tool input 5 параметров, будет 5 блоков
   - Это хорошо для читабельности, но можно добавить опцию группировки

---

## 🎨 Стилизация

### CSS классы используемые:

```typescript
// ToolCallBlock
"my-2 rounded-lg border border-primary bg-secondary p-3"

// Заголовок
"flex cursor-pointer items-center justify-between hover:opacity-70"

// Label параметра
"mb-1 text-xs font-semibold text-muted-foreground"

// Fallback pre/code
"overflow-x-auto rounded bg-muted p-2 text-xs"
```

### Темы подсветки синтаксиса:

Используется `oneDark` тема из `react-syntax-highlighter`:
- Темный фон (#282c34)
- Контрастные цвета для ключевых слов
- Приятные цвета для строк, чисел, комментариев

---

## 📚 Связанные документы

- [message-flow-architecture.md](./message-flow-architecture.md) - Общая архитектура системы сообщений
- [contentBlocks-rendering.md](./contentBlocks-rendering.md) - Детали рендеринга contentBlocks

---

Документация обновлена: 2026-01-08
