# Интеграция LlamaIndex SQL Agent в Chatbot UI

Этот документ описывает интеграцию пользовательского LlamaIndex агента с MCP (Model Context Protocol) в проект Chatbot UI через отдельный HTTP сервер.

## Архитектура

```
┌─────────────────┐      HTTP Request       ┌──────────────────────┐
│   Chatbot UI    │─────────────────────────▶│  Agent Server        │
│   (Next.js)     │                          │  (Express + Node.js) │
└─────────────────┘◀─────────────────────────└──────────────────────┘
                       HTTP Response                    │
                                                         │
                                                         ▼
                                              ┌──────────────────────┐
                                              │   MCP Server         │
                                              │   (SQL Tools)        │
                                              └──────────────────────┘
                                                         │
                                                         ▼
                                              ┌──────────────────────┐
                                              │   PostgreSQL DB      │
                                              └──────────────────────┘
```

## Компоненты

### 1. Agent Server (Отдельный сервис)

**Расположение**: `D:\LlamaIndexTS\examples\mcp\agent-server\`

**Функционал**:
- Standalone Express HTTP сервер
- Запуск LlamaIndex агента с MCP инструментами
- REST API для обработки запросов
- Docker поддержка
- Health check endpoint

**Файлы**:
- `src/server.ts` - Express сервер
- `src/agent.ts` - Логика агента
- `Dockerfile` - Docker образ
- `docker-compose.yml` - Оркестрация
- `package.json` - Зависимости

### 2. Chatbot UI Integration

**Файл**: `app/api/chat/llamaindex/route.ts`

**Функционал**:
- Edge Runtime совместимый endpoint
- HTTP клиент для обращения к Agent Server
- Обработка ошибок и форматирование результатов
- Передача OpenAI API ключа

### 3. Типы и модели

**Обновленные файлы**:
- `types/models.ts` - провайдер "llamaindex"
- `types/llms.ts` - тип LlamaIndexLLMID
- `lib/models/llm/llamaindex-llm-list.ts` - список моделей
- `lib/chat-setting-limits.ts` - лимиты модели

## Установка и настройка

### Шаг 1: Сборка MCP сервера

```bash
cd D:\LlamaIndexTS\examples\mcp
npm run build
```

Это создаст `dist/server.bundle.js`

### Шаг 2: Настройка Agent Server

```bash
cd D:\LlamaIndexTS\examples\mcp\agent-server
npm install
```

Создайте `.env` файл:
```env
# OpenAI Configuration
OPENAI_API_KEY=your-openai-key-here
OPENAI_MODEL=gpt-4o

# Server Configuration
PORT=3001
VERBOSE=false

# MCP Server Path
MCP_SERVER_PATH=D:\LlamaIndexTS\examples\dist\server.bundle.js

# PostgreSQL Configuration
PGHOST=localhost
PGPORT=5432
PGDATABASE=your_database
PGUSER=your_user
PGPASSWORD=your_password
```

### Шаг 3: Запуск Agent Server

**Локально (development)**:
```bash
npm run dev
```

**Production**:
```bash
npm run build
npm start
```

**Docker**:
```bash
docker-compose up -d
```

Сервер запустится на `http://localhost:3001`

### Шаг 4: Настройка Chatbot UI

В `.env` файле chatbot-ui добавьте (опционально):
```env
LLAMAINDEX_AGENT_URL=http://localhost:3001
```

Если не указан, будет использоваться `http://localhost:3001` по умолчанию.

### Шаг 5: Запуск Chatbot UI

```bash
cd D:\my_programs\chatbot-ui
npm run dev
```

## Использование

### В UI

1. Откройте Chatbot UI
2. В настройках модели выберите **LlamaIndex SQL Agent**
3. Задайте вопрос, например: "Какой самый дорогой билет?"

### API запросы

**Health Check**:
```bash
curl http://localhost:3001/health
```

**Прямой запрос к агенту**:
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Покажи все таблицы",
    "apiKey": "sk-your-openai-key"
  }'
```

**Через Chatbot UI API**:
```bash
curl -X POST http://localhost:3000/api/chat/llamaindex \
  -H "Content-Type: application/json" \
  -d '{
    "chatSettings": {
      "model": "llamaindex-sql-agent",
      "temperature": 0.7
    },
    "messages": [
      {
        "role": "user",
        "content": "Какой самый дорогой билет?"
      }
    ]
  }'
```

## Docker Deployment

### Сборка и запуск

```bash
cd D:\LlamaIndexTS\examples\mcp\agent-server

# Сборка образа
docker-compose build

# Запуск
docker-compose up -d

# Просмотр логов
docker-compose logs -f llamaindex-agent

# Остановка
docker-compose down
```

### Volumes

Docker compose монтирует MCP server bundle:
```yaml
volumes:
  - ../dist/server.bundle.js:/app/mcp-server/server.bundle.js:ro
```

Убедитесь, что файл существует перед запуском Docker.

### Environment Variables

Передаются через `.env` файл или `docker-compose.yml`.

## Преимущества этого подхода

1. **Изоляция**: Агент работает отдельно от Next.js
2. **Edge Runtime**: Нет проблем с совместимостью Node.js модулей
3. **Масштабируемость**: Можно запустить несколько инстансов агента
4. **Докеризация**: Легко развернуть в контейнере
5. **Переиспользование**: Другие приложения могут использовать тот же API
6. **Гибкость**: API ключи передаются в запросе (опционально)
7. **Мониторинг**: Health check для проверки статуса

## API Endpoints

### Agent Server

#### GET /health
Health check endpoint

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### POST /api/chat
Main agent endpoint

**Request**:
```json
{
  "query": "Какой самый дорогой билет?",
  "systemPrompt": "Optional custom system prompt",
  "apiKey": "Optional OpenAI API key"
}
```

**Response**:
```json
{
  "success": true,
  "result": {
    // Agent response
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Chatbot UI

#### POST /api/chat/llamaindex
Proxy endpoint for LlamaIndex agent

Использует стандартный формат Chatbot UI:
```json
{
  "chatSettings": {
    "model": "llamaindex-sql-agent",
    "temperature": 0.7
  },
  "messages": [...]
}
```

## Конфигурация

### Agent Server (.env)

```env
# Required
OPENAI_API_KEY=sk-...
PGHOST=localhost
PGDATABASE=mydb
PGUSER=postgres
PGPASSWORD=password

# Optional
PORT=3001
OPENAI_MODEL=gpt-4o
VERBOSE=false
MCP_SERVER_PATH=/path/to/server.bundle.js
```

### Chatbot UI (.env)

```env
# Optional - defaults to http://localhost:3001
LLAMAINDEX_AGENT_URL=http://localhost:3001
```

## Troubleshooting

### Agent Server не запускается

**Ошибка**: `MCP_SERVER_PATH not found`

**Решение**: Убедитесь, что MCP сервер собран:
```bash
cd D:\LlamaIndexTS\examples\mcp
npm run build
```

### Chatbot UI не может подключиться к агенту

**Ошибка**: `LlamaIndex Agent Server is not running`

**Решение**:
1. Проверьте, что Agent Server запущен:
```bash
curl http://localhost:3001/health
```

2. Проверьте `LLAMAINDEX_AGENT_URL` в `.env`

### OpenAI API ошибки

**Ошибка**: `OPENAI_API_KEY is required`

**Решение**:
- Установите API ключ в Chatbot UI профиле
- Или добавьте в `.env` Agent Server

### Database connection issues

**Решение**: Проверьте PostgreSQL credentials в `.env` Agent Server

### Docker health check failing

**Решение**:
```bash
# Проверьте логи
docker-compose logs llamaindex-agent

# Проверьте health check
docker inspect llamaindex-agent-server | grep -A 10 Health
```

## Производительность

### Оптимизация

- MCP сервер создается при каждом запросе и очищается после
- HTTP запросы асинхронные
- Edge Runtime в Chatbot UI обеспечивает низкую латентность
- Docker health checks контролируют статус

### Рекомендации

- Используйте connection pooling для PostgreSQL
- Кешируйте часто используемые запросы (можно добавить Redis)
- Оптимизируйте SQL запросы с индексами
- Ограничивайте размер результатов LIMIT
- Мониторьте использование памяти в Docker

## Безопасность

### Важные меры

- API ключи передаются через HTTPS (в production)
- Agent server должен быть за firewall/VPN
- Используйте environment variables для секретов
- База данных - только read-only доступ для агента
- Docker изолирует процессы

### Рекомендации

- Используйте reverse proxy (nginx) перед Agent Server
- Добавьте rate limiting
- Логируйте все запросы
- Регулярно обновляйте зависимости
- Используйте CORS только для trusted domains

## Мониторинг

### Логирование

Agent Server логирует:
- Входящие запросы с timestamp
- Ошибки выполнения
- MCP server статус

Просмотр логов:
```bash
# Docker
docker-compose logs -f llamaindex-agent

# Local
npm run dev  # показывает логи в консоли
```

### Метрики

Health check endpoint:
```bash
curl http://localhost:3001/health
```

Docker health status:
```bash
docker ps | grep llamaindex-agent
```

## Дальнейшие улучшения

Возможные направления развития:

1. **Streaming**: Реализовать Server-Sent Events для streaming ответов
2. **Кеширование**: Добавить Redis для кеша результатов
3. **Rate Limiting**: Защита от DDoS
4. **Аутентификация**: JWT токены для безопасного доступа
5. **Мультиязычность**: Поддержка разных БД (MySQL, MongoDB)
6. **Metrics**: Prometheus + Grafana для мониторинга
7. **Logging**: Centralized logging (ELK stack)
8. **CI/CD**: Автоматический деплой через GitHub Actions

## Контакты и поддержка

- **Chatbot UI**: [GitHub](https://github.com/mckaywrigley/chatbot-ui)
- **LlamaIndex**: [Documentation](https://www.llamaindex.ai)
- **Agent Server**: См. `agent-server/README.md`
