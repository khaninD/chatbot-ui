import { isUsingEnvironmentKey } from "@/lib/envs"
import { createResponse } from "@/lib/server/server-utils"
import { EnvKey } from "@/types/key-type"
import { VALID_ENV_KEYS } from "@/types/valid-keys"

export async function GET() {
  const isLlmApiKeySet = isUsingEnvironmentKey(
    VALID_ENV_KEYS.LLM_API_KEY as EnvKey
  )

  const isUsingEnvKeyMap = {
    openai: isLlmApiKeySet,
    google: false,
    anthropic: false,
    mistral: false,
    groq: false,
    perplexity: false,
    openrouter: false,
    comet: false,
    routerai: false,
    deepseek: false,
    llamaindex: isLlmApiKeySet
  }

  return createResponse({ isUsingEnvKeyMap }, 200)
}
