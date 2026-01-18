/**
 * Convert Uint8Array to base64 using chunked approach to avoid stack overflow on large images
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binaryString = ""
  const chunkSize = 0x8000 // 32KB chunks
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binaryString += String.fromCharCode.apply(null, Array.from(chunk))
  }
  return btoa(binaryString)
}
