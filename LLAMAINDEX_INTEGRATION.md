# Интеграция LlamaIndex SQL Agent в Chatbot UI

Этот документ описывает интеграцию пользовательского LlamaIndex агента с MCP (Model Context Protocol) в проект Chatbot UI.

## Что было добавлено

### 1. API Endpoint
- **Файл**: `app/api/chat/llamaindex/route.ts`
- **Описание**: Edge Runtime совместимый endpoint для обработки запросов к LlamaIndex агенту
- **Функционал**:
  - Создание MCP сервера для подключения к SQL базе данных
  - Инициализация агента с инструментами (execute_sql, get_table_schema, list_tables)
  - Обработка запросов пользователя
  - Streaming ответов

### 2. Типы
- **Файлы**:
  - `types/models.ts` - добавлен провайдер "llamaindex"
  - `types/llms.ts` - добавлен тип `LlamaIndexLLMID` и модель "llamaindex-sql-agent"

### 3. Список моделей
- **Файл**: `lib/models/llm/llamaindex-llm-list.ts`
- **Модель**: LlamaIndex SQL Agent
- **Провайдер**: llamaindex

### 4. Настройки лимитов
- **Файл**: `lib/chat-setting-limits.ts`
- **Лимиты для модели**:
  - MIN_TEMPERATURE: 0.0
  - MAX_TEMPERATURE: 2.0
  - MAX_TOKEN_OUTPUT_LENGTH: 4096
  - MAX_CONTEXT_LENGTH: 128000

### 5. Зависимости
Установлены следующие пакеты:
- `@llamaindex/openai` - LLM провайдер
- `@llamaindex/tools` - MCP инструменты
- `@llamaindex/workflow` - Агент воркфлоу
- `@modelcontextprotocol/sdk` - SDK для MCP

## Конфигурация

### Требования
1. **OpenAI API Key** - необходим для работы LLM
2. **MCP Server** - должен быть запущен и доступен по пути `D:\\LlamaIndexTS\\examples\\dist\\server.bundle.js`
3. **База данных** - настроенная PostgreSQL база с данными

### Настройка MCP сервера

В файле `app/api/chat/llamaindex/route.ts` настройте путь к вашему MCP серверу:

```typescript
const server = mcp({
  command: "node",
  args: ["D:\\LlamaIndexTS\\examples\\dist\\server.bundle.js"], // Укажите путь к вашему серверу
  verbose: false,
})
```

### Настройка промптов агента

Системный промпт агента находится в функции `createLlamaIndexAgent`:

```typescript
const additionalInstructions = `
Ты - SQL аналитик. Используй инструменты для выполнения запросов к базе данных.
...
`
```

Вы можете изменить промпт под свои нужды.

## Использование

### 1. Запуск приложения

```bash
cd D:\my_programs\chatbot-ui
npm run dev
```

### 2. Выбор модели

В интерфейсе Chatbot UI:
1. Откройте настройки чата
2. В списке моделей найдите **LlamaIndex SQL Agent**
3. Выберите эту модель

### 3. Отправка запросов

Теперь вы можете отправлять SQL-запросы на естественном языке:

**Примеры:**
- "Какой самый дорогой билет?"
- "Покажи все таблицы в базе"
- "Какая структура таблицы users?"
- "Сколько всего записей в таблице orders?"

Агент автоматически:
1. Получит список таблиц через `list_tables`
2. Изучит структуру нужных таблиц через `get_table_schema`
3. Сформирует и выполнит SQL запрос через `execute_sql`
4. Вернет результат в JSON формате

## Архитектура

### Поток данных

```
User Input (Chatbot UI)
    ↓
handleHostedChat (chat-helpers)
    ↓
POST /api/chat/llamaindex
    ↓
createLlamaIndexAgent
    ↓
MCP Server (SQL Tools)
    ↓
PostgreSQL Database
    ↓
Agent Response
    ↓
Streaming to User
```

### Компоненты

1. **Frontend**: Использует стандартную инфраструктуру Chatbot UI
2. **API Route**: Edge Runtime совместимый endpoint
3. **LlamaIndex Agent**: Воркфлоу агент с инструментами
4. **MCP Server**: Сервер с SQL инструментами
5. **Database**: PostgreSQL база данных

## Расширение

### Добавление новых инструментов

Чтобы добавить новые инструменты MCP:

1. Добавьте инструменты в ваш MCP сервер
2. Обновите промпт агента с описанием новых инструментов
3. При необходимости обновите логику обработки в `route.ts`

### Добавление новых моделей

Чтобы добавить новую модель LlamaIndex:

1. Добавьте новый ID в `types/llms.ts`:
   ```typescript
   export type LlamaIndexLLMID =
     | "llamaindex-sql-agent"
     | "llamaindex-new-model" // новая модель
   ```

2. Добавьте модель в `lib/models/llm/llamaindex-llm-list.ts`
3. Добавьте лимиты в `lib/chat-setting-limits.ts`
4. Создайте новый endpoint или добавьте логику в существующий

## Troubleshooting

### Ошибка "MCP Server not found"
- Проверьте путь к MCP серверу в `route.ts`
- Убедитесь, что сервер собран (`npm run build` в проекте LlamaIndexTS)

### Ошибка "OpenAI API Key not found"
- Добавьте OpenAI API ключ в настройки профиля Chatbot UI
- Или установите переменную окружения `OPENAI_API_KEY`

### Timeout ошибки
- Увеличьте timeout для Edge Runtime
- Проверьте производительность вашей базы данных
- Оптимизируйте SQL запросы

### Edge Runtime ошибки
- Убедитесь, что все импорты совместимы с Edge Runtime
- Используйте динамические импорты для Node.js специфичных модулей
- Избегайте использования файловой системы напрямую

## Производительность

### Оптимизация
- MCP сервер создается при каждом запросе и очищается после
- Используется streaming для быстрого отображения результатов
- Edge Runtime обеспечивает низкую латентность

### Рекомендации
- Кешируйте часто используемые запросы
- Оптимизируйте структуру базы данных
- Используйте индексы для частых запросов
- Ограничьте размер результатов LIMIT

## Безопасность

### Важные меры
- Агент выполняет только SELECT запросы (настраивается в MCP сервере)
- API ключи хранятся в Supabase и не передаются клиенту
- Используется валидация входных данных
- Edge Runtime изолирует выполнение кода

### Рекомендации
- Ограничьте права пользователя БД только чтением
- Используйте отдельного пользователя для MCP сервера
- Регулярно обновляйте зависимости
- Мониторьте использование API

## Дальнейшие улучшения

Возможные направления развития:
1. **Кеширование**: Добавить Redis для кеширования результатов
2. **Аналитика**: Логирование запросов и метрики производительности
3. **Multi-database**: Поддержка нескольких баз данных
4. **Визуализация**: Автоматическое создание графиков из результатов
5. **Контекст**: Сохранение контекста между запросами
6. **Streaming**: Улучшенный streaming для больших результатов

## Контакты и поддержка

Для вопросов и предложений:
- GitHub Issues: [chatbot-ui](https://github.com/mckaywrigley/chatbot-ui)
- LlamaIndex Docs: [llamaindex.ai](https://www.llamaindex.ai)
