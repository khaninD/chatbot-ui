import { callConfirmResolver } from "@/lib/confirm-resolvers"
import { PlanContentBlock } from "@/types/content-blocks"
import {
  IconCircleCheck,
  IconCircleDashed,
  IconListCheck,
  IconLoader2,
  IconCheck,
  IconX
} from "@tabler/icons-react"
import React, { FC, useState } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"

interface PlanBlockProps {
  block: PlanContentBlock
}

export const PlanBlock: FC<PlanBlockProps> = ({ block }) => {
  const [userInput, setUserInput] = useState("")

  const isPending = block.status === "pending"

  const handleConfirm = () => {
    callConfirmResolver(block.planId, {
      confirmed: true,
      userInput: userInput || undefined
    })
  }

  const handleReject = () => {
    callConfirmResolver(block.planId, {
      confirmed: false,
      userInput: userInput || undefined
    })
  }

  return (
    <div className="my-2 rounded-lg border border-blue-500/50 bg-secondary p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <IconListCheck size={18} className="text-blue-500" />
          <span className="font-semibold">План выполнения</span>
          {!isPending && (
            <span
              className={`ml-2 rounded px-2 py-0.5 text-xs font-medium ${
                block.status === "confirmed"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {block.status === "confirmed" ? "Подтверждён" : "Отклонён"}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {block.steps.map((step, index) => (
          <div key={index} className="flex items-start space-x-2">
            <div className="mt-0.5 shrink-0">
              {step.status === "completed" ? (
                <IconCircleCheck size={18} className="text-green-500" />
              ) : step.status === "in_progress" ? (
                <IconLoader2 size={18} className="animate-spin text-blue-500" />
              ) : (
                <IconCircleDashed size={18} className="text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="text-sm">{step.title}</div>
              {step.description && (
                <div className="text-xs text-muted-foreground">
                  {step.description}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

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
