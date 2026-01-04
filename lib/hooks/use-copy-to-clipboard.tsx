import { useState } from "react"

export interface useCopyToClipboardProps {
  timeout?: number
}

export function useCopyToClipboard({
  timeout = 2000
}: useCopyToClipboardProps) {
  const [isCopied, setIsCopied] = useState<boolean>(false)

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea")
      textArea.value = text
      textArea.style.position = "fixed"
      textArea.style.left = "-999999px"
      textArea.style.top = "-999999px"
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()

      const successful = document.execCommand("copy")
      document.body.removeChild(textArea)

      if (successful) {
        setIsCopied(true)
        setTimeout(() => {
          setIsCopied(false)
        }, timeout)
      }
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
    }
  }

  const copyToClipboard = (value: string) => {
    if (typeof window === "undefined") {
      return
    }

    if (!value) {
      return
    }

    // Try modern clipboard API first
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(value)
        .then(() => {
          setIsCopied(true)

          setTimeout(() => {
            setIsCopied(false)
          }, timeout)
        })
        .catch(() => {
          // Fallback to legacy method
          fallbackCopy(value)
        })
    } else {
      // Use fallback method if clipboard API not available
      fallbackCopy(value)
    }
  }

  return { isCopied, copyToClipboard }
}
