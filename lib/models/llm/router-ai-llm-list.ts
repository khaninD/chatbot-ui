import { LLM } from "@/types"

const ROUTER_AI_PLATFORM_LINK = "https://routerai.ru"

// Router AI Models - актуальные модели (январь 2026)

// ========== DeepSeek Models ==========
const RouterAIDeepSeekV32: LLM = {
  modelId: "routerai-deepseek-v3.2",
  modelName: "DeepSeek V3.2 (Router AI)",
  provider: "routerai",
  hostedId: "deepseek/deepseek-v3.2",
  platformLink: ROUTER_AI_PLATFORM_LINK,
  imageInput: false
}

const RouterAIDeepSeekChatV31: LLM = {
  modelId: "routerai-deepseek-chat-v3.1",
  modelName: "DeepSeek Chat V3.1 (Router AI)",
  provider: "routerai",
  hostedId: "deepseek/deepseek-chat-v3.1",
  platformLink: ROUTER_AI_PLATFORM_LINK,
  imageInput: false
}

// ========== OpenAI GPT-5.2 ==========
const RouterAIGPT52: LLM = {
  modelId: "routerai-gpt-5.2",
  modelName: "GPT-5.2 (Router AI)",
  provider: "routerai",
  hostedId: "openai/gpt-5.2",
  platformLink: ROUTER_AI_PLATFORM_LINK,
  imageInput: true
}

// ========== Google Gemini 3 ==========
const RouterAIGemini3Pro: LLM = {
  modelId: "routerai-gemini-3-pro-preview",
  modelName: "Gemini 3 Pro Preview (Router AI)",
  provider: "routerai",
  hostedId: "google/gemini-3-pro-preview",
  platformLink: ROUTER_AI_PLATFORM_LINK,
  imageInput: true
}

// ========== Anthropic Claude Sonnet 4.5 ==========
const RouterAIClaudeSonnet45: LLM = {
  modelId: "routerai-claude-sonnet-4.5",
  modelName: "Claude Sonnet 4.5 (Router AI)",
  provider: "routerai",
  hostedId: "anthropic/claude-sonnet-4.5",
  platformLink: ROUTER_AI_PLATFORM_LINK,
  imageInput: true
}

// ========== xAI Grok 4 ==========
const RouterAIGrok4: LLM = {
  modelId: "routerai-grok-4",
  modelName: "Grok 4 (Router AI)",
  provider: "routerai",
  hostedId: "x-ai/grok-4",
  platformLink: ROUTER_AI_PLATFORM_LINK,
  imageInput: true
}

export const ROUTER_AI_LLM_LIST: LLM[] = [
  // DeepSeek models
  RouterAIDeepSeekV32,
  RouterAIDeepSeekChatV31,
  // OpenAI GPT-5.2
  RouterAIGPT52,
  // Google Gemini 3
  RouterAIGemini3Pro,
  // Anthropic Claude
  RouterAIClaudeSonnet45,
  // xAI Grok
  RouterAIGrok4
]
