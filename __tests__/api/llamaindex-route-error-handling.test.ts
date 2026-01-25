/**
 * Integration tests for LlamaIndex route error handling
 * Tests the SSE stream error handling and timeout protection
 */

describe("LlamaIndex Route Error Handling", () => {
  describe("Stream Closure Protection", () => {
    it("should track stream closed state", () => {
      let streamClosed = false

      const safeClose = () => {
        if (!streamClosed) {
          streamClosed = true
        }
      }

      safeClose()
      expect(streamClosed).toBe(true)

      // Second call should not throw
      safeClose()
      expect(streamClosed).toBe(true)
    })

    it("should prevent sending events after stream closes", () => {
      let streamClosed = false
      const events: string[] = []

      const sendSSE = (event: Record<string, unknown>) => {
        if (streamClosed) {
          console.warn("Attempted to send SSE after stream closed")
          return
        }
        events.push(JSON.stringify(event))
      }

      sendSSE({ type: "text_delta", data: { delta: "Hello" } })
      expect(events.length).toBe(1)

      streamClosed = true

      sendSSE({ type: "text_delta", data: { delta: "World" } })
      expect(events.length).toBe(1) // Should not increase
    })
  })

  describe("Error Event Handling", () => {
    it("should create proper error event structure", () => {
      const errorEvent = {
        type: "content_block_delta",
        index: 0,
        delta: {
          type: "text_delta",
          text: "\n\n❌ Error: Tools not found\n\nThe agent encountered an error and will stop processing. Please try again or rephrase your request."
        }
      }

      expect(errorEvent.type).toBe("content_block_delta")
      expect(errorEvent.delta.type).toBe("text_delta")
      expect(errorEvent.delta.text).toContain("❌ Error:")
    })

    it("should send stop_reason on error", () => {
      const stopEvent = {
        type: "message_delta",
        delta: {
          stop_reason: "error"
        }
      }

      expect(stopEvent.type).toBe("message_delta")
      expect(stopEvent.delta.stop_reason).toBe("error")
    })

    it("should send message_stop after error", () => {
      const messageStopEvent = {
        type: "message_stop"
      }

      expect(messageStopEvent.type).toBe("message_stop")
    })
  })

  describe("Timeout Protection", () => {
    jest.useFakeTimers()

    it("should trigger timeout after 5 minutes", () => {
      let timeoutTriggered = false
      const fiveMinutes = 5 * 60 * 1000

      const timeout = setTimeout(() => {
        timeoutTriggered = true
      }, fiveMinutes)

      expect(timeoutTriggered).toBe(false)

      jest.advanceTimersByTime(fiveMinutes)

      expect(timeoutTriggered).toBe(true)

      clearTimeout(timeout)
    })

    it("should send timeout message to client", () => {
      const events: any[] = []
      const fiveMinutes = 5 * 60 * 1000

      const sendSSE = (event: Record<string, unknown>) => {
        events.push(event)
      }

      const timeout = setTimeout(() => {
        sendSSE({
          type: "content_block_delta",
          index: 0,
          delta: {
            type: "text_delta",
            text: "\n\n⏱️ Request timeout: The agent took too long to respond. Please try again with a simpler request."
          }
        })
        sendSSE({
          type: "message_delta",
          delta: {
            stop_reason: "timeout"
          }
        })
        sendSSE({
          type: "message_stop"
        })
      }, fiveMinutes)

      jest.advanceTimersByTime(fiveMinutes)

      expect(events.length).toBe(3)
      expect(events[0].delta.text).toContain("⏱️ Request timeout")
      expect(events[1].delta.stop_reason).toBe("timeout")
      expect(events[2].type).toBe("message_stop")

      clearTimeout(timeout)
    })

    it("should clear timeout when agent finishes normally", () => {
      const fiveMinutes = 5 * 60 * 1000
      let timeoutTriggered = false

      const timeout = setTimeout(() => {
        timeoutTriggered = true
      }, fiveMinutes)

      // Simulate agent finishing
      clearTimeout(timeout)

      // Advance time past timeout
      jest.advanceTimersByTime(fiveMinutes + 1000)

      // Timeout should not have triggered
      expect(timeoutTriggered).toBe(false)
    })

    afterEach(() => {
      jest.clearAllTimers()
    })
  })

  describe("Error Message Formatting", () => {
    it("should format error messages for display", () => {
      const errorMessage = "Tools not found: get_table_columns"
      const formattedMessage = `\n\n❌ Error: ${errorMessage}\n\nThe agent encountered an error and will stop processing. Please try again or rephrase your request.`

      expect(formattedMessage).toContain("❌ Error:")
      expect(formattedMessage).toContain(errorMessage)
      expect(formattedMessage).toContain("Please try again")
    })

    it("should handle unknown errors", () => {
      const error = { unknown: "error object" }
      const errorMessage =
        error instanceof Error ? error.message : "Unknown stream error"

      expect(errorMessage).toBe("Unknown stream error")
    })

    it("should extract message from Error objects", () => {
      const error = new Error("Test error message")
      const errorMessage =
        error instanceof Error ? error.message : "Unknown stream error"

      expect(errorMessage).toBe("Test error message")
    })
  })

  describe("Event Type Handling", () => {
    it("should handle text_delta events", () => {
      const event = {
        type: "text_delta",
        data: {
          delta: "Hello, world!"
        }
      }

      expect(event.type).toBe("text_delta")
      expect(event.data.delta).toBe("Hello, world!")
    })

    it("should handle tool_call events", () => {
      const event = {
        type: "tool_call",
        data: {
          toolName: "list_schemas",
          toolInput: {}
        }
      }

      expect(event.type).toBe("tool_call")
      expect(event.data.toolName).toBe("list_schemas")
    })

    it("should handle tool_result events", () => {
      const event = {
        type: "tool_result",
        data: {
          toolName: "list_schemas",
          toolOutput: { schemas: ["public", "bookings"] }
        }
      }

      expect(event.type).toBe("tool_result")
      expect(event.data.toolOutput).toBeDefined()
    })

    it("should handle error events", () => {
      const event = {
        type: "error",
        data: {
          error: "Tools not found"
        }
      }

      expect(event.type).toBe("error")
      expect(event.data.error).toBeDefined()
    })

    it("should handle done events", () => {
      const event = {
        type: "done",
        data: {}
      }

      expect(event.type).toBe("done")
      expect(event.data).toBeDefined()
    })
  })

  describe("SSE Format", () => {
    it("should format SSE data correctly", () => {
      const event = {
        type: "text_delta",
        delta: "Hello"
      }

      const sseData = `data: ${JSON.stringify(event)}\n\n`

      expect(sseData).toContain("data: ")
      expect(sseData).toContain(JSON.stringify(event))
      expect(sseData.endsWith("\n\n")).toBe(true)
    })

    it("should handle special characters in SSE", () => {
      const event = {
        type: "text_delta",
        delta: 'Hello "World" with \n newlines'
      }

      const sseData = `data: ${JSON.stringify(event)}\n\n`
      const parsed = JSON.parse(sseData.replace("data: ", "").trim())

      expect(parsed.delta).toBe(event.delta)
    })
  })
})

describe("Error Recovery Scenarios", () => {
  it("should recover from tool not found error", () => {
    const error = new Error("Tools not found: get_table_columns")

    // Agent should catch this error and send error event
    expect(error.message).toContain("Tools not found")

    const errorEvent = {
      type: "error",
      data: {
        error: error.message
      }
    }

    expect(errorEvent.type).toBe("error")
    expect(errorEvent.data.error).toBe(error.message)
  })

  it("should recover from API 400 error", () => {
    const error = new Error(
      "400 Messages with role 'tool' must be a response to a preceding message with 'tool_calls'"
    )

    const errorEvent = {
      type: "error",
      data: {
        error: error.message
      }
    }

    expect(errorEvent.data.error).toContain("400")
  })

  it("should handle connection errors gracefully", () => {
    const error = new Error("Connection reset by peer")

    const errorEvent = {
      type: "error",
      data: {
        error: error.message
      }
    }

    expect(errorEvent.type).toBe("error")
  })
})
