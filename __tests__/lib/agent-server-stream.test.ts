import { parseAgentServerSseBuffer } from "@/lib/agent-server/stream"

describe("parseAgentServerSseBuffer", () => {
  it("parses complete SSE events and clears remainder", () => {
    const chunk =
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hi"}}\n\n'

    const result = parseAgentServerSseBuffer(chunk)

    expect(result.events).toHaveLength(1)
    expect(result.remainder).toBe("")
    expect(result.events[0].type).toBe("content_block_delta")
  })

  it("keeps remainder for incomplete events", () => {
    const chunk =
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hi"}}\n\ndata: {"type":"message_stop"}'

    const result = parseAgentServerSseBuffer(chunk)

    expect(result.events).toHaveLength(1)
    expect(result.events[0].type).toBe("content_block_delta")
    expect(result.remainder).toContain('data: {"type":"message_stop"}')
  })

  it("ignores invalid JSON payloads", () => {
    const chunk = "data: {invalid}\n\n"
    const result = parseAgentServerSseBuffer(chunk)

    expect(result.events).toHaveLength(0)
  })
})
