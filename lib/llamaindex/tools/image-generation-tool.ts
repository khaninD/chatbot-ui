import { FunctionTool } from "@llamaindex/core/tools"
import { uploadGeneratedImage } from "@/db/storage/generated-images"
import { uint8ArrayToBase64 } from "./utils/image-utils"

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

// Flux API response types
interface FluxTaskResponse {
  id: string
  polling_url: string
  cost?: number
}

interface FluxStatusResponse {
  status: "Pending" | "Processing" | "Ready" | "Error" | "Failed"
  output?: {
    url?: string
    images?: string[] // array of URLs or base64
  }
  error?: string
}

// Midjourney API response types
interface MidjourneySubmitResponse {
  code: number
  description: string
  result: string // task ID
}

interface MidjourneyTaskResponse {
  id: string
  action: string
  status:
    | "NOT_START"
    | "IN_QUEUE"
    | "SUBMITTED"
    | "IN_PROGRESS"
    | "SUCCESS"
    | "FAILURE"
    | "MODAL"
  prompt?: string
  promptEn?: string
  description?: string
  submitTime?: number
  startTime?: number
  finishTime?: number
  progress?: string
  imageUrl?: string
  failReason?: string
  buttons?: Array<{
    customId: string
    emoji?: string
    label: string
    type: number
    style?: number
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
 * Generate image using Midjourney API (async with polling)
 */
async function generateImageMidjourney(
  apiKey: string,
  prompt: string,
  userId?: string
): Promise<string> {
  const baseUrl = "https://api.cometapi.com"

  // Submit imagine task
  const submitResponse = await fetch(`${baseUrl}/mj/submit/imagine`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      botType: "MID_JOURNEY",
      prompt: `${prompt} --v 6.1`,
      accountFilter: { modes: ["FAST"] }
    })
  })

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text()
    throw new Error(`Midjourney submit failed: ${errorText}`)
  }

  const submitData: MidjourneySubmitResponse = await submitResponse.json()

  if (submitData.code !== 1) {
    throw new Error(`Midjourney submit failed: ${submitData.description}`)
  }

  const taskId = submitData.result
  console.log(
    `[ImageGenerationTool] Midjourney task created: ${taskId}, polling...`
  )

  // Poll for completion (max 180 seconds for Midjourney, check every 3 seconds)
  const maxAttempts = 60
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 3000))
    attempts++

    const statusResponse = await fetch(`${baseUrl}/mj/task/${taskId}/fetch`, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    })

    if (!statusResponse.ok) {
      throw new Error(
        `Failed to poll Midjourney status: ${statusResponse.statusText}`
      )
    }

    const task: MidjourneyTaskResponse = await statusResponse.json()
    console.log(
      `[ImageGenerationTool] Midjourney status: ${task.status} ${task.progress || ""}`
    )

    if (task.status === "SUCCESS") {
      if (!task.imageUrl) {
        throw new Error("No image URL in Midjourney response")
      }

      console.log(
        `[ImageGenerationTool] Midjourney image ready: ${task.imageUrl.substring(0, 80)}...`
      )

      // Download and upload to Supabase Storage
      if (userId) {
        try {
          const imageResponse = await fetch(task.imageUrl)
          const imageBlob = await imageResponse.blob()
          const arrayBuffer = await imageBlob.arrayBuffer()
          const bytes = new Uint8Array(arrayBuffer)
          const base64Data = uint8ArrayToBase64(bytes)
          const imageSource = `data:image/png;base64,${base64Data}`

          const finalImageUrl = await uploadGeneratedImage(
            imageSource,
            userId,
            "generate_image_midjourney"
          )
          return finalImageUrl
        } catch (uploadError) {
          console.error(`[ImageGenerationTool] Upload failed:`, uploadError)
          return task.imageUrl
        }
      }

      return task.imageUrl
    } else if (task.status === "FAILURE") {
      throw new Error(
        `Midjourney generation failed: ${task.failReason || task.description}`
      )
    }

    // Continue polling for other statuses
  }

  throw new Error("Midjourney generation timeout after 180 seconds")
}

/**
 * Generate image using Flux API (async with polling)
 */
async function generateImageFlux(
  apiKey: string,
  prompt: string,
  model: string,
  size: string,
  userId?: string
): Promise<string> {
  // Parse size (e.g., "1024x1024" -> width: 1024, height: 1024)
  const [width, height] = size.split("x").map(Number)

  // Submit generation task
  const apiUrl = `https://api.cometapi.com/flux/v1/${model}`

  console.log(`[ImageGenerationTool] Flux API request:`, {
    url: apiUrl,
    hasApiKey: !!apiKey,
    apiKeyPrefix: apiKey?.substring(0, 7) + "...",
    prompt: prompt.substring(0, 50)
  })

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-key": apiKey
    },
    body: JSON.stringify({
      prompt,
      width: width || 1024,
      height: height || 1024
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = response.statusText

    try {
      const errorJson = JSON.parse(errorText)
      errorMessage =
        errorJson.error?.message ||
        errorJson.message ||
        errorJson.error ||
        errorText
    } catch {
      errorMessage = errorText || response.statusText
    }

    console.error(`[ImageGenerationTool] Flux API error:`, errorMessage)
    throw new Error(`Flux image generation failed: ${errorMessage}`)
  }

  const taskData: FluxTaskResponse = await response.json()
  console.log(
    `[ImageGenerationTool] Flux task created: ${taskData.id}, polling...`
  )

  // Poll for completion (max 60 seconds, check every 1 second)
  const maxAttempts = 60
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    attempts++

    const statusResponse = await fetch(taskData.polling_url, {
      headers: { "x-key": apiKey }
    })

    if (!statusResponse.ok) {
      throw new Error(`Failed to poll status: ${statusResponse.statusText}`)
    }

    const status: FluxStatusResponse = await statusResponse.json()
    console.log(`[ImageGenerationTool] Flux status: ${status.status}`)

    if (status.status === "Ready") {
      // Get image URL from output
      const imageUrl = status.output?.url || status.output?.images?.[0] || null

      if (!imageUrl) {
        throw new Error("No image URL in Flux response")
      }

      console.log(
        `[ImageGenerationTool] Flux image ready: ${imageUrl.substring(0, 80)}...`
      )

      // Download and upload to Supabase Storage if userId provided
      if (userId) {
        try {
          // Fetch the image
          const imageResponse = await fetch(imageUrl)
          const imageBlob = await imageResponse.blob()
          const arrayBuffer = await imageBlob.arrayBuffer()
          const bytes = new Uint8Array(arrayBuffer)
          const base64Data = uint8ArrayToBase64(bytes)
          const imageSource = `data:image/png;base64,${base64Data}`

          const finalImageUrl = await uploadGeneratedImage(
            imageSource,
            userId,
            `generate_image_${model}`
          )
          return finalImageUrl
        } catch (uploadError) {
          console.error(`[ImageGenerationTool] Upload failed:`, uploadError)
          return imageUrl // Fallback to original URL
        }
      }

      return imageUrl
    } else if (status.status === "Error" || status.status === "Failed") {
      throw new Error(
        `Flux generation failed: ${status.error || status.status}`
      )
    }

    // Continue polling for Pending/Processing
  }

  throw new Error("Flux generation timeout after 60 seconds")
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
 * Supports multiple APIs:
 * - OpenAI-compatible API (gpt-image-1.5, etc.)
 * - Midjourney API with polling (midjourney)
 * - Nano Banana (Gemini) API (nano-banana-pro)
 * - Flux API with polling (flex-2-pro, flux-*)
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
      // Use Midjourney API for midjourney model
      if (model === "midjourney") {
        const imageUrl = await generateImageMidjourney(apiKey, prompt, userId)
        return `![Generated Image](${imageUrl})\n\n**Prompt:** ${prompt}\n**Model:** Midjourney v6.1`
      }

      // Use Nano Banana API for nano-banana-pro model
      if (model === "nano-banana-pro") {
        const imageUrl = await generateImageNanoBanana(apiKey, prompt, userId)
        return `![Generated Image](${imageUrl})\n\n**Prompt:** ${prompt}\n**Model:** Nano Banana Pro`
      }

      // Use Flux API for flux models (flex-2-pro, etc.)
      if (model === "flex-2-pro" || model.startsWith("flux-")) {
        const imageUrl = await generateImageFlux(
          apiKey,
          prompt,
          model,
          size as string,
          userId
        )
        return `![Generated Image](${imageUrl})\n\n**Prompt:** ${prompt}\n**Model:** ${model}`
      }

      // Use OpenAI-compatible API for other models (gpt-image-1.5, etc.)
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
