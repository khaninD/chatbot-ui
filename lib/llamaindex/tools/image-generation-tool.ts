import { FunctionTool } from "@llamaindex/core/tools"

interface ImageGenerationInput {
  prompt: string
  size?: "1024x1024" | "1792x1024" | "1024x1792"
  quality?: "standard" | "hd"
  style?: "vivid" | "natural"
}

interface ImageGenerationConfig {
  apiKey: string
  baseURL?: string
  model?: string
}

// API response types
interface ImageGenerationResponse {
  data: Array<{
    url?: string
    b64_json?: string
    revised_prompt?: string
  }>
}

const imageGenerationSchema = {
  type: "object" as const,
  properties: {
    prompt: {
      type: "string" as const,
      description:
        "A detailed description of the image to generate. Be specific about style, colors, composition, and details."
    },
    size: {
      type: "string" as const,
      enum: ["1024x1024", "1792x1024", "1024x1792"],
      description: "The size of the generated image. Default: 1024x1024"
    },
    quality: {
      type: "string" as const,
      enum: ["standard", "hd"],
      description:
        "The quality of the generated image. HD produces more detailed images. Default: standard"
    },
    style: {
      type: "string" as const,
      enum: ["vivid", "natural"],
      description:
        "The style of the generated image. Vivid is more dramatic, natural is more realistic. Default: vivid"
    }
  },
  required: ["prompt"] as const
}

/**
 * Creates an image generation tool for LlamaIndex agent
 * Uses OpenAI-compatible API (works with Comet API)
 * Returns base64 data URL for reliable image display
 */
export function createImageGenerationTool(config: ImageGenerationConfig) {
  const { apiKey, baseURL, model = "gpt-image-1.5" } = config

  async function generateImage(input: ImageGenerationInput): Promise<string> {
    const {
      prompt,
      size = "1024x1024",
      quality = "standard",
      style = "vivid"
    } = input

    console.log(
      `[ImageGenerationTool] Generating image with prompt: "${prompt.substring(0, 100)}..."`
    )
    console.log(
      `[ImageGenerationTool] Parameters: model=${model}, size=${size}, quality=${quality}, style=${style}`
    )

    try {
      const apiUrl = baseURL
        ? `${baseURL}/images/generations`
        : "https://api.openai.com/v1/images/generations"

      // Note: Comet API doesn't support response_format parameter
      // We'll get URL and convert to base64 for reliable display
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          prompt,
          n: 1,
          size
        })
      })

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: { message: response.statusText } }))
        throw new Error(
          `Image generation failed: ${error.error?.message || response.statusText}`
        )
      }

      const data: ImageGenerationResponse = await response.json()
      const imageData = data.data?.[0]

      if (!imageData) {
        throw new Error("No image data returned from API")
      }

      let imageSource: string

      // Use URL from API response
      if (imageData.url) {
        imageSource = imageData.url
        console.log(
          `[ImageGenerationTool] Image generated successfully (URL): ${imageData.url.substring(0, 80)}...`
        )
      } else if (imageData.b64_json) {
        // Fallback to base64 if provided
        imageSource = `data:image/png;base64,${imageData.b64_json}`
        console.log(
          `[ImageGenerationTool] Image generated successfully (base64, ${Math.round(imageData.b64_json.length / 1024)}KB)`
        )
      } else {
        throw new Error("No image URL or base64 data returned from API")
      }

      // Include revised prompt if API modified it
      const revisedPromptNote = imageData.revised_prompt
        ? `\n\n*Revised prompt: ${imageData.revised_prompt}*`
        : ""

      // Return markdown image with data URL for display in chat
      return `![Generated Image](${imageSource})\n\n**Prompt:** ${prompt}${revisedPromptNote}\n**Size:** ${size} | **Quality:** ${quality} | **Style:** ${style}`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      console.error(`[ImageGenerationTool] Error: ${errorMessage}`)
      return `Error generating image: ${errorMessage}`
    }
  }

  return FunctionTool.from(
    (input: unknown) => generateImage(input as ImageGenerationInput),
    {
      name: "generate_image",
      description:
        "Generate an image based on a text description. Use this tool when the user asks to create, generate, draw, or make an image, picture, illustration, or artwork. Provide a detailed prompt describing what the image should look like.",
      parameters: imageGenerationSchema
    }
  )
}
