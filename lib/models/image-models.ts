// Comet API image generation/editing models
export const IMAGE_MODELS = [
  {
    id: "gpt-image-1.5",
    name: "GPT Image 1.5",
    provider: "Comet API"
  },
  {
    id: "midjourney",
    name: "Midjourney v6.1",
    provider: "Comet API"
  },
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    provider: "Comet API"
  },
  {
    id: "flex-2-pro",
    name: "Flex 2 Pro",
    provider: "Comet API"
  },
  {
    id: "kling-image",
    name: "Kling Image",
    provider: "Comet API"
  }
] as const

export type ImageModelID = (typeof IMAGE_MODELS)[number]["id"]

export const DEFAULT_IMAGE_MODEL: ImageModelID = "gpt-image-1.5"
