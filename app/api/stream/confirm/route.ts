import { ServerRuntime } from "next"

export const runtime: ServerRuntime = "nodejs"

interface ConfirmRequestBody {
  confirmationId: string
  confirmed: boolean
  userInput?: string
}

export async function POST(request: Request) {
  try {
    const json = (await request.json()) as ConfirmRequestBody
    const { confirmationId, confirmed, userInput } = json

    if (!confirmationId || confirmed === undefined) {
      return new Response("Missing confirmationId or confirmed", {
        status: 400
      })
    }

    const agentServerUrl = process.env.AGENT_SERVER_URL || ""

    if (!agentServerUrl) {
      return new Response("Missing agent server URL", { status: 500 })
    }

    const response = await fetch(
      `${agentServerUrl.replace(/\/$/, "")}/api/stream/confirm`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ confirmationId, confirmed, userInput })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return new Response(errorText || "Agent server confirm error", {
        status: response.status
      })
    }

    const data = await response.text()
    return new Response(data, {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("[ConfirmProxy] Error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return new Response(message, { status: 500 })
  }
}
