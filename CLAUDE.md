# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build, Development & Testing Commands

### Local Development
```bash
# Start local development with Supabase and Next.js dev server
npm run chat

# Restart Supabase and dev server (stops Supabase first)
npm run restart

# Regular Next.js dev server only (no Supabase start)
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

### Database Management
```bash
# Reset local database and regenerate types
npm run db-reset

# Apply migrations and regenerate types
npm run db-migrate

# Generate TypeScript types from Supabase schema
npm run db-types

# Pull remote database changes
npm run db-pull

# Push local migrations to remote database
npm run db-push
```

### Code Quality
```bash
# Run ESLint
npm run lint

# Run ESLint with auto-fix
npm run lint:fix

# Type check without emitting files
npm run type-check

# Format code with Prettier
npm run format:write

# Check formatting
npm run format:check

# Run tests
npm run test

# Analyze bundle size
npm run analyze
```

### Supabase (must have Docker running)
```bash
# Start Supabase locally
supabase start

# Stop Supabase
supabase stop

# Check Supabase status (get API URLs and keys)
supabase status

# Link to remote Supabase project
supabase link --project-ref <project-id>
```

### Update Process
```bash
# Pull latest changes and update database
npm run update
```

## Architecture Overview

### Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Backend**: Next.js API Routes (Node.js runtime for LlamaIndex, Edge runtime for other providers)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **AI Integration**: LlamaIndex with MCP (Model Context Protocol) tools
- **Styling**: Tailwind CSS, shadcn/ui components
- **State Management**: React Context (see `context/` directory)

### Directory Structure

**`app/`** - Next.js App Router
- `app/api/` - API routes for AI providers and services
  - `app/api/chat/llamaindex/route.ts` - LlamaIndex agent with MCP tools (Node.js runtime)
  - `app/api/chat/openai/`, `anthropic/`, `google/`, etc. - Other AI provider routes
- `app/[locale]/` - Internationalized routes

**`lib/`** - Utility functions and core logic
- `lib/llamaindex/` - LlamaIndex agent implementation
  - `lib/llamaindex/agent.ts` - Agent creation and MCP tool loading
- `lib/build-prompt.ts` - Context management (see CONTEXT_MANAGEMENT.md)
- `lib/models/` - AI model configurations
- `lib/retrieval/` - RAG (Retrieval-Augmented Generation) logic
- `lib/supabase/` - Supabase client and utilities

**`components/`** - React components
- `components/chat/` - Chat interface components
- `components/messages/` - Message display and tool call blocks
- `components/ui/` - shadcn/ui components
- `components/sidebar/` - Sidebar navigation

**`db/`** - Database TypeScript helpers (CRUD operations)
- Organized by entity: `chats.ts`, `messages.ts`, `assistants.ts`, etc.
- All use Supabase client

**`types/`** - TypeScript type definitions
- `types/content-blocks.ts` - Anthropic-style content blocks
- `types/chat-message.ts` - Chat message types

**`context/`** - React Context providers for global state

**`supabase/`** - Supabase configuration
- `supabase/migrations/` - Database migrations
- `supabase/types.ts` - Auto-generated TypeScript types from database schema

## LlamaIndex Agent Integration

This codebase has a **custom LlamaIndex agent** integrated directly into Next.js (no separate agent-server required).

### Key Files
- `lib/llamaindex/agent.ts` - Agent creation with MCP tool loading
- `app/api/chat/llamaindex/route.ts` - API route (Node.js runtime)

### Architecture
The agent uses **Anthropic-style structured responses** with Server-Sent Events (SSE):
- Tool calls are sent as `content_block_start` events with type `tool_use`
- Text responses are sent as `content_block_delta` events with type `text_delta`
- Frontend renders tool calls in collapsible blocks (like Claude Desktop)

### MCP Tool Integration
- MCP servers are configured in Supabase `mcp_servers` table
- Multiple MCP servers can be used simultaneously
- Tools are loaded dynamically via `@modelcontextprotocol/sdk`
- Automatic cleanup of MCP connections after agent completion

### Important: Runtime Configuration
The LlamaIndex route **requires Node.js runtime** (not Edge):
```typescript
export const runtime = "nodejs" // Required for LlamaIndex SDK
```

All LlamaIndex packages must be externalized in `next.config.js`:
```javascript
serverExternalPackages: [
  "@llamaindex/openai",
  "@llamaindex/tools",
  "@llamaindex/workflow",
  "@llamaindex/core",
  "@modelcontextprotocol/sdk"
]
```

**See `LLAMAINDEX_INTEGRATION.md` for detailed documentation.**

## Context Management Strategy

The app uses a **stateless architecture** where the full conversation history is sent with each request.

### Key Concepts (Claude Code approach)
- **Token Reservations**: Reserve space for system prompt (~2000 tokens) and response (~4000 tokens)
- **Message Prioritization**: Always include last 6 messages (recent context), add older messages if they fit
- **Smart Truncation**: Skip large messages but continue trying older ones (no early `break`)
- **Clean History**: Tool calls are NOT saved to database - only final text responses

### Implementation
- `lib/build-prompt.ts` - Context management logic
- Console logging shows: `[Context Management] Total: X msgs | Included: Y msgs | Tokens: Z/128000`

**See `CONTEXT_MANAGEMENT.md` for detailed documentation.**

## Structured Content Blocks (Anthropic Style)

Messages use **structured content blocks** instead of plain text:

### Data Flow
```
LlamaIndex Agent → SSE Events → route.ts → Frontend
                                    ↓
                    content_block_start (tool_use)
                    content_block_delta (text_delta)
                                    ↓
                    ChatMessage with contentBlocks[]
```

### Types
- `ContentBlock` = `TextContentBlock | ToolUseContentBlock`
- Each message has `message.content` (text) and `message.contentBlocks` (structured data)

### UI Components
- `components/messages/tool-call-block.tsx` - Collapsible tool call display
- `components/messages/message.tsx` - Renders both text and tool blocks

**See `ANTHROPIC_STYLE_IMPLEMENTATION.md` for detailed documentation.**

## Environment Variables

### Required
```bash
# Supabase (get from `supabase status`)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# OpenAI (for LlamaIndex agent or OpenAI provider)
OPENAI_API_KEY=<your-key>
```

### Optional
```bash
# Other AI providers
ANTHROPIC_API_KEY=<your-key>
GOOGLE_GEMINI_API_KEY=<your-key>
MISTRAL_API_KEY=<your-key>
GROQ_API_KEY=<your-key>

# Ollama (for local models)
NEXT_PUBLIC_OLLAMA_URL=http://localhost:11434

# Development
NODE_ENV=development  # Enables verbose logging for agent and MCP
```

**Note:** If environment variables are set for API keys, they override user settings globally (input disabled in UI).

## Database Schema

The database is managed via Supabase migrations in `supabase/migrations/`.

### Key Tables
- `profiles` - User profiles with API keys and settings
- `workspaces` - User workspaces
- `chats` - Chat conversations
- `messages` - Individual messages (with `content_blocks` JSONB field)
- `assistants` - Custom assistant configurations
- `files` - Uploaded files for RAG
- `mcp_servers` - MCP server configurations (name, URL)
- `tools` - Custom tool definitions

### Type Generation
After schema changes, regenerate types:
```bash
npm run db-types
```

This updates `supabase/types.ts` which is imported throughout the codebase.

## Path Aliases

Import aliases configured in `tsconfig.json`:
```typescript
import { ChatMessage } from "@/types/chat-message"
import { createClient } from "@/lib/supabase/server"
```

`@/*` maps to repository root.

## Internationalization

- Uses `next-i18n-router` for routing
- Translations in locale files (not shown in directory structure)
- `lib/i18n.ts` - i18n configuration
- `middleware.ts` - Language detection and routing

## Styling

- **Tailwind CSS** with custom configuration in `tailwind.config.ts`
- **shadcn/ui** components in `components/ui/`
- **Radix UI** primitives for accessibility
- Theme management via `next-themes`

## Testing

- Jest configured in `jest.config.ts`
- Tests in `__tests__/` directory
- Run with `npm run test`

## Key Implementation Patterns

### 1. API Routes
Most AI provider routes follow this pattern:
- Parse request body
- Build context from chat history (via `lib/build-prompt.ts`)
- Call AI provider SDK
- Stream response back to client

LlamaIndex route is unique: uses Node.js runtime and structured SSE events.

### 2. Database Operations
Use helpers in `db/`:
```typescript
import { createChat } from "@/db/chats"
import { createMessage } from "@/db/messages"

const chat = await createChat(userId, workspaceId, chatData)
const message = await createMessage(chatId, messageData)
```

### 3. Supabase Client
- Server: `lib/supabase/server.ts` - use in Server Components and API routes
- Client: `lib/supabase/client.ts` - use in Client Components
- Middleware: `lib/supabase/middleware.ts` - auth in middleware

### 4. Context Providers
Global state managed via React Context (see `context/` directory):
- Wrap components with providers
- Access via custom hooks

## MCP Server Setup

MCP servers run separately (e.g., on port 3002) and are registered in the `mcp_servers` database table.

The LlamaIndex agent loads tools from all configured MCP servers when a chat uses MCP-enabled settings.

## Troubleshooting

### "Cannot use import statement outside a module"
- Ensure LlamaIndex packages are in `serverExternalPackages` in `next.config.js`
- Verify `runtime = "nodejs"` in LlamaIndex route

### Database type errors
```bash
npm run db-types
```

### Supabase connection issues
```bash
supabase status  # Check if running
supabase start   # Start if stopped
```

### Build errors with native modules
Check `next.config.js` webpack configuration - native modules (sharp, pdf-parse, canvas) must be externalized.
