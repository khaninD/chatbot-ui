import { SidebarCreateItem } from "@/components/sidebar/items/all/sidebar-create-item"
import { ChatSettingsForm } from "@/components/ui/chat-settings-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useProfileStore, useWorkspaceStore } from "@/stores"
import { PRESET_NAME_MAX } from "@/db/limits"
import { TablesInsert } from "@/supabase/types"
import { ChatSettings, LLMID } from "@/types"
import { FC, useState } from "react"

interface CreatePresetProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

export const CreatePreset: FC<CreatePresetProps> = ({
  isOpen,
  onOpenChange
}) => {
  const profile = useProfileStore(state => state.profile)
  const selectedWorkspace = useWorkspaceStore(state => state.selectedWorkspace)

  const [name, setName] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [description, setDescription] = useState("")
  const [presetChatSettings, setPresetChatSettings] = useState<ChatSettings>({
    model: (selectedWorkspace?.default_model as LLMID) || "gpt-4o",
    prompt:
      selectedWorkspace?.default_prompt || "You are a helpful AI assistant.",
    includeProfileContext: selectedWorkspace?.include_profile_context || true,
    includeWorkspaceInstructions:
      selectedWorkspace?.include_workspace_instructions || true,
    embeddingsProvider:
      (selectedWorkspace?.embeddings_provider as "openai" | "local") || "openai"
  })

  if (!profile) return null
  if (!selectedWorkspace) return null

  return (
    <SidebarCreateItem
      contentType="presets"
      isOpen={isOpen}
      isTyping={isTyping}
      onOpenChange={onOpenChange}
      createState={
        {
          user_id: profile.user_id,
          name,
          description,
          include_profile_context: presetChatSettings.includeProfileContext,
          include_workspace_instructions:
            presetChatSettings.includeWorkspaceInstructions,
          model: presetChatSettings.model,
          prompt: presetChatSettings.prompt,
          embeddings_provider: presetChatSettings.embeddingsProvider
        } as TablesInsert<"presets">
      }
      renderInputs={() => (
        <>
          <div className="space-y-1">
            <Label>Name</Label>

            <Input
              placeholder="Preset name..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={PRESET_NAME_MAX}
            />
          </div>

          <ChatSettingsForm
            chatSettings={presetChatSettings}
            onChangeChatSettings={setPresetChatSettings}
            useAdvancedDropdown={true}
          />
        </>
      )}
    />
  )
}
