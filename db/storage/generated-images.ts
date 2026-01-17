import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Upload a generated/edited image to Supabase Storage
 * @param base64Data - Base64 encoded image data (with or without data:image prefix)
 * @param userId - User ID for organizing files
 * @param toolName - Tool name (generate_image or edit_image)
 * @returns Public URL of the uploaded image
 */
export async function uploadGeneratedImage(
  base64Data: string,
  userId: string,
  toolName: string
): Promise<string> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {
          // Not needed for storage operations
        },
        remove() {
          // Not needed for storage operations
        }
      }
    }
  )
  const bucket = "generated_images"

  // Remove data:image/png;base64, prefix if present
  const base64Clean = base64Data.includes(",")
    ? base64Data.split(",")[1]
    : base64Data

  // Convert base64 to buffer
  const buffer = Buffer.from(base64Clean, "base64")

  // Generate unique filename
  const timestamp = Date.now()
  const filename = `${userId}/${toolName}_${timestamp}.png`

  // Upload to Supabase Storage
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filename, buffer, {
      contentType: "image/png",
      upsert: false
    })

  if (error) {
    console.error("[UploadGeneratedImage] Error:", error)
    throw new Error(`Failed to upload image: ${error.message}`)
  }

  // Get public URL
  const {
    data: { publicUrl }
  } = supabase.storage.from(bucket).getPublicUrl(filename)

  console.log(
    `[UploadGeneratedImage] Uploaded ${Math.round(buffer.length / 1024)}KB to ${publicUrl}`
  )

  return publicUrl
}

/**
 * Delete a generated image from storage
 */
export async function deleteGeneratedImage(filePath: string): Promise<void> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {}
      }
    }
  )
  const bucket = "generated_images"

  const { error } = await supabase.storage.from(bucket).remove([filePath])

  if (error) {
    console.error("[DeleteGeneratedImage] Error:", error)
    throw new Error(`Failed to delete image: ${error.message}`)
  }
}
