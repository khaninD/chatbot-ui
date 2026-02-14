import { create } from "zustand"
import { z } from "zod"

const ChatInputStateSchema = z.object({
  isPromptPickerOpen: z.boolean(),
  slashCommand: z.string(),
  isFilePickerOpen: z.boolean(),
  hashtagCommand: z.string(),
  isToolPickerOpen: z.boolean(),
  toolCommand: z.string(),
  focusPrompt: z.boolean(),
  focusFile: z.boolean(),
  focusTool: z.boolean()
})

type ChatInputState = z.infer<typeof ChatInputStateSchema>

interface ChatInputActions {
  setIsPromptPickerOpen: (value: boolean) => void
  setSlashCommand: (value: string) => void
  setIsFilePickerOpen: (value: boolean) => void
  setHashtagCommand: (value: string) => void
  setIsToolPickerOpen: (value: boolean) => void
  setToolCommand: (value: string) => void
  setFocusPrompt: (value: boolean) => void
  setFocusFile: (value: boolean) => void
  setFocusTool: (value: boolean) => void
}

const initialState: ChatInputState = ChatInputStateSchema.parse({
  isPromptPickerOpen: false,
  slashCommand: "",
  isFilePickerOpen: false,
  hashtagCommand: "",
  isToolPickerOpen: false,
  toolCommand: "",
  focusPrompt: false,
  focusFile: false,
  focusTool: false
})

export const useChatInputStore = create<ChatInputState & ChatInputActions>(
  set => ({
    ...initialState,
    setIsPromptPickerOpen: isPromptPickerOpen => set({ isPromptPickerOpen }),
    setSlashCommand: slashCommand => set({ slashCommand }),
    setIsFilePickerOpen: isFilePickerOpen => set({ isFilePickerOpen }),
    setHashtagCommand: hashtagCommand => set({ hashtagCommand }),
    setIsToolPickerOpen: isToolPickerOpen => set({ isToolPickerOpen }),
    setToolCommand: toolCommand => set({ toolCommand }),
    setFocusPrompt: focusPrompt => set({ focusPrompt }),
    setFocusFile: focusFile => set({ focusFile }),
    setFocusTool: focusTool => set({ focusTool })
  })
)
