import { useItemsStore, useModelsStore, useProfileStore } from "@/stores"
import { LLM, LLMID, ModelProvider } from "@/types"
import { IconCheck, IconChevronDown } from "@tabler/icons-react"
import { FC, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "../ui/dropdown-menu"
import { Input } from "../ui/input"
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs"
import { ModelIcon } from "./model-icon"
import { ModelOption } from "./model-option"

interface ModelSelectProps {
  selectedModelId: string
  selectedModelProvider?: string
  onSelectModel: (modelId: LLMID, provider: string) => void
}

export const ModelSelect: FC<ModelSelectProps> = ({
  selectedModelId,
  selectedModelProvider,
  onSelectModel
}) => {
  const { t } = useTranslation()
  const profile = useProfileStore(state => state.profile)
  const models = useItemsStore(state => state.models)
  const availableHostedModels = useModelsStore(
    state => state.availableHostedModels
  )
  const availableLocalModels = useModelsStore(
    state => state.availableLocalModels
  )
  const availableOpenRouterModels = useModelsStore(
    state => state.availableOpenRouterModels
  )

  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<"hosted" | "local">("hosted")

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100) // FIX: hacky
    }
  }, [isOpen])

  const handleSelectModel = (modelId: LLMID, provider: string) => {
    onSelectModel(modelId, provider)
    setIsOpen(false)
  }

  const allModels = [
    ...models.map(model => ({
      modelId: model.model_id as LLMID,
      modelName: model.name,
      provider: "custom" as ModelProvider,
      hostedId: model.id,
      platformLink: "",
      imageInput: false
    })),
    ...availableHostedModels,
    ...availableLocalModels,
    ...availableOpenRouterModels
  ]

  const groupedModels = allModels.reduce<Record<string, LLM[]>>(
    (groups, model) => {
      const key = model.provider
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(model)
      return groups
    },
    {}
  )

  const selectedModel = allModels.find(model => {
    if (selectedModelProvider) {
      // Match both modelId and provider for unique identification
      return (
        model.modelId === selectedModelId &&
        model.provider === selectedModelProvider
      )
    }
    // Fallback: match by modelId only (for backward compatibility)
    return model.modelId === selectedModelId
  })

  if (!profile) return null

  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={isOpen => {
        setIsOpen(isOpen)
        setSearch("")
      }}
    >
      <DropdownMenuTrigger
        className="w-full justify-start border-2 bg-background px-3 py-5"
        asChild
        disabled={allModels.length === 0}
      >
        {allModels.length === 0 ? (
          <div className="rounded text-sm font-bold">
            {t("model.unlockModels")}
          </div>
        ) : (
          <Button
            ref={triggerRef}
            className="flex items-center justify-between"
            variant="ghost"
          >
            <div className="flex items-center">
              {selectedModel ? (
                <>
                  <ModelIcon
                    provider={selectedModel?.provider}
                    width={26}
                    height={26}
                  />
                  <div className="ml-2 flex items-center">
                    {selectedModel?.modelName}
                    {selectedModel?.provider === "comet" && (
                      <span className="ml-2 rounded bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-500">
                        Comet
                      </span>
                    )}
                    {selectedModel?.provider === "routerai" && (
                      <span className="ml-2 rounded bg-purple-500/20 px-1.5 py-0.5 text-xs text-purple-500">
                        Router AI
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center">
                  {t("model.selectModel")}
                </div>
              )}
            </div>

            <IconChevronDown />
          </Button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="space-y-2 overflow-auto p-2"
        style={{ width: triggerRef.current?.offsetWidth }}
        align="start"
      >
        <Tabs value={tab} onValueChange={(value: any) => setTab(value)}>
          {availableLocalModels.length > 0 && (
            <TabsList defaultValue="hosted" className="grid grid-cols-2">
              <TabsTrigger value="hosted">{t("model.hosted")}</TabsTrigger>

              <TabsTrigger value="local">{t("model.local")}</TabsTrigger>
            </TabsList>
          )}
        </Tabs>

        <Input
          ref={inputRef}
          className="w-full"
          placeholder={t("model.searchModels")}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="max-h-[300px] overflow-auto">
          {Object.entries(groupedModels).map(([provider, models]) => {
            const filteredModels = models
              .filter(model => {
                if (tab === "hosted") return model.provider !== "ollama"
                if (tab === "local") return model.provider === "ollama"
                if (tab === "openrouter") return model.provider === "openrouter"
              })
              .filter(model =>
                model.modelName.toLowerCase().includes(search.toLowerCase())
              )
              .sort((a, b) => a.provider.localeCompare(b.provider))

            if (filteredModels.length === 0) return null

            return (
              <div key={provider}>
                <div className="mb-1 ml-2 text-xs font-bold tracking-wide opacity-50">
                  {provider === "openai" && profile.use_azure_openai
                    ? "AZURE OPENAI"
                    : provider.toLocaleUpperCase()}
                </div>

                <div className="mb-4">
                  {filteredModels.map(model => {
                    return (
                      <div
                        key={model.modelId}
                        className="flex items-center space-x-1"
                      >
                        {selectedModelId === model.modelId && (
                          <IconCheck className="ml-2" size={32} />
                        )}

                        <ModelOption
                          key={`${model.provider}-${model.modelId}`}
                          model={model}
                          onSelect={() =>
                            handleSelectModel(model.modelId, model.provider)
                          }
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
