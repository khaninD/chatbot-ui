import { FunctionTool } from "@llamaindex/core/tools"
import { uploadGeneratedImage } from "@/db/storage/generated-images"

interface ImageEditInput {
  prompt: string
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

const imageEditSchema = {
  type: "object" as const,
  properties: {
    prompt: {
      type: "string" as const,
      description:
        "A detailed description of the edits to make to the uploaded image. Describe what changes you want: add elements, remove objects, change colors, apply effects, etc."
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
 * Creates an image editing tool for LlamaIndex agent
 * Uses OpenAI-compatible API (works with Comet API)
 * Edits user-uploaded images based on text prompts
 */
export function createImageEditTool(config: ImageEditConfig) {
  const { apiKey, baseURL, model = "gpt-image-1.5", userId } = config

  async function editImage(input: ImageEditInput): Promise<string> {
    const { prompt, size = "1024x1024" } = input

    // Check if we have an image to edit
    if (pendingUserImages.length === 0) {
      return "Error: No image uploaded for editing. Please ask the user to upload an image first."
    }

    const imageToEdit = pendingUserImages[0] // Use first image
    console.log(
      `[ImageEditTool] Editing image with prompt: "${prompt.substring(0, 100)}..."`
    )
    console.log(`[ImageEditTool] Parameters: model=${model}, size=${size}`)

    try {
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

      // Clear pending images after successful edit
      clearUserImages()

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
        "Edit or modify an image that the user has uploaded. Use this tool when the user uploads an image and asks to modify, edit, change, transform, or process it. You can add elements, remove objects, change colors, apply effects, or make any visual modifications based on the text description.",
      parameters: imageEditSchema
    }
  )
}
