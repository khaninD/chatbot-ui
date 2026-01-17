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

// ========== GPT-5 Models ==========
const CometGPT5: LLM = {
  modelId: "gpt-5",
  modelName: "GPT-5 (Comet)",
  provider: "comet",
  hostedId: "gpt-5",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 1,
    outputCost: 8
  }
}

const CometGPT5Chat: LLM = {
  modelId: "gpt-5-chat-latest",
  modelName: "GPT-5 Chat (Comet)",
  provider: "comet",
  hostedId: "gpt-5-chat-latest",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 1,
    outputCost: 8
  }
}

const CometGPT5Mini: LLM = {
  modelId: "gpt-5-mini",
  modelName: "GPT-5 Mini (Comet)",
  provider: "comet",
  hostedId: "gpt-5-mini",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.2,
    outputCost: 1.6
  }
}

const CometGPT5Nano: LLM = {
  modelId: "gpt-5-nano",
  modelName: "GPT-5 Nano (Comet)",
  provider: "comet",
  hostedId: "gpt-5-nano",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.04,
    outputCost: 0.32
  }
}

const CometGPT5Codex: LLM = {
  modelId: "gpt-5-codex",
  modelName: "GPT-5 Codex (Comet)",
  provider: "comet",
  hostedId: "gpt-5-codex",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 1,
    outputCost: 8
  }
}

// ========== GPT-5.1 Models ==========
const CometGPT51: LLM = {
  modelId: "gpt-5.1",
  modelName: "GPT-5.1 (Comet)",
  provider: "comet",
  hostedId: "gpt-5.1",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 1,
    outputCost: 8
  }
}

const CometGPT51Chat: LLM = {
  modelId: "gpt-5.1-chat-latest",
  modelName: "GPT-5.1 Chat (Comet)",
  provider: "comet",
  hostedId: "gpt-5.1-chat-latest",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 1,
    outputCost: 8
  }
}

const CometGPT51Codex: LLM = {
  modelId: "gpt-5.1-codex",
  modelName: "GPT-5.1 Codex (Comet)",
  provider: "comet",
  hostedId: "gpt-5.1-codex",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 1,
    outputCost: 8
  }
}

const CometGPT51CodexMax: LLM = {
  modelId: "gpt-5.1-codex-max",
  modelName: "GPT-5.1 Codex Max (Comet)",
  provider: "comet",
  hostedId: "gpt-5.1-codex-max",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 1,
    outputCost: 8
  }
}

// ========== GPT-5.2 Models ==========
const CometGPT52: LLM = {
  modelId: "gpt-5.2",
  modelName: "GPT-5.2 (Comet)",
  provider: "comet",
  hostedId: "gpt-5.2",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 1.4,
    outputCost: 11.2
  }
}

const CometGPT52Chat: LLM = {
  modelId: "gpt-5.2-chat-latest",
  modelName: "GPT-5.2 Chat (Comet)",
  provider: "comet",
  hostedId: "gpt-5.2-chat-latest",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 1.4,
    outputCost: 11.2
  }
}

const CometGPT52Pro: LLM = {
  modelId: "gpt-5.2-pro",
  modelName: "GPT-5.2 Pro (Comet)",
  provider: "comet",
  hostedId: "gpt-5.2-pro",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 16.8,
    outputCost: 134.4
  }
}

// NOTE: GPT Image 1.5 is a specialized image generation model
// It's used only as a tool in the LlamaIndex agent, not as a chat model
// See lib/llamaindex/tools/image-generation-tool.ts

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

// ========== DeepSeek Models ==========
const CometDeepSeekV3: LLM = {
  modelId: "deepseek-v3",
  modelName: "DeepSeek-V3 (Comet)",
  provider: "comet",
  hostedId: "deepseek-v3",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.216,
    outputCost: 0.88
  }
}

const CometDeepSeekV31: LLM = {
  modelId: "deepseek-v3.1",
  modelName: "DeepSeek-V3.1 (Comet)",
  provider: "comet",
  hostedId: "deepseek-v3.1",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.44,
    outputCost: 1.32
  }
}

const CometDeepSeekV32: LLM = {
  modelId: "deepseek-v3.2",
  modelName: "DeepSeek-V3.2 (Comet)",
  provider: "comet",
  hostedId: "deepseek-v3.2",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.216,
    outputCost: 0.346
  }
}

const CometDeepSeekReasoner: LLM = {
  modelId: "deepseek-reasoner",
  modelName: "DeepSeek-Reasoner (Comet)",
  provider: "comet",
  hostedId: "deepseek-reasoner",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.44,
    outputCost: 1.752
  }
}

const CometDeepSeekR1T2Chimera: LLM = {
  modelId: "deepseek-r1t2-chimera",
  modelName: "DeepSeek-R1T2-Chimera (Comet)",
  provider: "comet",
  hostedId: "deepseek-r1t2-chimera",
  platformLink: COMET_PLATFORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.2416,
    outputCost: 0.2416
  }
}

export const COMET_LLM_LIST: LLM[] = [
  // OpenAI GPT-4 models
  CometGPT4o,
  CometGPT4oMini,
  CometGPT4Turbo,
  CometGPT35Turbo,
  CometO1,
  CometO1Mini,
  // OpenAI GPT-5 models
  CometGPT5,
  CometGPT5Chat,
  CometGPT5Mini,
  CometGPT5Nano,
  CometGPT5Codex,
  // OpenAI GPT-5.1 models
  CometGPT51,
  CometGPT51Chat,
  CometGPT51Codex,
  CometGPT51CodexMax,
  // OpenAI GPT-5.2 models
  CometGPT52,
  CometGPT52Chat,
  CometGPT52Pro,
  // NOTE: GPT Image 1.5 is NOT included here - it's used as a tool, not as a chat model
  // Anthropic Claude models
  CometClaude35Sonnet,
  CometClaudeOpus45,
  CometClaudeSonnet45,
  CometClaudeHaiku45,
  // Google Gemini models
  CometGemini25Pro,
  CometGemini25Flash,
  CometGemini25FlashLite,
  // DeepSeek models
  CometDeepSeekV3,
  CometDeepSeekV31,
  CometDeepSeekV32,
  CometDeepSeekReasoner,
  CometDeepSeekR1T2Chimera
]
