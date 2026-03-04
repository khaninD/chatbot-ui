export async function consumeReadableStream(
  stream: ReadableStream<Uint8Array>,
  callback: (chunk: string) => void | Promise<void>,
  signal: AbortSignal
): Promise<void> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()

  signal.addEventListener("abort", () => reader.cancel(), { once: true })

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      if (value) {
        const result = callback(decoder.decode(value, { stream: true }))
        if (result && typeof result.then === "function") {
          await result
        }
      }
    }
  } catch (error) {
    if (signal.aborted) {
      console.error("Stream reading was aborted:", error)
    } else {
      console.error("Error consuming stream:", error)
    }
  } finally {
    reader.releaseLock()
  }
}
