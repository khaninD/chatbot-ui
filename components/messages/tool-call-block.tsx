import { ToolUseContentBlock } from "@/types"
import {
  IconChevronDown,
  IconChevronRight,
  IconTool
} from "@tabler/icons-react"
import React, { FC, useState } from "react"
import { cn } from "@/lib/utils"
import { MessageCodeBlock } from "./message-codeblock"
import hljs from "highlight.js/lib/core"

// Import only the languages we want to support for auto-detection
// This keeps bundle size small while supporting common languages
import sql from "highlight.js/lib/languages/sql"
import python from "highlight.js/lib/languages/python"
import javascript from "highlight.js/lib/languages/javascript"
import typescript from "highlight.js/lib/languages/typescript"
import json from "highlight.js/lib/languages/json"
import bash from "highlight.js/lib/languages/bash"
import go from "highlight.js/lib/languages/go"
import rust from "highlight.js/lib/languages/rust"
import java from "highlight.js/lib/languages/java"
import csharp from "highlight.js/lib/languages/csharp"
import php from "highlight.js/lib/languages/php"
import ruby from "highlight.js/lib/languages/ruby"

// Register languages with highlight.js
hljs.registerLanguage("sql", sql)
hljs.registerLanguage("python", python)
hljs.registerLanguage("javascript", javascript)
hljs.registerLanguage("typescript", typescript)
hljs.registerLanguage("json", json)
hljs.registerLanguage("bash", bash)
hljs.registerLanguage("go", go)
hljs.registerLanguage("rust", rust)
hljs.registerLanguage("java", java)
hljs.registerLanguage("csharp", csharp)
hljs.registerLanguage("php", php)
hljs.registerLanguage("ruby", ruby)

interface ToolCallBlockProps {
  toolBlock: ToolUseContentBlock
}

/**
 * Enhanced language detection using highlight.js auto-detection
 * Supports: SQL, Python, JavaScript/TypeScript, Go, Rust, Bash, JSON, Java, C#, PHP, Ruby
 * Returns the language name compatible with react-syntax-highlighter
 */
const detectCodeLanguage = (str: string): string | null => {
  if (typeof str !== "string" || str.length < 10) return null

  try {
    // Use highlight.js auto-detection with our registered languages
    const result = hljs.highlightAuto(str, [
      "sql",
      "python",
      "javascript",
      "typescript",
      "json",
      "bash",
      "go",
      "rust",
      "java",
      "csharp",
      "php",
      "ruby"
    ])

    // Only return language if confidence is high enough (relevance > 5)
    // Lower threshold for SQL since it's a common use case
    const minRelevance = result.language === "sql" ? 3 : 5

    if (
      result.relevance &&
      result.relevance > minRelevance &&
      result.language
    ) {
      return result.language
    }

    // Fallback: simple JSON detection
    if (/^\s*[\{\[]/.test(str.trim())) {
      try {
        JSON.parse(str)
        return "json"
      } catch {
        // Not valid JSON
      }
    }

    return null
  } catch (error) {
    console.error("Error detecting code language:", error)
    return null
  }
}

// Render a single input field value with smart formatting
const renderInputValue = (key: string, value: any): React.JSX.Element => {
  // If value is a string that looks like code/SQL, render with syntax highlighting
  if (typeof value === "string") {
    const language = detectCodeLanguage(value)
    if (language) {
      return (
        <div key={key}>
          <div className="mb-1 text-xs font-semibold text-muted-foreground">
            {key}:
          </div>
          <MessageCodeBlock language={language} value={value} />
        </div>
      )
    }
  }

  // Otherwise, render as JSON
  return (
    <div key={key}>
      <div className="mb-1 text-xs font-semibold text-muted-foreground">
        {key}:
      </div>
      <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">
        <code>
          {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
        </code>
      </pre>
    </div>
  )
}

export const ToolCallBlock: FC<ToolCallBlockProps> = ({ toolBlock }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="my-2 rounded-lg border border-primary bg-secondary p-3">
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

      {isExpanded && (
        <div className="mt-3 space-y-2">
          {/* Smart rendering for each input field */}
          {Object.entries(toolBlock.input).map(([key, value]) =>
            renderInputValue(key, value)
          )}
        </div>
      )}
    </div>
  )
}
