import { LLM } from "@/types"

const COMET_PLATFORM_LINK = "https://api.cometapi.com"

// Comet API Models - актуальные модели из /api/models (январь 2026)

// ========== OpenAI Models ==========
const CometGPT4o: LLM = {
  modelId: "gpt-4o",
  modelName: "GPT-4o (Comet)",
  provider: "comet",
  hostedId: "gpt-4o",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 60,
    outputCost: 60
  }
}

const CometGPT4oMini: LLM = {
  modelId: "gpt-4o-mini",
  modelName: "GPT-4o Mini (Comet)",
  provider: "comet",
  hostedId: "gpt-4o-mini-2024-07-18",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.12,
    outputCost: 0.48
  }
}

const CometGPT4Turbo: LLM = {
  modelId: "gpt-4-turbo",
  modelName: "GPT-4 Turbo (Comet)",
  provider: "comet",
  hostedId: "gpt-4-turbo",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 8,
    outputCost: 24
  }
}

const CometGPT35Turbo: LLM = {
  modelId: "gpt-3.5-turbo",
  modelName: "GPT-3.5 Turbo (Comet)",
  provider: "comet",
  hostedId: "gpt-3.5-turbo",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.4,
    outputCost: 1.2
  }
}

const CometO1: LLM = {
  modelId: "o1",
  modelName: "o1 (Comet)",
  provider: "comet",
  hostedId: "o1",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 12,
    outputCost: 48
  }
}

const CometO1Mini: LLM = {
  modelId: "o1-mini",
  modelName: "o1-mini (Comet)",
  provider: "comet",
  hostedId: "o1-mini",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.88,
    outputCost: 3.52
  }
}

// ========== Anthropic Claude Models ==========
const CometClaude35Sonnet: LLM = {
  modelId: "claude-3-5-sonnet-20241022",
  modelName: "Claude 3.5 Sonnet (Comet)",
  provider: "comet",
  hostedId: "claude-3-5-sonnet-20241022",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 3,
    outputCost: 15
  }
}

const CometClaudeOpus45: LLM = {
  modelId: "claude-opus-4-5-20251101",
  modelName: "Claude Opus 4.5 (Comet)",
  provider: "comet",
  hostedId: "claude-opus-4-5-20251101",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 4,
    outputCost: 20
  }
}

const CometClaudeSonnet45: LLM = {
  modelId: "claude-sonnet-4-5-20250929",
  modelName: "Claude Sonnet 4.5 (Comet)",
  provider: "comet",
  hostedId: "claude-sonnet-4-5-20250929",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 2.4,
    outputCost: 12
  }
}

const CometClaudeHaiku45: LLM = {
  modelId: "claude-haiku-4-5-20251001",
  modelName: "Claude Haiku 4.5 (Comet)",
  provider: "comet",
  hostedId: "claude-haiku-4-5-20251001",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.8,
    outputCost: 4
  }
}

// ========== Google Gemini Models ==========
const CometGemini25Pro: LLM = {
  modelId: "gemini-2.5-pro",
  modelName: "Gemini 2.5 Pro (Comet)",
  provider: "comet",
  hostedId: "gemini-2.5-pro",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 1,
    outputCost: 8
  }
}

const CometGemini25Flash: LLM = {
  modelId: "gemini-2.5-flash",
  modelName: "Gemini 2.5 Flash (Comet)",
  provider: "comet",
  hostedId: "gemini-2.5-flash-preview-09-2025",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.24,
    outputCost: 2
  }
}

const CometGemini25FlashLite: LLM = {
  modelId: "gemini-2.5-flash-lite",
  modelName: "Gemini 2.5 Flash Lite (Comet)",
  provider: "comet",
  hostedId: "gemini-2.5-flash-lite-preview-09-2025",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.08,
    outputCost: 0.32
  }
}

export const COMET_LLM_LIST: LLM[] = [
  // OpenAI models
  CometGPT4o,
  CometGPT4oMini,
  CometGPT4Turbo,
  CometGPT35Turbo,
  CometO1,
  CometO1Mini,
  // Anthropic Claude models
  CometClaude35Sonnet,
  CometClaudeOpus45,
  CometClaudeSonnet45,
  CometClaudeHaiku45,
  // Google Gemini models
  CometGemini25Pro,
  CometGemini25Flash,
  CometGemini25FlashLite
]
