import { ToolUseContentBlock } from "@/types"
import {
  IconChevronDown,
  IconChevronRight,
  IconTool
} from "@tabler/icons-react"
import { FC, useState } from "react"
import { cn } from "@/lib/utils"

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
          <div>
            <div className="mb-1 text-xs font-semibold text-muted-foreground">
              Input:
            </div>
            <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">
              <code>{JSON.stringify(toolBlock.input, null, 2)}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
