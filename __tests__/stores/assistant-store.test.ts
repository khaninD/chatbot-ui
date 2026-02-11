import { useAssistantStore } from "@/stores"
import { AssistantImage } from "@/types/images/assistant-image"

const resetAssistantStore = () => {
  useAssistantStore.setState({
    selectedAssistant: null,
    assistantImages: [],
    openaiAssistants: []
  })
}

describe("useAssistantStore", () => {
  beforeEach(() => {
    resetAssistantStore()
  })

  it("adds assistant image via addAssistantImage", () => {
    const image: AssistantImage = {
      assistantId: "assistant-1",
      path: "path/to/image.png",
      base64: "data:image/png;base64,test",
      url: "https://example.com/image.png"
    }

    useAssistantStore.getState().addAssistantImage(image)

    expect(useAssistantStore.getState().assistantImages).toEqual([image])
  })
})
