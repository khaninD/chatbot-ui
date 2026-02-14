import { useEffect } from "react"

const useHotkey = (key: string, callback: () => void): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const isMac =
        typeof window !== "undefined" &&
        navigator.userAgent.toUpperCase().indexOf("MAC") >= 0
      const modifier = isMac ? event.metaKey : event.ctrlKey

      const shiftKeyMap: { [key: string]: string } = {
        "?": "/",
        ":": ";",
        O: "o",
        L: "l",
        S: "s",
        I: "i",
        F: "f",
        E: "e",
        K: "k"
      }

      const normalizedKey = (
        shiftKeyMap[event.key] ||
        event.key ||
        ""
      ).toLowerCase()

      if (modifier && event.shiftKey && normalizedKey === key.toLowerCase()) {
        event.preventDefault()
        event.stopPropagation()
        callback()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [key, callback])
}

export default useHotkey
