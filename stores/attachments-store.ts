import { create } from "zustand"
import { z } from "zod"
import { ChatFile, MessageImage } from "@/types"

const AttachmentsStateSchema = z.object({
  chatFiles: z.custom<ChatFile[]>(),
  chatImages: z.custom<MessageImage[]>(),
  newMessageFiles: z.custom<ChatFile[]>(),
  newMessageImages: z.custom<MessageImage[]>(),
  showFilesDisplay: z.boolean()
})

type AttachmentsState = z.infer<typeof AttachmentsStateSchema>

interface AttachmentsActions {
  setChatFiles: (
    files: ChatFile[] | ((prev: ChatFile[]) => ChatFile[])
  ) => void
  setChatImages: (
    images: MessageImage[] | ((prev: MessageImage[]) => MessageImage[])
  ) => void
  setNewMessageFiles: (
    files: ChatFile[] | ((prev: ChatFile[]) => ChatFile[])
  ) => void
  setNewMessageImages: (
    images: MessageImage[] | ((prev: MessageImage[]) => MessageImage[])
  ) => void
  setShowFilesDisplay: (value: boolean | ((prev: boolean) => boolean)) => void
}

const initialState: AttachmentsState = AttachmentsStateSchema.parse({
  chatFiles: [],
  chatImages: [],
  newMessageFiles: [],
  newMessageImages: [],
  showFilesDisplay: false
})

export const useAttachmentsStore = create<
  AttachmentsState & AttachmentsActions
>(set => ({
  ...initialState,
  setChatFiles: chatFiles =>
    set(state => ({
      chatFiles:
        typeof chatFiles === "function" ? chatFiles(state.chatFiles) : chatFiles
    })),
  setChatImages: chatImages =>
    set(state => ({
      chatImages:
        typeof chatImages === "function"
          ? chatImages(state.chatImages)
          : chatImages
    })),
  setNewMessageFiles: newMessageFiles =>
    set(state => ({
      newMessageFiles:
        typeof newMessageFiles === "function"
          ? newMessageFiles(state.newMessageFiles)
          : newMessageFiles
    })),
  setNewMessageImages: newMessageImages =>
    set(state => ({
      newMessageImages:
        typeof newMessageImages === "function"
          ? newMessageImages(state.newMessageImages)
          : newMessageImages
    })),
  setShowFilesDisplay: showFilesDisplay =>
    set(state => ({
      showFilesDisplay:
        typeof showFilesDisplay === "function"
          ? showFilesDisplay(state.showFilesDisplay)
          : showFilesDisplay
    }))
}))
