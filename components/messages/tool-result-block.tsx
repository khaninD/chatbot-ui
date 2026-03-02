import { ToolResultContentBlock } from "@/types"
import {
  IconChevronDown,
  IconChevronRight,
  IconCheck,
  IconX,
  IconDownload,
  IconPhoto
} from "@tabler/icons-react"
import React, { FC, useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { MessageMarkdown } from "./message-markdown"
import { renderInputValue } from "./code-detect"

interface ToolResultBlockProps {
  resultBlock: ToolResultContentBlock
}

// Extract image from markdown content (supports both URL and base64)
const extractImageFromMarkdown = (
  content: string
): { imageData: string; isBase64: boolean; restContent: string } | null => {
  // Match markdown image - both base64 and URL
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/
  const match = content.match(imageRegex)

  if (match) {
    const imageData = match[2]
    const isBase64 = imageData.startsWith("data:image")
    const restContent = content.replace(match[0], "").trim()
    return { imageData, isBase64, restContent }
  }

  return null
}

// Download image (works with both base64 and URL)
const downloadImage = async (imageUrl: string, filename: string) => {
  try {
    if (imageUrl.startsWith("data:")) {
      // Direct download for base64
      const link = document.createElement("a")
      link.href = imageUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      // Fetch and download for URL
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    }
  } catch (error) {
    // Fallback: open in new tab
    window.open(imageUrl, "_blank")
  }
}

export const ToolResultBlock: FC<ToolResultBlockProps> = ({ resultBlock }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const content =
    typeof resultBlock.content === "string"
      ? resultBlock.content
      : JSON.stringify(resultBlock.content, null, 2)

  const isError = resultBlock.is_error
  const isImageGeneration =
    resultBlock.tool_name === "generate_image" ||
    resultBlock.tool_name === "edit_image"
  // Parse image from content if it's an image generation result
  const imageResult = useMemo(() => {
    if (isImageGeneration && typeof content === "string") {
      return extractImageFromMarkdown(content)
    }
    return null
  }, [isImageGeneration, content])

  const handleDownload = async () => {
    if (imageResult?.imageData) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      await downloadImage(
        imageResult.imageData,
        `generated-image-${timestamp}.png`
      )
    }
  }

  // Special rendering for image generation results
  if (isImageGeneration && imageResult) {
    return (
      <div className="my-2 overflow-hidden rounded-lg border border-green-500/30 bg-green-500/5">
        {/* Header */}
        <div
          className="flex cursor-pointer items-center justify-between p-3 hover:bg-green-500/10"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-2">
            <IconPhoto size={18} className="text-green-500" />
            <span className="font-semibold text-green-600 dark:text-green-400">
              Image Generated
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={e => {
                e.stopPropagation()
                handleDownload()
              }}
              className="rounded p-1 hover:bg-green-500/20"
              title="Download image"
            >
              <IconDownload size={18} className="text-green-500" />
            </button>
            {isExpanded ? (
              <IconChevronDown size={18} />
            ) : (
              <IconChevronRight size={18} />
            )}
          </div>
        </div>

        {/* Image preview (always visible) */}
        <div className="px-3 pb-3">
          <img
            src={imageResult.imageData}
            alt="Generated image"
            className="max-h-[400px] w-auto rounded-lg shadow-lg"
            loading="lazy"
          />
        </div>

        {/* Expanded details */}
        {isExpanded && imageResult.restContent && (
          <div className="border-t border-green-500/20 p-3">
            <MessageMarkdown content={imageResult.restContent} />
          </div>
        )}
      </div>
    )
  }

  // Default rendering for other tool results
  return (
    <div
      className={cn(
        "my-2 rounded-lg border p-3",
        isError
          ? "border-red-500/30 bg-red-500/5"
          : "border-green-500/30 bg-green-500/5"
      )}
    >
      <div
        className="flex cursor-pointer items-center justify-between hover:opacity-70"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          {isError ? (
            <IconX size={18} className="text-red-500" />
          ) : (
            <IconCheck size={18} className="text-green-500" />
          )}
          <span
            className={cn(
              "font-semibold",
              isError
                ? "text-red-600 dark:text-red-400"
                : "text-green-600 dark:text-green-400"
            )}
          >
            {resultBlock.tool_name} {isError ? "failed" : "completed"}
          </span>
        </div>
        {isExpanded ? (
          <IconChevronDown size={18} />
        ) : (
          <IconChevronRight size={18} />
        )}
      </div>

      {isExpanded && (
        <div className="mt-3">
          {typeof resultBlock.content === "object" &&
          resultBlock.content !== null ? (
            <div className="space-y-2">
              {Object.entries(
                resultBlock.content as Record<string, unknown>
              ).map(([key, value]) => renderInputValue(key, value))}
            </div>
          ) : content.includes("![") && content.includes("](data:image") ? (
            <MessageMarkdown content={content} />
          ) : (
            renderInputValue("result", content)
          )}
        </div>
      )}
    </div>
  )
}
