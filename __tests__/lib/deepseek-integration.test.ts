import { DEEPSEEK_LLM_LIST } from "@/lib/models/llm/deepseek-llm-list"
import { LLM_LIST, LLM_LIST_MAP } from "@/lib/models/llm/llm-list"
import { CHAT_SETTING_LIMITS } from "@/lib/chat-setting-limits"
import { VALID_ENV_KEYS } from "@/types/valid-keys"

// Mock fetch for fetchHostedModels test
global.fetch = jest.fn()

describe("DeepSeek LLM List", () => {
  it("should have DeepSeek models defined", () => {
    expect(DEEPSEEK_LLM_LIST).toBeDefined()
    expect(DEEPSEEK_LLM_LIST.length).toBeGreaterThan(0)
  })

  it("should have deepseek-chat model", () => {
    const chatModel = DEEPSEEK_LLM_LIST.find(
      model => model.modelId === "deepseek-chat"
    )
    expect(chatModel).toBeDefined()
    expect(chatModel?.provider).toBe("deepseek")
    expect(chatModel?.modelName).toBe("DeepSeek-V3.2 (Chat)")
    expect(chatModel?.platformLink).toBe("https://api.deepseek.com")
  })

  it("should have deepseek-reasoner model", () => {
    const reasonerModel = DEEPSEEK_LLM_LIST.find(
      model => model.modelId === "deepseek-reasoner"
    )
    expect(reasonerModel).toBeDefined()
    expect(reasonerModel?.provider).toBe("deepseek")
    expect(reasonerModel?.modelName).toBe("DeepSeek-V3.2 (Reasoner)")
  })

  it("should have correct pricing for DeepSeek models", () => {
    const chatModel = DEEPSEEK_LLM_LIST.find(
      model => model.modelId === "deepseek-chat"
    )
    expect(chatModel?.pricing).toBeDefined()
    expect(chatModel?.pricing?.inputCost).toBe(0.28)
    expect(chatModel?.pricing?.outputCost).toBe(0.42)
    expect(chatModel?.pricing?.unit).toBe("1M tokens")
  })
})

describe("LLM List Integration", () => {
  it("should include DeepSeek models in LLM_LIST", () => {
    const deepseekModels = LLM_LIST.filter(
      model => model.provider === "deepseek"
    )
    expect(deepseekModels.length).toBeGreaterThan(0)
  })

  it("should have deepseek in LLM_LIST_MAP", () => {
    expect(LLM_LIST_MAP.deepseek).toBeDefined()
    expect(LLM_LIST_MAP.deepseek.length).toBeGreaterThan(0)
  })

  it("should be able to find deepseek-chat by modelId", () => {
    const model = LLM_LIST.find(m => m.modelId === "deepseek-chat")
    expect(model).toBeDefined()
    expect(model?.provider).toBe("deepseek")
  })
})

describe("Chat Setting Limits", () => {
  it("should have limits for deepseek-chat", () => {
    const limits = CHAT_SETTING_LIMITS["deepseek-chat"]
    expect(limits).toBeDefined()
    expect(limits.MAX_CONTEXT_LENGTH).toBe(128000)
    expect(limits.MAX_TOKEN_OUTPUT_LENGTH).toBe(8192)
    expect(limits.MIN_TEMPERATURE).toBe(0.0)
    expect(limits.MAX_TEMPERATURE).toBe(2.0)
  })

  it("should have limits for deepseek-reasoner", () => {
    const limits = CHAT_SETTING_LIMITS["deepseek-reasoner"]
    expect(limits).toBeDefined()
    expect(limits.MAX_CONTEXT_LENGTH).toBe(128000)
  })
})

describe("Environment Keys", () => {
  it("should have DEEPSEEK_API_KEY in VALID_ENV_KEYS", () => {
    expect(VALID_ENV_KEYS.DEEPSEEK_API_KEY).toBe("DEEPSEEK_API_KEY")
  })
})

describe("Model Provider Detection", () => {
  it("should correctly identify DeepSeek model provider from LLM_LIST", () => {
    const testModelId = "deepseek-chat"
    const model = LLM_LIST.find(m => m.modelId === testModelId)

    expect(model).toBeDefined()
    expect(model?.provider).toBe("deepseek")
  })

  it("should distinguish DeepSeek direct API models from Comet DeepSeek models", () => {
    // Direct DeepSeek API model
    const directModel = LLM_LIST.find(m => m.modelId === "deepseek-chat")
    expect(directModel?.provider).toBe("deepseek")

    // Comet DeepSeek model (deepseek-v3.2 via Comet)
    const cometModel = LLM_LIST.find(m => m.modelId === "deepseek-v3.2")
    expect(cometModel?.provider).toBe("comet")
  })
})

describe("Fetch Models Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should include deepseek in providers list for fetchHostedModels", async () => {
    // Import the module to check the providers array
    const fetchModelsModule = await import("@/lib/models/fetch-models")

    // Mock fetch to return env key map
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        isUsingEnvKeyMap: {
          deepseek: true,
          openai: false,
          comet: false
        }
      })
    })

    // Create a mock profile with deepseek_api_key
    const mockProfile = {
      deepseek_api_key: "test-deepseek-key",
      use_azure_openai: false
    } as any

    const result = await fetchModelsModule.fetchHostedModels(mockProfile)

    // Should return DeepSeek models when API key is present
    expect(result?.hostedModels).toBeDefined()

    const deepseekModels = result?.hostedModels.filter(
      (m: any) => m.provider === "deepseek"
    )
    expect(deepseekModels?.length).toBeGreaterThan(0)

    // Verify deepseek-chat is in the list
    const chatModel = result?.hostedModels.find(
      (m: any) => m.modelId === "deepseek-chat"
    )
    expect(chatModel).toBeDefined()
    expect(chatModel?.provider).toBe("deepseek")
  })

  it("should not include deepseek models when no API key is present", async () => {
    const fetchModelsModule = await import("@/lib/models/fetch-models")

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        isUsingEnvKeyMap: {
          deepseek: false,
          openai: false,
          comet: false
        }
      })
    })

    // Profile without deepseek_api_key
    const mockProfile = {
      deepseek_api_key: null,
      use_azure_openai: false
    } as any

    const result = await fetchModelsModule.fetchHostedModels(mockProfile)

    const deepseekModels = result?.hostedModels.filter(
      (m: any) => m.provider === "deepseek"
    )
    expect(deepseekModels?.length).toBe(0)
  })
})
