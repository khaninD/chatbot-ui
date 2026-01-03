import { openapiToFunctions } from "@/lib/openapi-conversion"
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { Tables } from "@/supabase/types"
import { ChatSettings } from "@/types"
import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import OpenAI from "openai"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages, selectedTools } = json as {
    chatSettings: ChatSettings
    messages: any[]
    selectedTools: Tables<"tools">[]
  }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.openai_api_key, "OpenAI")

    const openaiClient = new OpenAI({
      apiKey: profile.openai_api_key || "",
      organization: profile.openai_organization_id
    })

    let allTools: OpenAI.Chat.Completions.ChatCompletionTool[] = []
    let allRouteMaps = {}
    const schemaDetails = []

    for (const selectedTool of selectedTools) {
      try {
        const convertedSchema = await openapiToFunctions(
          JSON.parse(selectedTool.schema as string)
        )
        const tools = convertedSchema.functions || []
        allTools = allTools.concat(tools)

        const routeMap = convertedSchema.routes.reduce(
          (map: Record<string, string>, route) => {
            map[route.path.replace(/{(\w+)}/g, ":$1")] = route.operationId
            return map
          },
          {}
        )

        allRouteMaps = { ...allRouteMaps, ...routeMap }

        schemaDetails.push({
          title: convertedSchema.info.title,
          description: convertedSchema.info.description,
          url: convertedSchema.info.server,
          headers: selectedTool.custom_headers,
          routeMap,
          requestInBody: convertedSchema.routes[0].requestInBody
        })
      } catch (error: any) {
        console.error("Error converting schema", error)
      }
    }

    console.log("=== TOOLS DEBUG ===")
    console.log("allTools:", JSON.stringify(allTools, null, 2))
    console.log("schemaDetails:", JSON.stringify(schemaDetails, null, 2))

    try {
      const firstResponse = await openaiClient.chat.completions.create({
        model: chatSettings.model,
        messages,
        tools: allTools.length > 0 ? allTools : undefined
      })
      console.log("firstResponse", firstResponse)
      const message = firstResponse.choices[0].message
      messages.push(message)
      const toolCalls = message.tool_calls || []

      console.log("=== RESPONSE DEBUG ===")
      console.log("toolCalls:", JSON.stringify(toolCalls, null, 2))
      console.log("message.content:", message.content)

      if (toolCalls.length === 0) {
        console.log("No tool calls, returning direct response")
        return new Response(message.content, {
          headers: {
            "Content-Type": "application/json"
          }
        })
      }

      if (toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          if (toolCall.type !== "function") continue

          const functionCall = toolCall.function
          const functionName = functionCall.name
          const argumentsString = toolCall.function.arguments.trim()
          const parsedArgs = JSON.parse(argumentsString)
          console.log("argumentsString", argumentsString)
          console.log("=== EXECUTING TOOL ===")
          console.log("functionName:", functionName)
          console.log("parsedArgs:", JSON.stringify(parsedArgs, null, 2))

          // Find the schema detail that contains the function name
          const schemaDetail = schemaDetails.find(detail =>
            Object.values(detail.routeMap).includes(functionName)
          )

          if (!schemaDetail) {
            throw new Error(`Function ${functionName} not found in any schema`)
          }

          const pathTemplate = Object.keys(schemaDetail.routeMap).find(
            key => schemaDetail.routeMap[key] === functionName
          )

          if (!pathTemplate) {
            throw new Error(`Path for function ${functionName} not found`)
          }

          const path = pathTemplate.replace(/:(\w+)/g, (_, paramName) => {
            const value = parsedArgs.parameters[paramName]
            if (!value) {
              throw new Error(
                `Parameter ${paramName} not found for function ${functionName}`
              )
            }
            return encodeURIComponent(value)
          })

          if (!path) {
            throw new Error(`Path for function ${functionName} not found`)
          }

          // Determine if the request should be in the body or as a query
          const isRequestInBody = schemaDetail.requestInBody
          let data = {}

          if (isRequestInBody) {
            // If the type is set to body
            let headers = {
              "Content-Type": "application/json"
            }

            // Check if custom headers are set
            const customHeaders = schemaDetail.headers // Moved this line up to the loop
            // Check if custom headers are set and are of type string
            if (customHeaders && typeof customHeaders === "string") {
              const parsedCustomHeaders = JSON.parse(customHeaders) as Record<
                string,
                string
              >

              headers = {
                ...headers,
                ...parsedCustomHeaders
              }
            }

            const fullUrl = schemaDetail.url + path

            const bodyContent = parsedArgs.requestBody || parsedArgs

            const requestInit = {
              method: "POST",
              headers,
              body: JSON.stringify(bodyContent) // Use the extracted requestBody or the entire parsedArgs
            }
            console.log("TOOL FULL URL", fullUrl, requestInit)
            const response = await fetch(fullUrl, requestInit)

            if (!response.ok) {
              data = {
                error: response.statusText
              }
            } else {
              data = await response.json()
            }
          } else {
            console.log("parsedArgs.parameters", parsedArgs.parameters)
            // If the type is set to query
            const queryParams = new URLSearchParams(
              parsedArgs.parameters
            ).toString()
            const fullUrl =
              schemaDetail.url + path + (queryParams ? "?" + queryParams : "")

            let headers = {}

            // Check if custom headers are set
            const customHeaders = schemaDetail.headers
            if (customHeaders && typeof customHeaders === "string") {
              headers = JSON.parse(customHeaders)
            }

            console.log("=== GET REQUEST ===")
            console.log("URL:", fullUrl)
            console.log("Headers:", JSON.stringify(headers, null, 2))

            const response = await fetch(fullUrl, {
              method: "GET",
              headers: headers
            })

            console.log("Response status:", response.status)

            if (!response.ok) {
              const errorText = await response.text()
              console.log("Error response:", errorText)
              data = {
                error: response.statusText,
                details: errorText
              }
            } else {
              data = await response.json()
              console.log("Success response:", JSON.stringify(data, null, 2))
            }
          }

          messages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: functionName,
            content: JSON.stringify(data)
          })
        }
      }
    } catch (error: any) {
      console.error("Error first tool response", error)
    }

    console.log("=== FINAL MESSAGES ===")
    console.log("messages:", JSON.stringify(messages, null, 2))

    // Use native OpenAI API instead of AI SDK to avoid validation issues
    const secondResponse = await openaiClient.chat.completions.create({
      model: chatSettings.model,
      messages: messages as any
    })

    const finalMessage = secondResponse.choices[0].message
    console.log("=== FINAL RESPONSE ===")
    console.log("finalMessage.content:", finalMessage.content)

    return new Response(finalMessage.content, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    })
  } catch (error: any) {
    console.error(error)
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
