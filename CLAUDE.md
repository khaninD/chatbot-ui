# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chatbot UI v2.0.0 — an open-source, multi-provider AI chat platform with agentic workflow support, MCP integration, and RAG capabilities. Forked from mckaywrigley/chatbot-ui.

## Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run type-check   # TypeScript check (tsc --noEmit)
npm run format:write # Prettier format
npm run format:check # Prettier check
npm test             # Jest tests
npm run analyze      # Bundle analysis
```

**Docker**: `docker compose up` (port 3000, reads `.env`, health check at `/api/health`).

## Tech Stack

Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS, Shadcn UI (Radix), Zustand for state, Supabase (PostgreSQL + Auth + Storage), Vercel AI SDK, i18next.

## Architecture

### Routing & i18n

App Router with locale-based routing: `app/[locale]/[workspaceid]/chat/[chatid]`. Default locale is **"ru"** (Russian). 17 locales supported via `next-i18n-router`.

### Chat Flow (critical path)

1. User sends message → `useChatHandler` hook (`components/chat/chat-hooks/use-chat-handler.tsx`)
2. Prompt built via `lib/build-prompt.ts` (128K token limit, 4K reserved for response, last 6 messages always included)
3. Request sent to `/api/chat/agent` → proxies to external **Agent Server** (`AGENT_SERVER_URL` env var) via SSE
4. Streaming uses **Anthropic-style SSE events**: `content_block_start`, `content_block_delta`, `content_block_stop`, `message_delta`, `message_stop`
5. Messages persisted to Supabase after generation completes

### State Management (dual system)

- **Zustand stores** (`stores/`) — primary pattern, 10 stores with Zod validation: `chat-store.ts`, `chat-runtime-store.ts`, `chat-input-store.ts`, `items-store.ts`, `models-store.ts`, `profile-store.ts`, `workspace-store.ts`, `attachments-store.ts`, `retrieval-store.ts`, `tool-store.ts`
- **React Context** (`context/context.tsx`) — legacy, large flat interface, still referenced in some components

### Database (Supabase/PostgreSQL)

Types are generated in `supabase/types.ts`. Use `Tables<"table_name">`, `TablesInsert<>`, `TablesUpdate<>` for type-safe DB access. DB access layer is in `db/` directory (one file per entity). Migrations in `supabase/migrations/`.

Key vector search functions: `match_file_items_openai`, `match_file_items_local` (RAG similarity search).

### Content Blocks

Messages use Anthropic-style structured content blocks (`types/content-blocks.ts`): `text`, `tool_use`, `tool_result`. This is how tool calls are represented in the UI.

### Model Providers

Union type `ModelProvider` in `types/models.ts`: openai, google, anthropic, mistral, groq, perplexity, comet, routerai, deepseek, ollama, openrouter, llamaindex, custom. Provider "comet" is an aggregator proxy routing to multiple underlying providers.

### MCP Integration

MCP server configs stored in DB (`mcp_servers` table), fetched at chat time, passed to the agent server for dynamic tool loading.

## Conventions

- Imports use `@/` path alias (maps to project root)
- API routes follow Next.js App Router convention (`app/api/.../route.ts`)
- UI components follow Shadcn pattern with `cn()` utility (clsx + tailwind-merge)
- Commit messages are in Russian
- ESLint 9 flat config; `no-explicit-any` and `no-unused-vars` are warnings, not errors
- Underscore-prefixed variables are ignored by unused-vars rule

## Environment Variables

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AGENT_SERVER_URL`, `LLM_API_KEY`, `LLM_BASE_URL`. See `.env.example` for full list.

## Testing

- Unit tests: Jest + jsdom + Testing Library in `__tests__/`
- E2E tests: Playwright in `__tests__/playwright-test/`
- Mocks in `__mocks__/`
