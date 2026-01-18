import { FunctionTool } from "@llamaindex/core/tools"
import { uploadGeneratedImage } from "@/db/storage/generated-images"

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
  userId?: string // User ID for storage
}

// API response types
interface ImageGenerationResponse {
  data: Array<{
    url?: string
    b64_json?: string
    revised_prompt?: string
  }>
}

// Nano Banana (Gemini) API response types
interface NanoBananaResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text?: string
        inlineData?: {
          mimeType: string
          data: string
        }
      }>
    }
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
 * Generate image using Nano Banana (Gemini) API
 */
async function generateImageNanoBanana(
  apiKey: string,
  prompt: string,
  userId?: string
): Promise<string> {
  const apiUrl =
    "https://api.cometapi.com/v1beta/models/gemini-3-pro-image:generateContent"

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        responseModalities: ["IMAGE"]
      }
    })
  })

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: { message: response.statusText } }))
    throw new Error(
      `Nano Banana image generation failed: ${error.error?.message || response.statusText}`
    )
  }

  const data: NanoBananaResponse = await response.json()
  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    part => part.inlineData
  )

  if (!imagePart?.inlineData?.data) {
    throw new Error("No image data returned from Nano Banana API")
  }

  const base64Data = imagePart.inlineData.data
  const imageSource = `data:image/png;base64,${base64Data}`

  console.log(
    `[ImageGenerationTool] Nano Banana image generated successfully (${Math.round(base64Data.length / 1024)}KB)`
  )

  // Upload to Supabase Storage
  if (userId) {
    try {
      const finalImageUrl = await uploadGeneratedImage(
        imageSource,
        userId,
        "generate_image_nanobanana"
      )
      return finalImageUrl
    } catch (uploadError) {
      console.error(`[ImageGenerationTool] Upload failed:`, uploadError)
      return imageSource // Fallback to base64
    }
  }

  return imageSource
}

/**
 * Creates an image generation tool for LlamaIndex agent
 * Supports both OpenAI-compatible API and Nano Banana (Gemini) API
 */
export function createImageGenerationTool(config: ImageGenerationConfig) {
  const { apiKey, baseURL, model = "gpt-image-1.5", userId } = config

  async function generateImage(input: ImageGenerationInput): Promise<string> {
    const {
      prompt,
      size = "auto",
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
      // Use Nano Banana API for nano-banana-pro model
      if (model === "nano-banana-pro") {
        const imageUrl = await generateImageNanoBanana(apiKey, prompt, userId)
        return `![Generated Image](${imageUrl})\n\n**Prompt:** ${prompt}\n**Model:** Nano Banana Pro`
      }

      // Use OpenAI-compatible API for other models
      const apiUrl = baseURL
        ? `${baseURL}/images/generations`
        : "https://api.openai.com/v1/images/generations"

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

      // Upload image to Supabase Storage to get public URL
      // CRITICAL: Don't return base64 in tool result - it will exceed context limits!
      let finalImageUrl = imageSource

      if (userId && imageSource.startsWith("data:image")) {
        // Upload base64 to storage and get public URL
        try {
          finalImageUrl = await uploadGeneratedImage(
            imageSource,
            userId,
            "generate_image"
          )
          console.log(
            `[ImageGenerationTool] Uploaded to storage: ${finalImageUrl}`
          )
        } catch (uploadError) {
          console.error(`[ImageGenerationTool] Upload failed:`, uploadError)
          // Fallback: return success without URL
          return `Image generated successfully, but failed to save. Size: ${size}, Quality: ${quality}, Style: ${style}.`
        }
      }

      // Return markdown with public URL (safe for context)
      const revisedInfo = imageData.revised_prompt
        ? `\n\n*Revised prompt: ${imageData.revised_prompt}*`
        : ""

      return `![Generated Image](${finalImageUrl})\n\n**Prompt:** ${prompt}${revisedInfo}\n**Size:** ${size} | **Quality:** ${quality} | **Style:** ${style}`
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
