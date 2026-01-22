import { LLM } from "@/types"

const DEEPSEEK_PLATFORM_LINK = "https://api.deepseek.com"

// DeepSeek Models - based on official API documentation
// Base URL: https://api.deepseek.com
// Context Length: 128K

// DeepSeek-V3.2 (Non-thinking Mode) - deepseek-chat
const DeepSeekChat: LLM = {
  modelId: "deepseek-chat",
  modelName: "DeepSeek-V3.2 (Chat)",
  provider: "deepseek",
  hostedId: "deepseek-chat",
  platformLink: DEEPSEEK_PLATFORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.28, // Cache miss price
    outputCost: 0.42
  }
}

// DeepSeek-V3.2 (Thinking Mode) - deepseek-reasoner
const DeepSeekReasoner: LLM = {
  modelId: "deepseek-reasoner",
  modelName: "DeepSeek-V3.2 (Reasoner)",
  provider: "deepseek",
  hostedId: "deepseek-reasoner",
  platformLink: DEEPSEEK_PLATFORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.28, // Cache miss price
    outputCost: 0.42
  }
}

export const DEEPSEEK_LLM_LIST: LLM[] = [DeepSeekChat, DeepSeekReasoner]
