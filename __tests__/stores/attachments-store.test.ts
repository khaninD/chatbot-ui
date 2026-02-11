import { useAttachmentsStore } from "@/stores"
import { MessageImage } from "@/types"

const resetAttachmentsStore = () => {
  useAttachmentsStore.setState({
    chatFiles: [],
    chatImages: [],
    newMessageFiles: [],
    newMessageImages: [],
    showFilesDisplay: false
  })
}

describe("useAttachmentsStore", () => {
  beforeEach(() => {
    resetAttachmentsStore()
  })

  it("sets newMessageImages with updater", () => {
    const image = {
      messageId: "temp",
      path: "",
      base64: "data:image/png;base64,test",
      url: "blob:test",
      file: null
    } as MessageImage

    useAttachmentsStore.getState().setNewMessageImages(prev => [...prev, image])

    expect(useAttachmentsStore.getState().newMessageImages).toEqual([image])
  })
})
