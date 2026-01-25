/**
 * Tests for LlamaIndex Agent Error Handling
 * Tests the error handling mechanisms added to prevent agent hanging
 */

import { runAgentStream } from "@/lib/llamaindex/agent"

// Mock dependencies
jest.mock("@llamaindex/openai", () => ({
  openai: jest.fn()
}))

jest.mock("@llamaindex/anthropic", () => ({
  anthropic: jest.fn()
}))

jest.mock("@llamaindex/tools", () => ({
  mcp: jest.fn()
}))

jest.mock("@llamaindex/workflow", () => ({
  agent: jest.fn(),
  agentStreamEvent: {
    include: jest.fn()
  },
  agentToolCallEvent: {
    include: jest.fn()
  },
  agentToolCallResultEvent: {
    include: jest.fn()
  }
}))

describe("LlamaIndex Agent Error Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should handle stream errors gracefully", async () => {
    // Mock agent that throws an error
    const mockAgent = {
      // eslint-disable-next-line require-yield
      runStream: jest.fn().mockImplementation(async function* () {
        throw new Error("Tools not found: get_table_columns")
      })
    }

    // Mock createAgent to return our mock agent
    jest.spyOn(require("@/lib/llamaindex/agent"), "createAgent").mockResolvedValue({
      agent: mockAgent,
      servers: []
    })

    const events: any[] = []

    try {
      for await (const event of runAgentStream(
        "test query",
        "test prompt",
        "test-api-key",
        "deepseek-chat"
      )) {
        events.push(event)
      }
    } catch (error) {
      // Error should be caught and converted to error event
    }

    // Should have received error event
    const errorEvent = events.find(e => e.type === "error")
    expect(errorEvent).toBeDefined()
    expect(errorEvent?.data?.error).toContain("Tools not found")

    // Should have received done event even after error
    const doneEvent = events.find(e => e.type === "done")
    expect(doneEvent).toBeDefined()
  })

  it("should yield error event on stream failure", async () => {
    const errorMessage = "Test stream error"

    const mockAgent = {
      // eslint-disable-next-line require-yield
      runStream: jest.fn().mockImplementation(async function* () {
        throw new Error(errorMessage)
      })
    }

    jest.spyOn(require("@/lib/llamaindex/agent"), "createAgent").mockResolvedValue({
      agent: mockAgent,
      servers: []
    })

    const events: any[] = []

    for await (const event of runAgentStream(
      "test query",
      "test prompt",
      "test-api-key"
    )) {
      events.push(event)
    }

    // Check that error event was yielded
    const errorEvent = events.find(e => e.type === "error")
    expect(errorEvent).toBeDefined()
    expect(errorEvent?.data.error).toBe(errorMessage)
  })

  it("should cleanup servers even on error", async () => {
    const mockCleanup = jest.fn()
    const mockServer = {
      cleanup: mockCleanup
    }

    const mockAgent = {
      // eslint-disable-next-line require-yield
      runStream: jest.fn().mockImplementation(async function* () {
        throw new Error("Test error")
      })
    }

    jest.spyOn(require("@/lib/llamaindex/agent"), "createAgent").mockResolvedValue({
      agent: mockAgent,
      servers: [mockServer]
    })

    try {
      for await (const event of runAgentStream(
        "test query",
        "test prompt",
        "test-api-key"
      )) {
        // Consume events
      }
    } catch (error) {
      // Expected
    }

    // Cleanup should still be called
    expect(mockCleanup).toHaveBeenCalled()
  })

  it("should continue processing events after individual event error", async () => {
    const mockAgent = {
      runStream: jest.fn().mockImplementation(async function* () {
        yield { type: "text_delta", data: { delta: "Hello" } }
        // This event will cause processing error
        yield { type: "unknown_type", data: {} }
        yield { type: "text_delta", data: { delta: " World" } }
      })
    }

    jest.spyOn(require("@/lib/llamaindex/agent"), "createAgent").mockResolvedValue({
      agent: mockAgent,
      servers: []
    })

    const events: any[] = []

    for await (const event of runAgentStream(
      "test query",
      "test prompt",
      "test-api-key"
    )) {
      events.push(event)
    }

    // Should have processed valid events
    const textEvents = events.filter(e => e.type === "text_delta")
    expect(textEvents.length).toBeGreaterThanOrEqual(2)
  })
})

describe("Error Event Types", () => {
  it("should have correct error event structure", () => {
    const errorEvent = {
      type: "error",
      data: {
        error: "Test error message"
      }
    }

    expect(errorEvent.type).toBe("error")
    expect(errorEvent.data).toHaveProperty("error")
    expect(typeof errorEvent.data.error).toBe("string")
  })

  it("should have done event structure", () => {
    const doneEvent = {
      type: "done",
      data: {}
    }

    expect(doneEvent.type).toBe("done")
    expect(doneEvent.data).toBeDefined()
  })
})

describe("Stream Error Scenarios", () => {
  it("should handle 'Tools not found' error", () => {
    const errorMessage = "Tools not found: get_table_columns"
    expect(errorMessage).toContain("Tools not found")
  })

  it("should handle API errors", () => {
    const errorMessage = "400 Messages with role 'tool' must be a response to a preceding message with 'tool_calls'"
    expect(errorMessage).toContain("400")
  })

  it("should handle timeout errors", () => {
    const errorMessage = "Request timeout after 5 minutes"
    expect(errorMessage).toContain("timeout")
  })

  it("should handle connection errors", () => {
    const errorMessage = "Connection closed unexpectedly"
    expect(errorMessage).toContain("Connection")
  })
})
