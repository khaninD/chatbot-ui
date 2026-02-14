import { LLMID } from "@/types"
type ChatSettingLimits = {
  MAX_TOKEN_OUTPUT_LENGTH: number
}
export const CHAT_SETTING_LIMITS: Record<LLMID, ChatSettingLimits> = {
  // ANTHROPIC MODELS
  "claude-2.1": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  "claude-instant-1.2": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  "claude-3-haiku-20240307": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  "claude-3-sonnet-20240229": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  "claude-3-opus-20240229": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  "claude-3-5-sonnet-20240620": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  // GOOGLE MODELS
  "gemini-1.5-flash": {
    MAX_TOKEN_OUTPUT_LENGTH: 8192
  },
  "gemini-1.5-pro-latest": {
    MAX_TOKEN_OUTPUT_LENGTH: 8192
  },
  "gemini-pro": {
    MAX_TOKEN_OUTPUT_LENGTH: 2048
  },
  "gemini-pro-vision": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  // MISTRAL MODELS
  "mistral-tiny": {
    MAX_TOKEN_OUTPUT_LENGTH: 2000
  },
  "mistral-small-latest": {
    MAX_TOKEN_OUTPUT_LENGTH: 2000
  },
  "mistral-medium-latest": {
    MAX_TOKEN_OUTPUT_LENGTH: 2000
  },
  "mistral-large-latest": {
    MAX_TOKEN_OUTPUT_LENGTH: 2000
  },
  // GROQ MODELS
  "llama3-8b-8192": {
    MAX_TOKEN_OUTPUT_LENGTH: 8192
  },
  "llama3-70b-8192": {
    MAX_TOKEN_OUTPUT_LENGTH: 8192
  },
  "mixtral-8x7b-32768": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  "gemma-7b-it": {
    MAX_TOKEN_OUTPUT_LENGTH: 8192
  },
  // OPENAI MODELS
  "gpt-3.5-turbo": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
    // MAX_CONTEXT_LENGTH: 16385 (TODO: Change this back to 16385 when OpenAI bumps the model)
  },
  "gpt-4-turbo": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  "gpt-4o-mini": {
    MAX_TOKEN_OUTPUT_LENGTH: 16384
  },
  "gpt-4": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  "gpt-5-mini": {
    MAX_TOKEN_OUTPUT_LENGTH: 128000
  },
  "gpt-5-nano": {
    MAX_TOKEN_OUTPUT_LENGTH: 128000
  },
  "gpt-4o": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  // PERPLEXITY MODELS
  "pplx-7b-online": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  "pplx-70b-online": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  "pplx-7b-chat": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  "pplx-70b-chat": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  "mixtral-8x7b-instruct": {
    MAX_TOKEN_OUTPUT_LENGTH: 16384
  },
  "mistral-7b-instruct": {
    MAX_TOKEN_OUTPUT_LENGTH: 16384
  },
  "llama-2-70b-chat": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  "codellama-34b-instruct": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  "codellama-70b-instruct": {
    MAX_TOKEN_OUTPUT_LENGTH: 16384
  },
  "sonar-small-chat": {
    MAX_TOKEN_OUTPUT_LENGTH: 16384
  },
  "sonar-small-online": {
    MAX_TOKEN_OUTPUT_LENGTH: 12000
  },
  "sonar-medium-chat": {
    MAX_TOKEN_OUTPUT_LENGTH: 16384
  },
  "sonar-medium-online": {
    MAX_TOKEN_OUTPUT_LENGTH: 12000
  },
  // LLAMAINDEX MODELS
  "llamaindex-sql-agent": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  // COMET API MODELS (январь 2026)
  // OpenAI via Comet
  o1: {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  "o1-mini": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  // GPT-5 models via Comet
  "gpt-5": {
    MAX_TOKEN_OUTPUT_LENGTH: 128000
  },
  "gpt-5-chat-latest": {
    MAX_TOKEN_OUTPUT_LENGTH: 128000
  },
  "gpt-5-codex": {
    MAX_TOKEN_OUTPUT_LENGTH: 128000
  },
  // GPT-5.1 models via Comet
  "gpt-5.1": {
    MAX_TOKEN_OUTPUT_LENGTH: 128000
  },
  "gpt-5.1-chat-latest": {
    MAX_TOKEN_OUTPUT_LENGTH: 128000
  },
  "gpt-5.1-codex": {
    MAX_TOKEN_OUTPUT_LENGTH: 128000
  },
  "gpt-5.1-codex-max": {
    MAX_TOKEN_OUTPUT_LENGTH: 128000
  },
  // GPT-5.2 models via Comet
  "gpt-5.2": {
    MAX_TOKEN_OUTPUT_LENGTH: 128000
  },
  "gpt-5.2-chat-latest": {
    MAX_TOKEN_OUTPUT_LENGTH: 16384
  },
  "gpt-5.2-pro": {
    MAX_TOKEN_OUTPUT_LENGTH: 128000
  },
  // Anthropic Claude via Comet
  "claude-3-5-sonnet-20241022": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  "claude-opus-4-5-20251101": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  "claude-sonnet-4-5-20250929": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  "claude-haiku-4-5-20251001": {
    MAX_TOKEN_OUTPUT_LENGTH: 4096
  },
  // Google Gemini via Comet
  "gemini-2.5-pro": {
    MAX_TOKEN_OUTPUT_LENGTH: 8192
  },
  "gemini-2.5-flash": {
    MAX_TOKEN_OUTPUT_LENGTH: 8192
  },
  "gemini-2.5-flash-lite": {
    MAX_TOKEN_OUTPUT_LENGTH: 8192
  },
  // DeepSeek models via Comet
  "deepseek-v3": {
    MAX_TOKEN_OUTPUT_LENGTH: 8192
  },
  "deepseek-v3.1": {
    MAX_TOKEN_OUTPUT_LENGTH: 8192
  },
  "deepseek-v3.2": {
    MAX_TOKEN_OUTPUT_LENGTH: 8192
  },
  "deepseek-reasoner": {
    MAX_TOKEN_OUTPUT_LENGTH: 8192
  },
  "deepseek-r1t2-chimera": {
    MAX_TOKEN_OUTPUT_LENGTH: 8192
  },
  "deepseek-chat-v3.1": {
    MAX_TOKEN_OUTPUT_LENGTH: 8192
  },
  "gemini-3-pro-preview": {
    MAX_TOKEN_OUTPUT_LENGTH: 8192
  },
  "grok-4": {
    MAX_TOKEN_OUTPUT_LENGTH: 16384
  },
  "claude-sonnet-4.5": {
    MAX_TOKEN_OUTPUT_LENGTH: 16384
  },
  // Router AI models (with routerai- prefix)
  "routerai-deepseek-v3.2": {
    MAX_TOKEN_OUTPUT_LENGTH: 8192
  },
  "routerai-deepseek-chat-v3.1": {
    MAX_TOKEN_OUTPUT_LENGTH: 8192
  },
  "routerai-gpt-5.2": {
    MAX_TOKEN_OUTPUT_LENGTH: 16384
  },
  "routerai-gemini-3-pro-preview": {
    MAX_TOKEN_OUTPUT_LENGTH: 8192
  },
  "routerai-claude-sonnet-4.5": {
    MAX_TOKEN_OUTPUT_LENGTH: 16384
  },
  "routerai-grok-4": {
    MAX_TOKEN_OUTPUT_LENGTH: 16384
  },
  // DEEPSEEK DIRECT API MODELS (direct DeepSeek API)
  "deepseek-chat": {
    MAX_TOKEN_OUTPUT_LENGTH: 8192
  }
  // Note: "deepseek-reasoner" is already defined in Comet models above
}
