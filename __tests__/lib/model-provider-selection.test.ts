import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { ChatSettings } from "@/types/chat"

describe("Model Provider Selection Logic", () => {
  describe("With modelProvider specified", () => {
    it("should select correct model when provider is specified (OpenAI)", () => {
      const chatSettings: Partial<ChatSettings> = {
        model: "gpt-4o-mini",
        modelProvider: "openai"
      }

      const selectedModel = LLM_LIST.find(model => {
        if (chatSettings.modelProvider) {
          return (
            model.modelId === chatSettings.model &&
            model.provider === chatSettings.modelProvider
          )
        }
        return model.modelId === chatSettings.model
      })

      expect(selectedModel).toBeDefined()
      expect(selectedModel?.provider).toBe("openai")
      expect(selectedModel?.modelId).toBe("gpt-4o-mini")
    })

    it("should select correct model when provider is specified (Comet)", () => {
      const chatSettings: Partial<ChatSettings> = {
        model: "gpt-4o-mini",
        modelProvider: "comet"
      }

      const selectedModel = LLM_LIST.find(model => {
        if (chatSettings.modelProvider) {
          return (
            model.modelId === chatSettings.model &&
            model.provider === chatSettings.modelProvider
          )
        }
        return model.modelId === chatSettings.model
      })

      expect(selectedModel).toBeDefined()
      expect(selectedModel?.provider).toBe("comet")
      expect(selectedModel?.modelId).toBe("gpt-4o-mini")
    })

    it("should differentiate between OpenAI and Comet gpt-5-mini", () => {
      const openaiSettings: Partial<ChatSettings> = {
        model: "gpt-5-mini",
        modelProvider: "openai"
      }

      const cometSettings: Partial<ChatSettings> = {
        model: "gpt-5-mini",
        modelProvider: "comet"
      }

      const openaiModel = LLM_LIST.find(model => {
        if (openaiSettings.modelProvider) {
          return (
            model.modelId === openaiSettings.model &&
            model.provider === openaiSettings.modelProvider
          )
        }
        return model.modelId === openaiSettings.model
      })

      const cometModel = LLM_LIST.find(model => {
        if (cometSettings.modelProvider) {
          return (
            model.modelId === cometSettings.model &&
            model.provider === cometSettings.modelProvider
          )
        }
        return model.modelId === cometSettings.model
      })

      expect(openaiModel?.provider).toBe("openai")
      expect(cometModel?.provider).toBe("comet")
      expect(openaiModel?.modelId).toBe(cometModel?.modelId)
      expect(openaiModel).not.toEqual(cometModel)
    })

    it("should return undefined when provider-modelId combination doesn't exist", () => {
      const chatSettings: Partial<ChatSettings> = {
        model: "gpt-4o-mini",
        modelProvider: "anthropic" // Anthropic doesn't have gpt-4o-mini
      }

      const selectedModel = LLM_LIST.find(model => {
        if (chatSettings.modelProvider) {
          return (
            model.modelId === chatSettings.model &&
            model.provider === chatSettings.modelProvider
          )
        }
        return model.modelId === chatSettings.model
      })

      expect(selectedModel).toBeUndefined()
    })
  })

  describe("Without modelProvider (backward compatibility)", () => {
    it("should fallback to first matching model by modelId only", () => {
      const chatSettings: Partial<ChatSettings> = {
        model: "gpt-4o-mini"
        // No modelProvider specified
      }

      const selectedModel = LLM_LIST.find(model => {
        if (chatSettings.modelProvider) {
          return (
            model.modelId === chatSettings.model &&
            model.provider === chatSettings.modelProvider
          )
        }
        return model.modelId === chatSettings.model
      })

      expect(selectedModel).toBeDefined()
      expect(selectedModel?.modelId).toBe("gpt-4o-mini")
      // Should return first match (could be OpenAI or Comet)
      expect(["openai", "comet"]).toContain(selectedModel?.provider)
    })

    it("should handle unique modelIds correctly", () => {
      const chatSettings: Partial<ChatSettings> = {
        model: "deepseek-chat"
        // No modelProvider specified
      }

      const selectedModel = LLM_LIST.find(model => {
        if (chatSettings.modelProvider) {
          return (
            model.modelId === chatSettings.model &&
            model.provider === chatSettings.modelProvider
          )
        }
        return model.modelId === chatSettings.model
      })

      expect(selectedModel).toBeDefined()
      expect(selectedModel?.provider).toBe("deepseek")
      expect(selectedModel?.modelId).toBe("deepseek-chat")
    })
  })

  describe("Duplicate modelIds in LLM_LIST", () => {
    it("should have duplicate modelIds across different providers", () => {
      const duplicates = new Map<string, string[]>()

      LLM_LIST.forEach(model => {
        if (!duplicates.has(model.modelId)) {
          duplicates.set(model.modelId, [])
        }
        duplicates.get(model.modelId)!.push(model.provider)
      })

      // Find modelIds that appear in multiple providers
      const duplicateModelIds = Array.from(duplicates.entries()).filter(
        ([, providers]) => providers.length > 1
      )

      // Should have at least some duplicates (gpt-4o, gpt-4o-mini, etc.)
      expect(duplicateModelIds.length).toBeGreaterThan(0)

      // Verify common duplicates
      const commonDuplicates = ["gpt-4o", "gpt-4o-mini", "gpt-5-mini"]
      commonDuplicates.forEach(modelId => {
        const entry = duplicates.get(modelId)
        if (entry) {
          expect(entry.length).toBeGreaterThan(1)
          expect(entry).toContain("openai")
          expect(entry).toContain("comet")
        }
      })
    })
  })

  describe("agentModel vs model field", () => {
    it("should handle agentModel field", () => {
      const chatSettings: Partial<ChatSettings> = {
        agentModel: "gpt-4o-mini",
        modelProvider: "comet"
      }

      const selectedModelId = chatSettings.agentModel || "gpt-4o"
      const selectedModel = LLM_LIST.find(model => {
        if (chatSettings.modelProvider) {
          return (
            model.modelId === selectedModelId &&
            model.provider === chatSettings.modelProvider
          )
        }
        return model.modelId === selectedModelId
      })

      expect(selectedModel).toBeDefined()
      expect(selectedModel?.provider).toBe("comet")
    })

    it("should fallback to gpt-4o when agentModel is not specified", () => {
      const chatSettings: Partial<ChatSettings> = {
        modelProvider: "openai"
      }

      const selectedModelId = chatSettings.agentModel || "gpt-4o"
      const selectedModel = LLM_LIST.find(model => {
        if (chatSettings.modelProvider) {
          return (
            model.modelId === selectedModelId &&
            model.provider === chatSettings.modelProvider
          )
        }
        return model.modelId === selectedModelId
      })

      expect(selectedModel).toBeDefined()
      expect(selectedModel?.modelId).toBe("gpt-4o")
      expect(selectedModel?.provider).toBe("openai")
    })
  })

  describe("Provider determination for API key selection", () => {
    it("should determine correct provider for API key (OpenAI)", () => {
      const chatSettings: Partial<ChatSettings> = {
        agentModel: "gpt-4o-mini",
        modelProvider: "openai"
      }

      const selectedModelId = chatSettings.agentModel || "gpt-4o"
      const selectedModel = LLM_LIST.find(model => {
        if (chatSettings.modelProvider) {
          return (
            model.modelId === selectedModelId &&
            model.provider === chatSettings.modelProvider
          )
        }
        return model.modelId === selectedModelId
      })

      const modelProvider = selectedModel?.provider || "openai"

      expect(modelProvider).toBe("openai")
    })

    it("should determine correct provider for API key (Comet)", () => {
      const chatSettings: Partial<ChatSettings> = {
        agentModel: "gpt-4o-mini",
        modelProvider: "comet"
      }

      const selectedModelId = chatSettings.agentModel || "gpt-4o"
      const selectedModel = LLM_LIST.find(model => {
        if (chatSettings.modelProvider) {
          return (
            model.modelId === selectedModelId &&
            model.provider === chatSettings.modelProvider
          )
        }
        return model.modelId === selectedModelId
      })

      const modelProvider = selectedModel?.provider || "openai"

      expect(modelProvider).toBe("comet")
    })

    it("should fallback to openai provider when model not found", () => {
      const chatSettings: Partial<ChatSettings> = {
        agentModel: "non-existent-model",
        modelProvider: "unknown-provider"
      }

      const selectedModelId = chatSettings.agentModel || "gpt-4o"
      const selectedModel = LLM_LIST.find(model => {
        if (chatSettings.modelProvider) {
          return (
            model.modelId === selectedModelId &&
            model.provider === chatSettings.modelProvider
          )
        }
        return model.modelId === selectedModelId
      })

      const modelProvider = selectedModel?.provider || "openai"

      expect(modelProvider).toBe("openai")
    })
  })
})
