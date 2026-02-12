# GEMINI.md - Chatbot UI (v2.0.0)

## Project Overview
**Chatbot UI** is a sophisticated, open-source AI chat platform designed to be highly extensible and feature-rich. The v2.0.0 update introduces a powerful **Multi-Agent System** and deep integration with the **Model Context Protocol (MCP)**, allowing for advanced agentic workflows and tool-use capabilities.

### Main Technologies
- **Frontend**: [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/) (Radix UI), [Lucide Icons](https://lucide.dev/), [Tabler Icons](https://tabler.io/icons)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage)
- **AI Orchestration**: [LlamaIndex](https://www.llamaindex.ai/) (Workflows, Agents), [Vercel AI SDK](https://sdk.vercel.ai/)
- **Connectivity**: [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) for dynamic tool loading.
- **Internationalization**: [i18next](https://www.i18next.com/)

## Architecture

### AI & Agentic Workflow
The project leverages **LlamaIndex Workflows** to manage complex AI interactions. It features a **Multi-Agent Coordinator** that can delegate tasks to specialized agents:
- **Research Agent**: Expert in searching documentation and gathering information.
- **Code Agent**: Specialized in writing, refactoring, and executing code.
- **Data Agent**: Handles SQL queries and data analysis.
- **Image Agent**: Focused on image generation and editing.

The system also supports the **A2A (Agent-to-Agent)** protocol, enabling seamless communication between different agent endpoints.

### State Management
State is managed using **Zustand** stores located in the `stores/` directory:
- `chat-store.ts`: Manages chat messages, settings, and current selection.
- `assistant-store.ts`: Handles assistant configurations.
- `models-store.ts`: Manages available LLM models.

### Database Schema
The database is managed by Supabase, with migrations located in `supabase/migrations/`. Key tables include `chats`, `messages`, `assistants`, `files`, and `file_items` (for RAG).

## Building and Running

### Prerequisites
- Node.js (v18+ recommended)
- Docker (for local Supabase)
- Supabase CLI

### Local Setup
1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Start Supabase**:
   ```bash
   supabase start
   ```
3. **Environment Variables**:
   Copy `.env.local.example` to `.env.local` and fill in the required keys (get them via `supabase status`).
4. **Run Development Server**:
   ```bash
   npm run dev
   ```
5. **Access the App**:
   Open [http://localhost:3000](http://localhost:3000)

### Key Commands
- `npm run dev`: Starts the development server.
- `npm run chat`: Alias for running the app locally.
- `npm run build`: Builds the application for production.
- `npm run lint`: Runs ESLint for code quality checks.
- `npm run type-check`: Runs TypeScript compiler check.
- `npm test`: Executes the test suite using Jest.

## Development Conventions

### Coding Style
- **TypeScript**: Strict typing is enforced. Use types from the `types/` directory.
- **Components**: Follow the Radix/Shadcn pattern. UI components reside in `components/ui/`.
- **API Routes**: Located in `app/api/`. Follow the Next.js App Router conventions.

### Agent Development
- Agent logic is centralized in `lib/llamaindex/`.
- New tools should be added as MCP servers or defined within `lib/llamaindex/tools/`.
- Use `runAgentStream` in `lib/llamaindex/agent.ts` for handling streaming AI responses.

### Testing
- **Unit/Integration Tests**: Located in `__tests__/`, using Jest.
- **E2E Tests**: Managed via Playwright in `__tests__/playwright-test/`.

### Context Management
The project implements a custom context management strategy in `lib/build-prompt.ts`, reserving tokens for system prompts and model responses, and ensuring guaranteed inclusion of recent message history.

## Key Files & Directories
- `app/`: Next.js App Router (pages and API routes).
- `components/`: UI components (chat, messages, sidebar, etc.).
- `lib/llamaindex/`: Core AI and agent logic.
- `stores/`: State management.
- `supabase/`: Database configuration and migrations.
- `types/`: Global TypeScript definitions.
- `docs/`: Additional architecture and feature documentation.
