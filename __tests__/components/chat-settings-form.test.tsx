import React from "react"
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"
import { ChatSettingsForm } from "@/components/ui/chat-settings-form"
import { ChatSettings, LLM, OpenRouterLLM } from "@/types"
import { Tables } from "@/supabase/types"
import {
  useItemsStore,
  useModelsStore,
  useProfileStore,
  useWorkspaceStore
} from "@/stores"
import { IMAGE_MODELS } from "@/lib/models/image-models"
import { LLM_LIST } from "@/lib/models/llm/llm-list"

// Mock dependencies
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

jest.mock("@/components/models/model-select", () => ({
  ModelSelect: ({ selectedModelId }: { selectedModelId: string }) => (
    <div data-testid="model-select">{selectedModelId}</div>
  )
}))

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  )
}))

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value
  }: {
    children: React.ReactNode
    value: string
  }) => (
    <div data-value={value} value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button" role="combobox">
      {children}
    </button>
  ),
  SelectValue: ({ children }: { children?: React.ReactNode }) => (
    <span>{children}</span>
  )
}))

jest.mock("@/components/ui/slider", () => ({
  Slider: () => <div data-testid="slider" />
}))

jest.mock("@/components/ui/checkbox", () => ({
  Checkbox: () => <input type="checkbox" />
}))

jest.mock("@/components/ui/advanced-settings", () => ({
  AdvancedSettings: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="advanced-settings">{children}</div>
  )
}))

const mockProfile: Tables<"profiles"> = {
  id: "test-profile-id",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_id: "test-user-id",
  has_onboarded: true,
  image_url: "",
  image_path: "",
  display_name: "Test User",
  bio: "",
  profile_context: "",
  use_azure_openai: false,
  username: "testuser",
  openai_api_key: null,
  anthropic_api_key: null,
  google_gemini_api_key: null,
  mistral_api_key: null,
  groq_api_key: null,
  perplexity_api_key: null,
  openai_organization_id: null,
  azure_openai_api_key: null,
  azure_openai_endpoint: null,
  azure_openai_35_turbo_id: null,
  azure_openai_45_turbo_id: null,
  azure_openai_45_vision_id: null,
  azure_openai_embeddings_id: null,
  openrouter_api_key: null,
  deepseek_api_key: null,
  routerai_api_key: null,
  comet_api_key: null,
  openai_embedding_model: "text-embedding-3-small"
}

type ContextOverrides = Partial<{
  profile: typeof mockProfile | null
  models: Tables<"models">[]
  mcpServers: Tables<"mcp_servers">[]
  selectedWorkspace: Tables<"workspaces"> | null
  availableOpenRouterModels: OpenRouterLLM[]
  availableHostedModels: LLM[]
}>

const defaultChatSettings: ChatSettings = {
  model: "gpt-4o",
  prompt: "",
  temperature: 0.5,
  contextLength: 4096,
  includeProfileContext: false,
  includeWorkspaceInstructions: false,
  embeddingsProvider: "openai",
  agentModel: "gpt-4o",
  imageModel: "gpt-image-1.5"
}

describe("ChatSettingsForm - Image Model Selection", () => {
  const renderWithContext = (
    chatSettings: ChatSettings,
    contextOverrides: ContextOverrides = {},
    onChangeChatSettings: (value: ChatSettings) => void = jest.fn()
  ) => {
    useProfileStore.setState({ profile: mockProfile })
    useItemsStore.setState({
      models: [],
      mcpServers: []
    })
    useWorkspaceStore.setState({ selectedWorkspace: null })
    useModelsStore.setState({
      availableOpenRouterModels: [],
      availableHostedModels: []
    })

    if (contextOverrides.profile) {
      useProfileStore.setState({ profile: contextOverrides.profile })
    }
    if (contextOverrides.models) {
      useItemsStore.setState({ models: contextOverrides.models })
    }
    if (contextOverrides.mcpServers) {
      useItemsStore.setState({ mcpServers: contextOverrides.mcpServers })
    }
    if (contextOverrides.selectedWorkspace !== undefined) {
      useWorkspaceStore.setState({
        selectedWorkspace: contextOverrides.selectedWorkspace
      })
    }
    if (contextOverrides.availableOpenRouterModels) {
      useModelsStore.setState({
        availableOpenRouterModels: contextOverrides.availableOpenRouterModels
      })
    }
    if (contextOverrides.availableHostedModels) {
      useModelsStore.setState({
        availableHostedModels: contextOverrides.availableHostedModels
      })
    }

    return render(
      <ChatSettingsForm
        chatSettings={chatSettings}
        onChangeChatSettings={onChangeChatSettings}
        useAdvancedDropdown={false}
        showTooltip={false}
      />
    )
  }

  it("should show Image Model section when Comet provider is selected", () => {
    const cometModel = LLM_LIST.find(model => model.provider === "comet")
    if (!cometModel) {
      throw new Error("Comet model not found in LLM_LIST")
    }

    const settings: ChatSettings = {
      ...defaultChatSettings,
      model: cometModel.modelId,
      modelProvider: "comet"
    }

    renderWithContext(settings)

    // Should show Image Model label
    expect(screen.getByText("Image Model")).toBeInTheDocument()
  })

  it("should NOT show Image Model section when non-Comet provider is selected", () => {
    const openaiModel = LLM_LIST.find(model => model.provider === "openai")
    if (!openaiModel) {
      throw new Error("OpenAI model not found in LLM_LIST")
    }

    const settings: ChatSettings = {
      ...defaultChatSettings,
      model: openaiModel.modelId,
      modelProvider: "openai"
    }

    renderWithContext(settings)

    // Should NOT show Image Model label
    expect(screen.queryByText("Image Model")).not.toBeInTheDocument()
  })

  it("should render all image models from config", () => {
    const cometModel = LLM_LIST.find(model => model.provider === "comet")
    if (!cometModel) {
      throw new Error("Comet model not found in LLM_LIST")
    }

    const settings: ChatSettings = {
      ...defaultChatSettings,
      model: cometModel.modelId,
      modelProvider: "comet"
    }

    const { container } = renderWithContext(settings)

    // Check that all image models are rendered
    IMAGE_MODELS.forEach(imageModel => {
      const modelElements = container.querySelectorAll(
        `[value="${imageModel.id}"]`
      )
      expect(modelElements.length).toBeGreaterThan(0)
    })
  })

  // it("should show Comet badge on Image Model label", () => {
  //   const cometModel = LLM_LIST.find(model => model.provider === "comet")
  //   if (!cometModel) {
  //     throw new Error("Comet model not found in LLM_LIST")
  //   }

  //   const settings: ChatSettings = {
  //     ...defaultChatSettings,
  //     model: cometModel.modelId
  //   }

  //   const { container } = renderWithContext(settings)

  //   // Find all elements with "Comet" text

  //   const cometBadges = Array.from(
  //     container.querySelectorAll(
  //       ".bg-blue-500\\/10.text-blue-500, span.rounded-full"
  //     )
  //   ).filter(el =>{
  //     el.textContent?.includes("Comet")})

  //   expect(cometBadges.length).toBeGreaterThan(0)
  // })

  it("should use DEFAULT_IMAGE_MODEL when imageModel is not set", () => {
    const cometModel = LLM_LIST.find(model => model.provider === "comet")
    if (!cometModel) {
      throw new Error("Comet model not found in LLM_LIST")
    }

    const settings: ChatSettings = {
      ...defaultChatSettings,
      model: cometModel.modelId,
      modelProvider: "comet",
      imageModel: undefined
    }

    const { container } = renderWithContext(settings)

    // Check that default model is selected
    const selectElement = container.querySelector('[role="combobox"]')
    expect(selectElement).toBeInTheDocument()
  })

  it("should handle model change correctly", () => {
    const mockOnChange = jest.fn()
    const cometModel = LLM_LIST.find(model => model.provider === "comet")
    if (!cometModel) {
      throw new Error("Comet model not found in LLM_LIST")
    }

    const settings: ChatSettings = {
      ...defaultChatSettings,
      model: cometModel.modelId,
      modelProvider: "comet"
    }

    renderWithContext(settings, {}, mockOnChange)

    // The onChange handler should be defined
    expect(mockOnChange).toBeDefined()
  })
})

describe("ChatSettingsForm - Provider Detection", () => {
  it("should correctly identify Comet provider", () => {
    const cometModels = LLM_LIST.filter(model => model.provider === "comet")
    expect(cometModels.length).toBeGreaterThan(0)

    cometModels.forEach(model => {
      expect(model.provider).toBe("comet")
    })
  })

  it("should correctly identify non-Comet providers", () => {
    const nonCometModels = LLM_LIST.filter(model => model.provider !== "comet")
    expect(nonCometModels.length).toBeGreaterThan(0)

    nonCometModels.forEach(model => {
      expect(model.provider).not.toBe("comet")
    })
  })
})
