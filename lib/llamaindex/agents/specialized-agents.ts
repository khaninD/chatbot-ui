/**
 * Specialized Agents
 * Different agents for different tasks - research, code, data analysis, etc.
 */

import { agent, AgentWorkflow } from "@llamaindex/workflow"
import { ToolCallLLM, BaseToolWithCall } from "@llamaindex/core/llms"

/**
 * PostgreSQL toolbox-mcp tool names
 * All database/data tools from D:\apps\agent-client\toolbox-mcp
 */
const POSTGRES_TOOLBOX_TOOLS = [
  "list_schemas",
  "list_tables",
  "describe_table",
  "query",
  "get-primary-keys",
  "list_pg_settings",
  "list_query_stats",
  "list_top_bloated_tables",
  "list_table_stats",
  "list_available_extensions",
  "list_database_stats",
  "get-table-relations",
  "search-users-by-email",
  "database_overview",
  "get-table-stats",
  "list_memory_configurations",
  "get_column_cardinality",
  "list_indexes",
  "search-orders-by-date-range",
  "list_active_queries",
  "list_views",
  "get-table-columns",
  "list_autovacuum_configurations",
  "get_query_plan",
  "list_roles",
  "list-tables-brief",
  "list_installed_extensions",
  "execute_sql",
  "list_replication_slots",
  "list_invalid_indexes",
  "list_publication_tables",
  "list_locks",
  "list_tablespaces",
  "replication_stats",
  "list_triggers",
  "long_running_transactions",
  "list_sequences"
] as const

/**
 * Image generation tool names
 * From lib/llamaindex/tools/image-generation-tool.ts and image-edit-tool.ts
 */
const IMAGE_TOOL_NAMES = ["generate_image", "edit_image"] as const

/**
 * Research Agent
 * Specializes in searching documentation, web sources, and gathering information
 */
export function createResearchAgent(
  llm: ToolCallLLM,
  tools: BaseToolWithCall[]
): AgentWorkflow {
  // Filter tools relevant for research (search, read, etc.)
  const researchTools = tools.filter(
    tool =>
      tool.metadata?.name?.includes("search") ||
      tool.metadata?.name?.includes("read") ||
      tool.metadata?.name?.includes("fetch") ||
      tool.metadata?.name?.includes("grep") ||
      tool.metadata?.name?.includes("glob")
  )

  return agent({
    name: "researcher",
    description:
      "Research and coordination agent. Searches documentation, reads files, and delegates tasks to specialized agents when needed.",
    systemPrompt: `You are a research and coordination agent. Your role is to:

1. **Primary Role: Research and Information Gathering**
   - Search through documentation and codebases
   - Find relevant files and code snippets
   - Read and understand file contents
   - Fetch information from web sources

2. **Secondary Role: Task Coordination**
   You are the ENTRY POINT for all user requests. Analyze each request and decide:
   - Can I handle this with my research tools? → Do it directly
   - Does this need specialized tools I don't have? → Delegate to specialist agent

3. **CRITICAL: When to Delegate (You MUST delegate these tasks)**

   **SQL/Database queries** → Delegate to "data_analyst" agent:
   - Keywords: "база данных", "бд", "sql", "query", "выведи данные", "таблица"
   - Example: "выведи топ 5 рейсов из бд" → USE HANDOFF TOOL to delegate to data_analyst
   - You do NOT have SQL tools, data_analyst does

   **Image generation** → Delegate to "image_specialist" agent:
   - Keywords: "изображение", "картинку", "инфографику", "image", "picture", "png", "jpg"
   - Example: "создай инфографику" → USE HANDOFF TOOL to delegate to image_specialist
   - You do NOT have image generation tools, image_specialist does

   **Code writing/editing** → Delegate to "coder" agent:
   - Keywords: "написать код", "создать функцию", "write code", "implement"
   - You do NOT have code editing tools, coder does

   **Custom/specialized tasks** → Delegate to "custom_tools_specialist" agent:
   - Tasks requiring user-defined MCP tools
   - API integrations, webhooks, domain-specific operations
   - Tools not covered by standard agents

4. **Multi-Step Tasks**
   Query: "выведи топ 5 рейсов из бд и создай инфографику"

   Step 1: Recognize TWO separate tasks:
   - Task 1: Database query (you DON'T have SQL tools)
   - Task 2: Image generation (you DON'T have image tools)

   Step 2: Delegate to data_analyst FIRST with instruction:
   "Query database for top 5 flights, then delegate to image_specialist to create infographic with results"

   The data_analyst will handle both steps.

**IMPORTANT:**
- You do NOT have SQL tools
- You do NOT have image generation tools
- You do NOT have code editing tools
- When you see these tasks → ALWAYS use handoff tool to delegate
- Never just return text response when delegation is needed`,
    tools: researchTools,
    llm,
    canHandoffTo: [
      "coder",
      "data_analyst",
      "image_specialist",
      "custom_tools_specialist"
    ]
  })
}

/**
 * Code Agent
 * Specializes in writing, editing, and refactoring code
 */
export function createCodeAgent(
  llm: ToolCallLLM,
  tools: BaseToolWithCall[]
): AgentWorkflow {
  // Filter tools relevant for coding (write, edit, etc.)
  const codeTools = tools.filter(
    tool =>
      tool.metadata?.name?.includes("write") ||
      tool.metadata?.name?.includes("edit") ||
      tool.metadata?.name?.includes("create") ||
      tool.metadata?.name?.includes("execute") ||
      tool.metadata?.name?.includes("bash")
  )

  return agent({
    name: "coder",
    description:
      "Expert in writing and modifying code. Creates new files, edits existing code, refactors implementations, and runs commands. Use this agent when you need to write code, modify files, or execute terminal commands.",
    systemPrompt: `You are a code specialist agent. Your role is to:

1. **Code Creation**
   - Write clean, maintainable code
   - Follow existing code patterns and conventions
   - Add appropriate comments and documentation
   - Consider edge cases and error handling

2. **Code Modification**
   - Edit existing code carefully
   - Preserve existing functionality unless explicitly asked to change
   - Maintain code style consistency
   - Update related code if needed

3. **Best Practices**
   - Write type-safe code (TypeScript)
   - Follow SOLID principles
   - Avoid over-engineering
   - Keep solutions simple and focused
   - Don't add features beyond what's requested

4. **Execution**
   - Run tests after changes
   - Execute commands when needed
   - Verify changes work as expected
   - Fix errors immediately

5. **Security**
   - Avoid security vulnerabilities (XSS, SQL injection, etc.)
   - Validate inputs at system boundaries
   - Don't hardcode sensitive data
   - Follow security best practices

When writing code:
- Read existing files first to understand patterns
- Prefer editing over creating new files
- Test changes after implementation
- Provide clear explanations of what changed

You can delegate to other agents when needed:
- "researcher" agent for finding information or understanding code
- "data_analyst" agent for database queries and data analysis
- "image_specialist" agent for image generation`,
    tools: codeTools,
    llm,
    canHandoffTo: ["researcher", "data_analyst", "image_specialist"]
  })
}

/**
 * Data Agent
 * Specializes in data analysis, database queries, and data processing
 */
export function createDataAgent(
  llm: ToolCallLLM,
  tools: BaseToolWithCall[]
): AgentWorkflow {
  // Filter only PostgreSQL toolbox-mcp tools by exact name match
  const dataTools = tools.filter(tool =>
    POSTGRES_TOOLBOX_TOOLS.includes(tool.metadata?.name as any)
  )

  return agent({
    name: "data_analyst",
    description:
      "Expert in data analysis and database operations. Executes SQL queries, analyzes data patterns, and generates insights. Use this agent when you need to query databases, analyze data, or generate reports.",
    systemPrompt: `You are a data analyst specialist agent. Your role is to:

1. **Database Operations**
   - Write efficient SQL queries
   - Understand database schemas
   - Handle complex joins and aggregations
   - Optimize query performance

2. **Data Analysis**
   - Analyze data patterns and trends
   - Calculate statistics and metrics
   - Identify anomalies and outliers
   - Generate meaningful insights

3. **Reporting**
   - Present data clearly
   - Create summaries and visualizations (when possible)
   - Explain findings in business terms
   - Provide actionable recommendations

4. **Best Practices**
   - Use read-only queries when possible
   - Validate data before operations
   - Handle NULL values appropriately
   - Consider performance implications

When working with data:
- Explore the schema first if unfamiliar
- Verify query results make sense
- Explain what the data shows
- Suggest follow-up analyses if relevant

You can delegate to other agents when needed:
- "researcher" agent for finding documentation or understanding data models
- "coder" agent for writing scripts or automation
- "image_specialist" agent for visualizing data as images`,
    tools: dataTools,
    llm,
    canHandoffTo: ["researcher", "coder", "image_specialist"]
  })
}

/**
 * Image Agent
 * Specializes in image generation and editing
 */
export function createImageAgent(
  llm: ToolCallLLM,
  tools: BaseToolWithCall[]
): AgentWorkflow {
  // Filter tools for image operations - exact match from image generation/edit tools
  const imageTools = tools.filter(
    tool =>
      tool.metadata?.name === "generate_image" ||
      tool.metadata?.name === "edit_image"
  )

  return agent({
    name: "image_specialist",
    description:
      "Expert in image generation and editing. Creates new images from descriptions and modifies existing images. Use this agent when you need to generate or edit images.",
    systemPrompt: `You are an image specialist agent. Your role is to:

1. **Image Generation**
   - Create images from text descriptions
   - Follow user specifications carefully
   - Generate appropriate sizes and formats
   - Consider composition and aesthetics

2. **Image Editing**
   - Modify existing images per user requests
   - Apply transformations accurately
   - Preserve image quality
   - Handle multiple images when needed

3. **Communication**
   - Confirm image specifications before generating
   - Describe what you're creating/editing
   - Provide URLs to generated images
   - Suggest improvements when appropriate

When working with images:
- Ask for clarification if description is vague
- Specify which image (index) when editing multiple
- Verify the result meets expectations
- Offer to make adjustments if needed

Image tools available:
- generate_image: Create new images
- edit_image: Modify existing images

You can delegate to other agents if needed:
- "researcher" agent for finding reference images or documentation
- "data_analyst" agent for getting data to visualize`,
    tools: imageTools,
    llm,
    canHandoffTo: ["researcher", "data_analyst"]
  })
}

/**
 * Custom Tools Agent
 * Handles user-defined MCP tools that don't fit into standard categories
 */
export function createCustomToolsAgent(
  llm: ToolCallLLM,
  tools: BaseToolWithCall[]
): AgentWorkflow {
  // Filter tools that are NOT in our standard categories
  // These are custom MCP tools added by the user
  const customTools = tools.filter(
    tool =>
      !POSTGRES_TOOLBOX_TOOLS.includes(tool.metadata?.name as any) &&
      !IMAGE_TOOL_NAMES.includes(tool.metadata?.name as any) &&
      // Exclude research tools (search, read, etc.)
      !tool.metadata?.name?.includes("search") &&
      !tool.metadata?.name?.includes("read") &&
      !tool.metadata?.name?.includes("fetch") &&
      !tool.metadata?.name?.includes("grep") &&
      !tool.metadata?.name?.includes("glob") &&
      // Exclude code tools (write, edit, bash)
      !tool.metadata?.name?.includes("write") &&
      !tool.metadata?.name?.includes("edit") &&
      !tool.metadata?.name?.includes("create") &&
      !tool.metadata?.name?.includes("execute") &&
      !tool.metadata?.name?.includes("bash")
  )

  return agent({
    name: "custom_tools_specialist",
    description:
      "Expert in using custom MCP tools and user-defined integrations. Handles tasks that require specialized tools not covered by standard agents.",
    systemPrompt: `You are a custom tools specialist agent. Your role is to:

1. **Custom Tool Usage**
   - Use user-defined MCP tools effectively
   - Understand tool descriptions and parameters
   - Execute tools based on user requests
   - Handle diverse custom integrations

2. **Flexibility**
   - Adapt to different types of custom tools
   - Learn from tool descriptions and metadata
   - Handle API integrations, webhooks, custom services
   - Work with domain-specific tools

3. **Collaboration**
   - Delegate to other agents when needed
   - Combine custom tools with standard capabilities
   - Share results with other agents

You have access to custom MCP tools that extend the system's capabilities beyond standard database, image, code, and research operations.

You can delegate to other agents when needed:
- "researcher" agent for finding information
- "data_analyst" agent for database operations
- "coder" agent for code modifications
- "image_specialist" agent for image generation`,
    tools: customTools,
    llm,
    canHandoffTo: ["researcher", "data_analyst", "coder", "image_specialist"]
  })
}

/**
 * Create all specialized agents
 */
export function createSpecializedAgents(
  llm: ToolCallLLM,
  allTools: BaseToolWithCall[]
): {
  researcher: AgentWorkflow
  coder: AgentWorkflow
  dataAnalyst: AgentWorkflow
  imageSpecialist: AgentWorkflow
  customTools: AgentWorkflow
} {
  // Log all available tools with detailed metadata
  console.log("\n=== ALL AVAILABLE TOOLS (Detailed) ===")
  console.log(`Total tools: ${allTools.length}\n`)

  // Group tools by category
  const toolsByCategory: Record<string, any[]> = {
    postgres: [],
    image: [],
    custom: [],
    other: []
  }

  allTools.forEach(tool => {
    const name = tool.metadata?.name || "unnamed"

    // Image tools - exact match
    if (IMAGE_TOOL_NAMES.includes(name as any)) {
      toolsByCategory.image.push(tool)
    }
    // PostgreSQL/Database tools - exact match from toolbox-mcp
    else if (POSTGRES_TOOLBOX_TOOLS.includes(name as any)) {
      toolsByCategory.postgres.push(tool)
    }
    // Custom MCP tools (not in standard categories)
    else if (
      !name.includes("search") &&
      !name.includes("read") &&
      !name.includes("fetch") &&
      !name.includes("grep") &&
      !name.includes("glob") &&
      !name.includes("write") &&
      !name.includes("edit") &&
      !name.includes("create") &&
      !name.includes("execute") &&
      !name.includes("bash")
    ) {
      toolsByCategory.custom.push(tool)
    }
    // Research/Code tools (filtered by agents)
    else {
      toolsByCategory.other.push(tool)
    }
  })

  console.log(
    `📊 PostgreSQL/Database Tools (${toolsByCategory.postgres.length}):`
  )
  toolsByCategory.postgres.forEach((tool, i) => {
    console.log(`   ${i + 1}. ${tool.metadata?.name}`)
  })

  console.log(`\n🎨 Image Tools (${toolsByCategory.image.length}):`)
  toolsByCategory.image.forEach((tool, i) => {
    console.log(`   ${i + 1}. ${tool.metadata?.name}`)
  })

  console.log(`\n🔌 Custom MCP Tools (${toolsByCategory.custom.length}):`)
  if (toolsByCategory.custom.length > 0) {
    toolsByCategory.custom.forEach((tool, i) => {
      console.log(`   ${i + 1}. ${tool.metadata?.name}`)
    })
  } else {
    console.log(`   (none - user can add custom MCP servers)`)
  }

  console.log(`\n🔧 Research/Code Tools (${toolsByCategory.other.length}):`)
  toolsByCategory.other.forEach((tool, i) => {
    console.log(`   ${i + 1}. ${tool.metadata?.name}`)
  })

  console.log("\n=======================================\n")

  return {
    researcher: createResearchAgent(llm, allTools),
    coder: createCodeAgent(llm, allTools),
    dataAnalyst: createDataAgent(llm, allTools),
    imageSpecialist: createImageAgent(llm, allTools),
    customTools: createCustomToolsAgent(llm, allTools)
  }
}
