import {
  useAttachmentsStore,
  useChatStore,
  useItemsStore,
  usePresetStore,
  useToolStore,
  useWorkspaceStore
} from "@/stores"
import useHotkey from "@/lib/hooks/use-hotkey"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { Tables } from "@/supabase/types"
import { LLMID } from "@/types"
import { IconChevronDown } from "@tabler/icons-react"
import { FC, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { ModelIcon } from "../models/model-icon"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "../ui/dropdown-menu"
import { Input } from "../ui/input"
import { QuickSettingOption } from "./quick-setting-option"

interface QuickSettingsProps {}

export const QuickSettings: FC<QuickSettingsProps> = ({}) => {
  const { t } = useTranslation()

  useHotkey("p", () => setIsOpen(prevState => !prevState))

  const presets = useItemsStore(state => state.presets)
  const selectedPreset = usePresetStore(state => state.selectedPreset)
  const chatSettings = useChatStore(state => state.chatSettings)
  const setSelectedPreset = usePresetStore(state => state.setSelectedPreset)
  const setChatSettings = useChatStore(state => state.setChatSettings)
  const setChatFiles = useAttachmentsStore(state => state.setChatFiles)
  const setSelectedTools = useToolStore(state => state.setSelectedTools)
  const setShowFilesDisplay = useAttachmentsStore(
    state => state.setShowFilesDisplay
  )
  const selectedWorkspace = useWorkspaceStore(state => state.selectedWorkspace)

  const inputRef = useRef<HTMLInputElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100) // FIX: hacky
    }
  }, [isOpen])

  const handleSelectQuickSetting = async (
    item: Tables<"presets"> | null,
    contentType: "presets" | "remove"
  ) => {
    if (contentType === "presets" && item) {
      setSelectedPreset(item as Tables<"presets">)
      setChatFiles([])
      setSelectedTools([])
    } else {
      setSelectedPreset(null)
      setChatFiles([])
      setSelectedTools([])
      if (selectedWorkspace) {
        setChatSettings({
          model: selectedWorkspace.default_model as LLMID,
          prompt: selectedWorkspace.default_prompt,
          includeProfileContext: selectedWorkspace.include_profile_context,
          includeWorkspaceInstructions:
            selectedWorkspace.include_workspace_instructions,
          embeddingsProvider: selectedWorkspace.embeddings_provider as
            | "openai"
            | "local"
        })
      }
      return
    }

    setChatSettings({
      model: item.model as LLMID,
      prompt: item.prompt,
      includeProfileContext: item.include_profile_context,
      includeWorkspaceInstructions: item.include_workspace_instructions,
      embeddingsProvider: item.embeddings_provider as "openai" | "local"
    })
  }

  const checkIfModified = () => {
    if (!chatSettings) return false

    if (selectedPreset) {
      return (
        selectedPreset.include_profile_context !==
          chatSettings?.includeProfileContext ||
        selectedPreset.include_workspace_instructions !==
          chatSettings.includeWorkspaceInstructions ||
        selectedPreset.model !== chatSettings.model ||
        selectedPreset.prompt !== chatSettings.prompt
      )
    }

    return false
  }

  const isModified = checkIfModified()

  const items = [
    ...presets.map(preset => ({ ...preset, contentType: "presets" }))
  ]

  const modelDetails = LLM_LIST.find(
    model => model.modelId === selectedPreset?.model
  )

  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={isOpen => {
        setIsOpen(isOpen)
        setSearch("")
      }}
    >
      <DropdownMenuTrigger asChild className="max-w-[400px]" disabled={loading}>
        <Button variant="ghost" className="flex space-x-3 text-lg">
          {selectedPreset && (
            <ModelIcon
              provider={modelDetails?.provider || "custom"}
              width={32}
              height={32}
            />
          )}

          {loading ? (
            <div className="animate-pulse">
              {t("assistant.loadingAssistant")}
            </div>
          ) : (
            <>
              <div className="overflow-hidden text-ellipsis">
                {isModified && selectedPreset && t("settings.modified")}

                {selectedPreset?.name || t("settings.quickSettings")}
              </div>

              <IconChevronDown className="ml-1" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="min-w-[300px] max-w-[500px] space-y-4"
        align="start"
      >
        {presets.length === 0 ? (
          <div className="p-8 text-center">{t("settings.noItemsFound")}</div>
        ) : (
          <>
            <Input
              ref={inputRef}
              className="w-full"
              placeholder={t("settings.search")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.stopPropagation()}
            />

            {!!selectedPreset && (
              <QuickSettingOption
                contentType={"presets"}
                isSelected={true}
                item={selectedPreset}
                onSelect={() => {
                  handleSelectQuickSetting(null, "remove")
                }}
                image={""}
              />
            )}

            {items
              .filter(
                item =>
                  item.name.toLowerCase().includes(search.toLowerCase()) &&
                  item.id !== selectedPreset?.id
              )
              .map(({ contentType, ...item }) => (
                <QuickSettingOption
                  key={item.id}
                  contentType={contentType as "presets"}
                  isSelected={false}
                  item={item as Tables<"presets">}
                  onSelect={() =>
                    handleSelectQuickSetting(
                      item as Tables<"presets">,
                      contentType as "presets"
                    )
                  }
                  image={""}
                />
              ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
