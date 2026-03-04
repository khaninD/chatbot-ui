import { callConfirmResolver } from "@/lib/confirm-resolvers"
import { ConfirmRequiredContentBlock } from "@/types/content-blocks"
import {
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconShieldCheck,
  IconX
} from "@tabler/icons-react"
import React, { FC, useState } from "react"
import { renderInputValue } from "./code-detect"
import { Button } from "../ui/button"
import { Input } from "../ui/input"

interface ConfirmRequiredBlockProps {
  block: ConfirmRequiredContentBlock
}

export const ConfirmRequiredBlock: FC<ConfirmRequiredBlockProps> = ({
  block
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [userInput, setUserInput] = useState("")

  const isPending = block.status === "pending"

  const handleConfirm = () => {
    callConfirmResolver(block.confirmationId, {
      confirmed: true,
      userInput: userInput || undefined
    })
  }

  const handleReject = () => {
    callConfirmResolver(block.confirmationId, {
      confirmed: false,
      userInput: userInput || undefined
    })
  }

  return (
    <div className="my-2 rounded-lg border border-yellow-500/50 bg-secondary p-3">
      <div
        className="flex cursor-pointer items-center justify-between hover:opacity-70"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <IconShieldCheck size={18} className="text-yellow-500" />
          <span className="font-semibold">
            Требуется подтверждение: {block.toolName}
          </span>
          {!isPending && (
            <span
              className={`ml-2 rounded px-2 py-0.5 text-xs font-medium ${
                block.status === "confirmed"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {block.status === "confirmed" ? "Подтверждено" : "Отклонено"}
            </span>
          )}
        </div>
        {isExpanded ? (
          <IconChevronDown size={18} />
        ) : (
          <IconChevronRight size={18} />
        )}
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          {Object.entries(block.toolInput).map(([key, value]) =>
            renderInputValue(key, value)
          )}
        </div>
      )}

      {isPending && (
        <div className="mt-3 flex items-center gap-2">
          <Input
            placeholder="Комментарий (необязательно)..."
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleConfirm()
              }
            }}
            className="flex-1"
          />
          <Button
            size="sm"
            variant="default"
            className="bg-green-600 text-white hover:bg-green-700"
            onClick={handleConfirm}
          >
            <IconCheck size={16} className="mr-1" />
            Подтвердить
          </Button>
          <Button size="sm" variant="destructive" onClick={handleReject}>
            <IconX size={16} className="mr-1" />
            Отклонить
          </Button>
        </div>
      )}

      {!isPending && block.userInput && (
        <div className="mt-2 text-sm text-muted-foreground">
          Комментарий: {block.userInput}
        </div>
      )}
    </div>
  )
}
