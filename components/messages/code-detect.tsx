import React from "react"
import { MessageCodeBlock } from "./message-codeblock"
import hljs from "highlight.js/lib/core"

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

/**
 * Enhanced language detection using highlight.js auto-detection
 * Supports: SQL, Python, JavaScript/TypeScript, Go, Rust, Bash, JSON, Java, C#, PHP, Ruby
 * Returns the language name compatible with react-syntax-highlighter
 */
export const detectCodeLanguage = (str: string): string | null => {
  if (typeof str !== "string" || str.length < 10) return null

  try {
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
export const renderInputValue = (
  key: string,
  value: unknown
): React.JSX.Element => {
  if (typeof value === "string") {
    const language = detectCodeLanguage(value)
    if (language) {
      let displayValue = value
      if (language === "json") {
        try {
          displayValue = JSON.stringify(JSON.parse(value), null, 2)
        } catch {
          // keep original
        }
      }
      return (
        <div key={key}>
          <div className="mb-1 text-xs font-semibold text-muted-foreground">
            {key}:
          </div>
          <MessageCodeBlock language={language} value={displayValue} />
        </div>
      )
    }
  }

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
