"use client"

import { ChatbotUIContext } from "@/context/context"
import { CHAT_SETTING_LIMITS } from "@/lib/chat-setting-limits"
import { ChatSettings } from "@/types"
import { IconInfoCircle } from "@tabler/icons-react"
import { FC, useContext } from "react"
import { useTranslation } from "react-i18next"
import { ModelSelect } from "../models/model-select"
import { AdvancedSettings } from "./advanced-settings"
import { Checkbox } from "./checkbox"
import { Label } from "./label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "./select"
import { Slider } from "./slider"
import { TextareaAutosize } from "./textarea-autosize"
import { WithTooltip } from "./with-tooltip"

interface ChatSettingsFormProps {
  chatSettings: ChatSettings
  onChangeChatSettings: (value: ChatSettings) => void
  useAdvancedDropdown?: boolean
  showTooltip?: boolean
}

export const ChatSettingsForm: FC<ChatSettingsFormProps> = ({
  chatSettings,
  onChangeChatSettings,
  useAdvancedDropdown = true,
  showTooltip = true
}) => {
  const { t } = useTranslation()
  const { profile, models } = useContext(ChatbotUIContext)

  if (!profile) return null

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>{t("settings.model")}</Label>

        <ModelSelect
          selectedModelId={chatSettings.model}
          onSelectModel={model => {
            onChangeChatSettings({ ...chatSettings, model })
          }}
        />
      </div>

      <div className="space-y-1">
        <Label>{t("settings.prompt")}</Label>

        <TextareaAutosize
          className="border-2 border-input bg-background"
          placeholder={t("prompt.defaultPrompt")}
          onValueChange={prompt => {
            onChangeChatSettings({ ...chatSettings, prompt })
          }}
          value={chatSettings.prompt}
          minRows={3}
          maxRows={6}
        />
      </div>

      {useAdvancedDropdown ? (
        <AdvancedSettings>
          <AdvancedContent
            chatSettings={chatSettings}
            onChangeChatSettings={onChangeChatSettings}
            showTooltip={showTooltip}
          />
        </AdvancedSettings>
      ) : (
        <div>
          <AdvancedContent
            chatSettings={chatSettings}
            onChangeChatSettings={onChangeChatSettings}
            showTooltip={showTooltip}
          />
        </div>
      )}
    </div>
  )
}

interface AdvancedContentProps {
  chatSettings: ChatSettings
  onChangeChatSettings: (value: ChatSettings) => void
  showTooltip: boolean
}

const AdvancedContent: FC<AdvancedContentProps> = ({
  chatSettings,
  onChangeChatSettings,
  showTooltip
}) => {
  const { t } = useTranslation()
  const {
    profile,
    selectedWorkspace,
    availableOpenRouterModels,
    models,
    mcpServers,
    availableHostedModels
  } = useContext(ChatbotUIContext)

  const isCustomModel = models.some(
    model => model.model_id === chatSettings.model
  )

  function findOpenRouterModel(modelId: string) {
    return availableOpenRouterModels.find(model => model.modelId === modelId)
  }

  const MODEL_LIMITS = CHAT_SETTING_LIMITS[chatSettings.model] || {
    MIN_TEMPERATURE: 0,
    MAX_TEMPERATURE: 1,
    MAX_CONTEXT_LENGTH:
      findOpenRouterModel(chatSettings.model)?.maxContext || 4096
  }

  return (
    <div className="mt-5">
      <div className="space-y-3">
        <Label className="flex items-center space-x-1">
          <div>{t("settings.temperature")}</div>

          <div>{chatSettings.temperature}</div>
        </Label>

        <Slider
          value={[chatSettings.temperature]}
          onValueChange={temperature => {
            onChangeChatSettings({
              ...chatSettings,
              temperature: temperature[0]
            })
          }}
          min={MODEL_LIMITS.MIN_TEMPERATURE}
          max={MODEL_LIMITS.MAX_TEMPERATURE}
          step={0.01}
        />
      </div>

      <div className="mt-6 space-y-3">
        <Label className="flex items-center space-x-1">
          <div>{t("settings.contextLength")}</div>

          <div>{chatSettings.contextLength}</div>
        </Label>

        <Slider
          value={[chatSettings.contextLength]}
          onValueChange={contextLength => {
            onChangeChatSettings({
              ...chatSettings,
              contextLength: contextLength[0]
            })
          }}
          min={0}
          max={
            isCustomModel
              ? models.find(model => model.model_id === chatSettings.model)
                  ?.context_length
              : MODEL_LIMITS.MAX_CONTEXT_LENGTH
          }
          step={1}
        />
      </div>

      <div className="mt-7 flex items-center space-x-2">
        <Checkbox
          checked={chatSettings.includeProfileContext}
          onCheckedChange={(value: boolean) =>
            onChangeChatSettings({
              ...chatSettings,
              includeProfileContext: value
            })
          }
        />

        <Label>{t("settings.profileContext")}</Label>

        {showTooltip && (
          <WithTooltip
            delayDuration={0}
            display={
              <div className="w-[400px] p-3">
                {profile?.profile_context || t("settings.noProfileContext")}
              </div>
            }
            trigger={
              <IconInfoCircle className="cursor-hover:opacity-50" size={16} />
            }
          />
        )}
      </div>

      <div className="mt-4 flex items-center space-x-2">
        <Checkbox
          checked={chatSettings.includeWorkspaceInstructions}
          onCheckedChange={(value: boolean) =>
            onChangeChatSettings({
              ...chatSettings,
              includeWorkspaceInstructions: value
            })
          }
        />

        <Label>{t("settings.workspaceInstructions")}</Label>

        {showTooltip && (
          <WithTooltip
            delayDuration={0}
            display={
              <div className="w-[400px] p-3">
                {selectedWorkspace?.instructions ||
                  t("settings.noWorkspaceInstructions")}
              </div>
            }
            trigger={
              <IconInfoCircle className="cursor-hover:opacity-50" size={16} />
            }
          />
        )}
      </div>

      <div className="mt-5">
        <Label>{t("settings.embeddingsProvider")}</Label>

        <Select
          value={chatSettings.embeddingsProvider}
          onValueChange={(embeddingsProvider: "openai" | "local") => {
            onChangeChatSettings({
              ...chatSettings,
              embeddingsProvider
            })
          }}
        >
          <SelectTrigger>
            <SelectValue defaultValue="openai" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="openai">
              {profile?.use_azure_openai ? "Azure OpenAI" : "OpenAI"}
            </SelectItem>

            {window.location.hostname === "localhost" && (
              <SelectItem value="local">{t("model.local")}</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-5">
        <Label>MCP Servers</Label>
        <div className="mt-2 max-h-[200px] space-y-2 overflow-y-auto rounded-md border-2 border-input p-3">
          {mcpServers.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No MCP servers available
            </div>
          ) : (
            mcpServers.map(server => (
              <div key={server.id} className="flex items-center space-x-2">
                <Checkbox
                  checked={
                    chatSettings.mcpServerIds?.includes(server.id) || false
                  }
                  onCheckedChange={(checked: boolean) => {
                    const currentIds = chatSettings.mcpServerIds || []
                    const newIds = checked
                      ? [...currentIds, server.id]
                      : currentIds.filter(id => id !== server.id)
                    onChangeChatSettings({
                      ...chatSettings,
                      mcpServerIds: newIds.length > 0 ? newIds : undefined
                    })
                  }}
                />
                <Label className="cursor-pointer font-normal">
                  {server.name}
                </Label>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center space-x-2">
        <Checkbox
          checked={chatSettings.useAdvancedRAG || false}
          onCheckedChange={(value: boolean) =>
            onChangeChatSettings({
              ...chatSettings,
              useAdvancedRAG: value
            })
          }
        />

        <Label>Advanced RAG (RouterQueryEngine)</Label>

        {showTooltip && (
          <WithTooltip
            delayDuration={0}
            display={
              <div className="w-[400px] p-3">
                Uses LlamaIndex RouterQueryEngine with VectorStoreIndex and
                SummaryIndex for intelligent query routing. Better for complex
                questions and summarization tasks.
              </div>
            }
            trigger={
              <IconInfoCircle className="cursor-hover:opacity-50" size={16} />
            }
          />
        )}
      </div>

      <div className="mt-4 flex items-center space-x-2">
        <Checkbox
          checked={chatSettings.useReranking || false}
          onCheckedChange={(value: boolean) =>
            onChangeChatSettings({
              ...chatSettings,
              useReranking: value
            })
          }
        />

        <Label>LLM Reranking</Label>

        {showTooltip && (
          <WithTooltip
            delayDuration={0}
            display={
              <div className="w-[400px] p-3">
                Uses LLM-based reranking to improve search quality. Retrieved
                chunks are reranked by an LLM to find the most relevant results,
                improving accuracy by 20-40% compared to vector search alone.
              </div>
            }
            trigger={
              <IconInfoCircle className="cursor-hover:opacity-50" size={16} />
            }
          />
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={chatSettings.enableImageGeneration || false}
            onCheckedChange={(value: boolean) =>
              onChangeChatSettings({
                ...chatSettings,
                enableImageGeneration: value
              })
            }
          />

          <Label>Image Generation</Label>

          {showTooltip && (
            <WithTooltip
              delayDuration={0}
              display={
                <div className="w-[400px] p-3">
                  Enables the agent to generate and edit images using Comet API
                  models. When enabled, you can ask the agent to create, draw,
                  or generate images based on text descriptions.
                </div>
              }
              trigger={
                <IconInfoCircle className="cursor-hover:opacity-50" size={16} />
              }
            />
          )}
        </div>

        {chatSettings.enableImageGeneration && (
          <div className="space-y-1">
            <Label>Image Model</Label>

            <Select
              value={chatSettings.imageModel || "gpt-image-1.5"}
              onValueChange={(value: string) =>
                onChangeChatSettings({
                  ...chatSettings,
                  imageModel: value
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select image model" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="gpt-image-1.5">GPT Image 1.5</SelectItem>
                <SelectItem value="nano-banana-pro">Nano Banana Pro</SelectItem>
                <SelectItem value="flex-2-pro">Flex 2 Pro</SelectItem>
                <SelectItem value="kling-image">Kling Image</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}
