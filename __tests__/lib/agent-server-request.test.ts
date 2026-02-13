import { buildAgentServerStreamRequest } from "@/lib/agent-server/request"

describe("buildAgentServerStreamRequest", () => {
  it("builds a payload without chat history", () => {
    const request = buildAgentServerStreamRequest({
      sessionId: "chat-123",
      query: "Hello",
      systemPrompt: "System prompt",
      mcpUrls: ["https://mcp.example.com"],
      llmConfig: {
        provider: "openai",
        apiKey: "key",
        model: "gpt-4o"
      }
    })

    expect(request.sessionId).toBe("chat-123")
    expect(request.query).toBe("Hello")
    expect(request.llmConfig.model).toBe("gpt-4o")
    expect("chatHistory" in request).toBe(false)
  })
})
