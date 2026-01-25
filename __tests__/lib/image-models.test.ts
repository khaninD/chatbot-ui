import { IMAGE_MODELS, DEFAULT_IMAGE_MODEL } from "@/lib/models/image-models"

describe("Image Models", () => {
  it("should have image models defined", () => {
    expect(IMAGE_MODELS).toBeDefined()
    expect(IMAGE_MODELS.length).toBeGreaterThan(0)
  })

  it("should have default image model defined", () => {
    expect(DEFAULT_IMAGE_MODEL).toBeDefined()
    expect(DEFAULT_IMAGE_MODEL).toBe("gpt-image-1.5")
  })

  it("should have all models with required properties", () => {
    IMAGE_MODELS.forEach(model => {
      expect(model.id).toBeDefined()
      expect(model.name).toBeDefined()
      expect(model.provider).toBeDefined()
      expect(typeof model.id).toBe("string")
      expect(typeof model.name).toBe("string")
      expect(typeof model.provider).toBe("string")
    })
  })

  it("should have all Comet API models", () => {
    const cometModels = IMAGE_MODELS.filter(
      model => model.provider === "Comet API"
    )
    expect(cometModels.length).toBe(IMAGE_MODELS.length)
  })

  it("should have gpt-image-1.5 model", () => {
    const gptImageModel = IMAGE_MODELS.find(
      model => model.id === "gpt-image-1.5"
    )
    expect(gptImageModel).toBeDefined()
    expect(gptImageModel?.name).toBe("GPT Image 1.5")
    expect(gptImageModel?.provider).toBe("Comet API")
  })

  it("should have midjourney model", () => {
    const midjourneyModel = IMAGE_MODELS.find(
      model => model.id === "midjourney"
    )
    expect(midjourneyModel).toBeDefined()
    expect(midjourneyModel?.name).toBe("Midjourney v6.1")
  })

  it("should have unique model IDs", () => {
    const ids = IMAGE_MODELS.map(model => model.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it("should have default model in the list", () => {
    const hasDefaultModel = IMAGE_MODELS.some(
      model => model.id === DEFAULT_IMAGE_MODEL
    )
    expect(hasDefaultModel).toBe(true)
  })
})
