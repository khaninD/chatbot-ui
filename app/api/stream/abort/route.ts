import { ServerRuntime } from "next"

export const runtime: ServerRuntime = "nodejs"

interface AbortRequestBody {
  sessionId: string
}

export async function POST(request: Request) {
  try {
    const json = (await request.json()) as AbortRequestBody
    const { sessionId } = json

    if (!sessionId) {
      return new Response("Missing sessionId", { status: 400 })
    }

    const agentServerUrl = process.env.AGENT_SERVER_URL || ""

    if (!agentServerUrl) {
      return new Response("Missing agent server URL", { status: 500 })
    }

    const response = await fetch(
      `${agentServerUrl.replace(/\/$/, "")}/api/stream/abort`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sessionId })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return new Response(errorText || "Agent server abort error", {
        status: response.status
      })
    }

    const data = await response.text()
    return new Response(data, {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("[AbortProxy] Error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return new Response(message, { status: 500 })
  }
}
