import { FunctionTool } from "@llamaindex/core/tools"
import { uploadGeneratedImage } from "@/db/storage/generated-images"
import { uint8ArrayToBase64 } from "./utils/image-utils"

interface ImageEditInput {
  prompt: string
  image_index?: number // Which image to edit (0-based index), default is 0
  size?: "1024x1024" | "1792x1024" | "1024x1792"
}

interface ImageEditConfig {
  apiKey: string
  baseURL?: string
  model?: string
  userId?: string // User ID for storage
}

// API response types
interface ImageEditResponse {
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
    images?: string[]
  }
  error?: string
}

// Midjourney Blend API response types
interface MidjourneyBlendSubmitResponse {
  code: number
  description: string
  result: string // task ID
}

interface MidjourneyBlendTaskResponse {
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
}

const imageEditSchema = {
  type: "object" as const,
  properties: {
    prompt: {
      type: "string" as const,
      description:
        "A detailed description of the edits to make to the uploaded image. Describe what changes you want: add elements, remove objects, change colors, apply effects, etc."
    },
    image_index: {
      type: "number" as const,
      description:
        "Which uploaded image to edit (0 for first image, 1 for second, etc.). Default is 0 (first image). Use this when user uploads multiple images and specifies which one to edit."
    },
    size: {
      type: "string" as const,
      enum: ["1024x1024", "1792x1024", "1024x1792"],
      description: "The size of the output image. Default: 1024x1024"
    }
  },
  required: ["prompt"] as const
}

// Store for user-uploaded images (set by agent before tool execution)
let pendingUserImages: string[] = []

/**
 * Set user-uploaded images for the edit tool to use
 */
export function setUserImages(images: string[]) {
  pendingUserImages = images
  console.log(
    `[ImageEditTool] Received ${images.length} user images for editing`
  )
}

/**
 * Clear user images after use
 */
export function clearUserImages() {
  pendingUserImages = []
}

/**
 * Get current user images
 */
export function getUserImages(): string[] {
  return pendingUserImages
}

/**
 * Edit image using Flux API (async with polling)
 */
async function editImageFlux(
  apiKey: string,
  prompt: string,
  imageToEdit: string,
  model: string,
  size: string,
  userId?: string
): Promise<string> {
  // Parse size
  const [width, height] = size.split("x").map(Number)

  // Convert image to base64 if it's a URL
  let base64Data: string
  if (imageToEdit.startsWith("data:image")) {
    base64Data = imageToEdit.split(",")[1]
  } else {
    const imageResponse = await fetch(imageToEdit)
    const imageBlob = await imageResponse.blob()
    const arrayBuffer = await imageBlob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    base64Data = uint8ArrayToBase64(bytes)
  }

  // Submit edit task
  const apiUrl = `https://api.cometapi.com/flux/v1/${model}`
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-key": apiKey
    },
    body: JSON.stringify({
      prompt,
      image_prompt: base64Data, // Reference image
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

    console.error(`[ImageEditTool] Flux API error:`, errorMessage)
    throw new Error(`Flux image editing failed: ${errorMessage}`)
  }

  const taskData: FluxTaskResponse = await response.json()
  console.log(`[ImageEditTool] Flux task created: ${taskData.id}, polling...`)

  // Poll for completion
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
    console.log(`[ImageEditTool] Flux status: ${status.status}`)

    if (status.status === "Ready") {
      const imageUrl = status.output?.url || status.output?.images?.[0] || null

      if (!imageUrl) {
        throw new Error("No image URL in Flux response")
      }

      console.log(
        `[ImageEditTool] Flux image ready: ${imageUrl.substring(0, 80)}...`
      )

      // Download and upload to Supabase Storage
      if (userId) {
        try {
          const imageResponse = await fetch(imageUrl)
          const imageBlob = await imageResponse.blob()
          const arrayBuffer = await imageBlob.arrayBuffer()
          const bytes = new Uint8Array(arrayBuffer)
          const base64 = uint8ArrayToBase64(bytes)
          const imageSource = `data:image/png;base64,${base64}`

          const finalImageUrl = await uploadGeneratedImage(
            imageSource,
            userId,
            `edit_image_${model}`
          )
          return finalImageUrl
        } catch (uploadError) {
          console.error(`[ImageEditTool] Upload failed:`, uploadError)
          return imageUrl
        }
      }

      return imageUrl
    } else if (status.status === "Error" || status.status === "Failed") {
      throw new Error(`Flux editing failed: ${status.error || status.status}`)
    }
  }

  throw new Error("Flux editing timeout after 60 seconds")
}

/**
 * Edit image using Nano Banana (Gemini) API
 */
async function editImageNanoBanana(
  apiKey: string,
  prompt: string,
  imageToEdit: string,
  userId?: string
): Promise<string> {
  const apiUrl =
    "https://api.cometapi.com/v1beta/models/gemini-3-pro-image:generateContent"

  // Convert image to base64 if it's a URL
  let base64Data: string
  if (imageToEdit.startsWith("data:image")) {
    // Extract base64 from data URL
    base64Data = imageToEdit.split(",")[1]
  } else {
    // Fetch URL and convert to base64
    const imageResponse = await fetch(imageToEdit)
    const imageBlob = await imageResponse.blob()
    const arrayBuffer = await imageBlob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    base64Data = uint8ArrayToBase64(bytes)
  }

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
            },
            {
              inlineData: {
                mimeType: "image/png",
                data: base64Data
              }
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
      `Nano Banana image editing failed: ${error.error?.message || response.statusText}`
    )
  }

  const data: NanoBananaResponse = await response.json()
  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    part => part.inlineData
  )

  if (!imagePart?.inlineData?.data) {
    throw new Error("No image data returned from Nano Banana API")
  }

  const resultBase64Data = imagePart.inlineData.data
  const imageSource = `data:image/png;base64,${resultBase64Data}`

  console.log(
    `[ImageEditTool] Nano Banana image edited successfully (${Math.round(resultBase64Data.length / 1024)}KB)`
  )

  // Upload to Supabase Storage
  if (userId) {
    try {
      const finalImageUrl = await uploadGeneratedImage(
        imageSource,
        userId,
        "edit_image_nanobanana"
      )
      return finalImageUrl
    } catch (uploadError) {
      console.error(`[ImageEditTool] Upload failed:`, uploadError)
      return imageSource // Fallback to base64
    }
  }

  return imageSource
}

/**
 * Edit image using Midjourney Blend API (async with polling)
 * Note: Midjourney doesn't have a traditional "edit" API, so we use Blend
 * which requires 2-5 images to blend together
 */
async function editImageMidjourney(
  apiKey: string,
  prompt: string,
  imagesToEdit: string[],
  userId?: string
): Promise<string> {
  const baseUrl = "https://api.cometapi.com"

  // Convert all images to base64 data URLs
  const imageDataUrls: string[] = []

  for (const imageUrl of imagesToEdit) {
    let imageDataUrl: string
    if (imageUrl.startsWith("data:image")) {
      imageDataUrl = imageUrl
    } else {
      const imageResponse = await fetch(imageUrl)
      const imageBlob = await imageResponse.blob()
      const arrayBuffer = await imageBlob.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const base64Data = uint8ArrayToBase64(bytes)
      imageDataUrl = `data:image/png;base64,${base64Data}`
    }
    imageDataUrls.push(imageDataUrl)
  }

  // Submit blend task with all images (2-5 required)
  const submitResponse = await fetch(`${baseUrl}/mj/submit/blend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      base64Array: imageDataUrls,
      dimensions: "SQUARE",
      botType: "MID_JOURNEY"
    })
  })

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text()
    throw new Error(`Midjourney blend submit failed: ${errorText}`)
  }

  const submitData: MidjourneyBlendSubmitResponse = await submitResponse.json()

  if (submitData.code !== 1) {
    throw new Error(`Midjourney blend submit failed: ${submitData.description}`)
  }

  const taskId = submitData.result
  console.log(
    `[ImageEditTool] Midjourney blend task created: ${taskId}, polling...`
  )

  // Poll for completion (max 180 seconds, check every 3 seconds)
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
        `Failed to poll Midjourney blend status: ${statusResponse.statusText}`
      )
    }

    const task: MidjourneyBlendTaskResponse = await statusResponse.json()
    console.log(
      `[ImageEditTool] Midjourney blend status: ${task.status} ${task.progress || ""}`
    )

    if (task.status === "SUCCESS") {
      if (!task.imageUrl) {
        throw new Error("No image URL in Midjourney blend response")
      }

      console.log(
        `[ImageEditTool] Midjourney blend image ready: ${task.imageUrl.substring(0, 80)}...`
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
            "edit_image_midjourney"
          )
          return finalImageUrl
        } catch (uploadError) {
          console.error(`[ImageEditTool] Upload failed:`, uploadError)
          return task.imageUrl
        }
      }

      return task.imageUrl
    } else if (task.status === "FAILURE") {
      throw new Error(
        `Midjourney blend failed: ${task.failReason || task.description}`
      )
    }

    // Continue polling for other statuses
  }

  throw new Error("Midjourney blend timeout after 180 seconds")
}

/**
 * Creates an image editing tool for LlamaIndex agent
 * Supports multiple APIs:
 * - OpenAI-compatible API (gpt-image-1.5, etc.)
 * - Midjourney Blend API (midjourney) - combines original image with AI-generated concepts
 * - Nano Banana (Gemini) API (nano-banana-pro)
 * - Flux API with polling (flex-2-pro, flux-*)
 * Edits user-uploaded images based on text prompts
 */
export function createImageEditTool(config: ImageEditConfig) {
  const { apiKey, baseURL, model = "gpt-image-1.5", userId } = config

  async function editImage(input: ImageEditInput): Promise<string> {
    const { prompt, image_index = 0, size = "1024x1024" } = input

    // Check if we have images to edit
    if (pendingUserImages.length === 0) {
      return "Error: No image uploaded for editing. Please ask the user to upload an image first."
    }

    // Validate image index
    if (image_index < 0 || image_index >= pendingUserImages.length) {
      return `Error: Invalid image index ${image_index}. User uploaded ${pendingUserImages.length} image(s). Valid indices: 0-${pendingUserImages.length - 1}.`
    }

    const imageToEdit = pendingUserImages[image_index]
    console.log(
      `[ImageEditTool] Editing image #${image_index + 1}/${pendingUserImages.length} with prompt: "${prompt.substring(0, 100)}..."`
    )
    console.log(`[ImageEditTool] Parameters: model=${model}, size=${size}`)

    try {
      // Use Midjourney Blend API for midjourney model
      if (model === "midjourney") {
        // Midjourney Blend requires 2-5 images
        if (pendingUserImages.length < 2) {
          return `Error: Midjourney Blend API requires 2-5 images to blend together, but only ${pendingUserImages.length} image was uploaded. Please upload at least 2 images to use Midjourney Blend, or use a different model (gpt-image-1.5, nano-banana-pro, or flex-2-pro) for single image editing.`
        }
        if (pendingUserImages.length > 5) {
          return `Error: Midjourney Blend API requires 2-5 images, but ${pendingUserImages.length} images were uploaded. Please upload between 2-5 images to use Midjourney Blend.`
        }

        // Use all uploaded images for blending
        const imageUrl = await editImageMidjourney(
          apiKey,
          prompt,
          pendingUserImages,
          userId
        )
        return `![Edited Image](${imageUrl})\n\n**Edit prompt:** ${prompt}\n**Model:** Midjourney v6.1 (Blend)\n**Images blended:** ${pendingUserImages.length}`
      }

      // Use Nano Banana API for nano-banana-pro model
      if (model === "nano-banana-pro") {
        const imageUrl = await editImageNanoBanana(
          apiKey,
          prompt,
          imageToEdit,
          userId
        )
        return `![Edited Image](${imageUrl})\n\n**Edit prompt:** ${prompt}\n**Model:** Nano Banana Pro`
      }

      // Use Flux API for flux models (flex-2-pro, etc.)
      if (model === "flex-2-pro" || model.startsWith("flux-")) {
        const imageUrl = await editImageFlux(
          apiKey,
          prompt,
          imageToEdit,
          model,
          size,
          userId
        )
        return `![Edited Image](${imageUrl})\n\n**Edit prompt:** ${prompt}\n**Model:** ${model}`
      }

      // Use OpenAI-compatible API for other models (gpt-image-1.5, etc.)
      const apiUrl = baseURL
        ? `${baseURL}/images/edits`
        : "https://api.openai.com/v1/images/edits"

      // Prepare form data for image edit API
      const formData = new FormData()

      // Convert base64 to blob if needed
      if (imageToEdit.startsWith("data:")) {
        const base64Data = imageToEdit.split(",")[1]
        const mimeType = imageToEdit.split(";")[0].split(":")[1]
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: mimeType })
        formData.append("image", blob, "image.png")
      } else {
        // If it's a URL, fetch it first
        const imageResponse = await fetch(imageToEdit)
        const imageBlob = await imageResponse.blob()
        formData.append("image", imageBlob, "image.png")
      }

      formData.append("prompt", prompt)
      formData.append("model", model)
      formData.append("n", "1")
      formData.append("size", size)
      //@TODO разобраться почему не поддерживается поле response_format
      //formData.append('response_format', 'url')

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: { message: response.statusText } }))
        throw new Error(
          `Image editing failed: ${error.error?.message || response.statusText}`
        )
      }

      const data: ImageEditResponse = await response.json()
      const imageData = data.data?.[0]

      if (!imageData) {
        throw new Error("No image data returned from API")
      }

      let imageSource: string

      // Use URL from API response
      if (imageData.url) {
        imageSource = imageData.url
        console.log(
          `[ImageEditTool] Image edited successfully (URL): ${imageData.url.substring(0, 80)}...`
        )
      } else if (imageData.b64_json) {
        imageSource = `data:image/png;base64,${imageData.b64_json}`
        console.log(
          `[ImageEditTool] Image edited successfully (base64, ${Math.round(imageData.b64_json.length / 1024)}KB)`
        )
      } else {
        throw new Error("No image URL or base64 data returned from API")
      }

      // Note: Don't clear images here - user might want to edit multiple images
      // Images will be cleared at the start of next message in agent.ts

      // Upload image to Supabase Storage to get public URL
      // CRITICAL: Don't return base64 in tool result - it will exceed context limits!
      let finalImageUrl = imageSource

      if (userId && imageSource.startsWith("data:image")) {
        // Upload base64 to storage and get public URL
        try {
          finalImageUrl = await uploadGeneratedImage(
            imageSource,
            userId,
            "edit_image"
          )
          console.log(`[ImageEditTool] Uploaded to storage: ${finalImageUrl}`)
        } catch (uploadError) {
          console.error(`[ImageEditTool] Upload failed:`, uploadError)
          // Fallback: return success without URL
          return `Image edited successfully, but failed to save. Size: ${size}.`
        }
      }

      // Return markdown with public URL (safe for context)
      const revisedInfo = imageData.revised_prompt
        ? `\n\n*Revised prompt: ${imageData.revised_prompt}*`
        : ""

      return `![Edited Image](${finalImageUrl})\n\n**Edit prompt:** ${prompt}${revisedInfo}\n**Size:** ${size}`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      console.error(`[ImageEditTool] Error: ${errorMessage}`)
      return `Error editing image: ${errorMessage}`
    }
  }

  return FunctionTool.from(
    (input: unknown) => editImage(input as ImageEditInput),
    {
      name: "edit_image",
      description:
        "Edit or modify an image that the user has uploaded. Use this tool when the user uploads an image and asks to modify, edit, change, transform, or process it. You can add elements, remove objects, change colors, apply effects, or make any visual modifications based on the text description. If multiple images are uploaded, use the image_index parameter to specify which one to edit (0 for first image, 1 for second, etc.).",
      parameters: imageEditSchema
    }
  )
}
