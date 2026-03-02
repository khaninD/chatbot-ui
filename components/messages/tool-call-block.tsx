import { ToolUseContentBlock } from "@/types"
import {
  IconChevronDown,
  IconChevronRight,
  IconTool
} from "@tabler/icons-react"
import React, { FC, useState } from "react"
import { renderInputValue } from "./code-detect"

interface ToolCallBlockProps {
  toolBlock: ToolUseContentBlock
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
