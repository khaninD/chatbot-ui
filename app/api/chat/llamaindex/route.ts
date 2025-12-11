import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { StreamingTextResponse } from "ai"
import { ServerRuntime } from "next"

export const runtime: ServerRuntime = "edge"

// Импортируем функцию для создания агента
async function createLlamaIndexAgent(messages: any[], systemPrompt: string) {
  // Динамический импорт для Edge Runtime совместимости
  const { openai } = await import("@llamaindex/openai")
  const { mcp } = await import("@llamaindex/tools")
  const { agent } = await import("@llamaindex/workflow")

  // Создаем MCP сервер
  const server = mcp({
    command: "node",
    args: ["D:\\LlamaIndexTS\\examples\\dist\\server.bundle.js"],
    verbose: false
  })

  try {
    const tools = await server.tools()

    // Получаем промпт с сервера
    const promptResult = await server.getPrompt("json_response_required")

    // Извлекаем текст промпта из сообщений
    const serverPrompt = promptResult.messages
      .map((msg: any) => {
        if (msg.content.type === "text") {
          return msg.content.text
        }
        return ""
      })
      .join("\n")

    // Дополнительные инструкции для агента
    const additionalInstructions = `
Ты - SQL аналитик. Используй инструменты для выполнения запросов к базе данных.

Инструменты которые у тебя есть:
- execute_sql - для выполнения SQL SELECT запросов
- get_table_schema - для получения структуры таблицы
- list_tables - для получения списка таблиц

ВАЖНЫЕ ИНСТРУКЦИИ:
1. Сначала используй list_tables чтобы узнать какие таблицы есть в базе
2. Затем используй get_table_schema чтобы изучить структуру таблиц
3. Только после этого формируй SQL запрос и используй execute_sql
4. Не пытайся отвечать без использования инструментов
`

    const finalSystemPrompt = `${additionalInstructions}\n\n${serverPrompt}\n\n${systemPrompt}`

    // Создаем LLM
    const baseLLM = openai({ model: "gpt-4o" })

    // Создаем агента
    const myAgent = agent({
      name: "SQL Assistant",
      systemPrompt: finalSystemPrompt,
      tools,
      llm: baseLLM,
      verbose: false
    })

    return { agent: myAgent, server }
  } catch (error) {
    await server.cleanup()
    throw error
  }
}

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: any[]
  }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.openai_api_key, "OpenAI")

    // Извлекаем последнее сообщение пользователя
    const lastMessage = messages[messages.length - 1]
    const userQuery =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : lastMessage.content[0]?.text || ""

    // Извлекаем системный промпт из сообщений
    const systemMessage = messages.find((msg: any) => msg.role === "system")
    const systemPrompt = systemMessage?.content || ""

    // Устанавливаем переменную окружения для OpenAI API ключа
    process.env.OPENAI_API_KEY = profile.openai_api_key || ""

    // Создаем агента
    const { agent: myAgent, server } = await createLlamaIndexAgent(
      messages,
      systemPrompt
    )

    try {
      // Запускаем агента
      const response = await myAgent.run(userQuery)

      // Cleanup MCP сервера
      await server.cleanup()

      // Получаем результат
      let result = response.data.result

      // Парсим JSON если результат в строковом формате
      try {
        if (typeof result === "string") {
          const jsonResult = JSON.parse(result)
          result = JSON.stringify(jsonResult, null, 2)
        }
      } catch (e) {
        // Результат не JSON, оставляем как есть
      }

      // Создаем ReadableStream для streaming ответа
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(result))
          controller.close()
        }
      })

      return new StreamingTextResponse(stream)
    } catch (agentError) {
      await server.cleanup()
      throw agentError
    }
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "OpenAI API Key not found. Please set it in your profile settings."
    } else if (errorMessage.toLowerCase().includes("incorrect api key")) {
      errorMessage =
        "OpenAI API Key is incorrect. Please fix it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
