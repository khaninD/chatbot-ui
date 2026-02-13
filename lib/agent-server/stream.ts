import { AgentServerStreamEvent } from "@/types/agent-server"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const hasString = (
  record: Record<string, unknown>,
  key: string
): record is Record<string, string> => typeof record[key] === "string"

export const isAgentServerStreamEvent = (
  value: unknown
): value is AgentServerStreamEvent => {
  if (!isRecord(value) || !hasString(value, "type")) {
    return false
  }

  switch (value.type) {
    case "content_block_start":
    case "content_block_delta":
    case "content_block_stop":
    case "message_delta":
    case "message_stop":
      return true
    default:
      return false
  }
}

export const parseAgentServerSseBuffer = (
  buffer: string
): { events: AgentServerStreamEvent[]; remainder: string } => {
  const parts = buffer.split("\n\n")
  const remainder = parts.pop() ?? ""
  const events: AgentServerStreamEvent[] = []

  for (const part of parts) {
    const lines = part.split("\n")
    for (const line of lines) {
      if (!line.startsWith("data: ")) {
        continue
      }

      const jsonStr = line.slice(6)
      if (!jsonStr.trim()) {
        continue
      }

      try {
        const parsed = JSON.parse(jsonStr) as unknown
        if (isAgentServerStreamEvent(parsed)) {
          events.push(parsed)
        }
      } catch (error) {
        console.warn("[AgentServer] Failed to parse SSE event:", error)
      }
    }
  }

  return { events, remainder }
}
