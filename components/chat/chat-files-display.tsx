import { useAttachmentsStore, useItemsStore, useRetrievalStore } from "@/stores"
import { getFileFromStorage } from "@/db/storage/files"
import useHotkey from "@/lib/hooks/use-hotkey"
import { cn } from "@/lib/utils"
import { ChatFile, MessageImage } from "@/types"
import {
  IconCircleFilled,
  IconFileFilled,
  IconFileTypeCsv,
  IconFileTypeDocx,
  IconFileTypePdf,
  IconFileTypeTxt,
  IconJson,
  IconLoader2,
  IconMarkdown,
  IconX
} from "@tabler/icons-react"
import Image from "next/image"
import { FC, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "../ui/button"
import { FilePreview } from "../ui/file-preview"
import { WithTooltip } from "../ui/with-tooltip"
import { ChatRetrievalSettings } from "./chat-retrieval-settings"

interface ChatFilesDisplayProps {}

export const ChatFilesDisplay: FC<ChatFilesDisplayProps> = ({}) => {
  const { t } = useTranslation()
  useHotkey("f", () => setShowFilesDisplay(prev => !prev))
  useHotkey("e", () => setUseRetrieval(prev => !prev))

  const files = useItemsStore(state => state.files)
  const newMessageImages = useAttachmentsStore(state => state.newMessageImages)
  const setNewMessageImages = useAttachmentsStore(
    state => state.setNewMessageImages
  )
  const newMessageFiles = useAttachmentsStore(state => state.newMessageFiles)
  const setNewMessageFiles = useAttachmentsStore(
    state => state.setNewMessageFiles
  )
  const setShowFilesDisplay = useAttachmentsStore(
    state => state.setShowFilesDisplay
  )
  const showFilesDisplay = useAttachmentsStore(state => state.showFilesDisplay)
  const chatFiles = useAttachmentsStore(state => state.chatFiles)
  const chatImages = useAttachmentsStore(state => state.chatImages)
  const setChatImages = useAttachmentsStore(state => state.setChatImages)
  const setChatFiles = useAttachmentsStore(state => state.setChatFiles)
  const setUseRetrieval = useRetrievalStore(state => state.setUseRetrieval)

  const [selectedFile, setSelectedFile] = useState<ChatFile | null>(null)
  const [selectedImage, setSelectedImage] = useState<MessageImage | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const messageImages = [
    ...newMessageImages.filter(
      image =>
        !chatImages.some(chatImage => chatImage.messageId === image.messageId)
    )
  ]

  const combinedChatFiles = [
    ...newMessageFiles.filter(
      file => !chatFiles.some(chatFile => chatFile.id === file.id)
    ),
    ...chatFiles
  ]

  const combinedMessageFiles = [...messageImages, ...combinedChatFiles]

  const getLinkAndView = async (file: ChatFile) => {
    const fileRecord = files.find(f => f.id === file.id)

    if (!fileRecord) return

    const link = await getFileFromStorage(fileRecord.file_path)
    window.open(link, "_blank")
  }

  return showFilesDisplay && combinedMessageFiles.length > 0 ? (
    <>
      {showPreview && selectedImage && (
        <FilePreview
          type="image"
          item={selectedImage}
          isOpen={showPreview}
          onOpenChange={(isOpen: boolean) => {
            setShowPreview(isOpen)
            setSelectedImage(null)
          }}
        />
      )}

      {showPreview && selectedFile && (
        <FilePreview
          type="file"
          item={selectedFile}
          isOpen={showPreview}
          onOpenChange={(isOpen: boolean) => {
            setShowPreview(isOpen)
            setSelectedFile(null)
          }}
        />
      )}

      <div className="space-y-2">
        <div className="flex w-full items-center justify-center">
          <Button
            className="flex h-[32px] w-auto space-x-2"
            onClick={() => setShowFilesDisplay(false)}
          >
            <RetrievalToggle />

            <div>{t("chat.hideFiles")}</div>

            <div onClick={e => e.stopPropagation()}>
              <ChatRetrievalSettings />
            </div>
          </Button>
        </div>

        <div className="overflow-auto">
          <div className="flex gap-2 overflow-auto pt-2">
            {messageImages.map((image, index) => (
              <div
                key={index}
                className="relative flex h-[64px] cursor-pointer items-center space-x-4 rounded-xl hover:opacity-50"
              >
                <Image
                  className="rounded"
                  // Force the image to be 56px by 56px
                  style={{
                    minWidth: "56px",
                    minHeight: "56px",
                    maxHeight: "56px",
                    maxWidth: "56px"
                  }}
                  src={image.base64} // Preview images will always be base64
                  alt={t("chat.fileImage")}
                  width={56}
                  height={56}
                  onClick={() => {
                    setSelectedImage(image)
                    setShowPreview(true)
                  }}
                />

                <IconX
                  className="absolute right-[-6px] top-[-2px] flex size-5 cursor-pointer items-center justify-center rounded-full border-DEFAULT border-primary bg-muted-foreground text-[10px] hover:border-red-500 hover:bg-white hover:text-red-500"
                  onClick={e => {
                    e.stopPropagation()
                    // Filter by both messageId AND base64 to handle multiple images in same message
                    setNewMessageImages(
                      newMessageImages.filter(
                        f =>
                          !(
                            f.messageId === image.messageId &&
                            f.base64 === image.base64
                          )
                      )
                    )
                    setChatImages(
                      chatImages.filter(
                        f =>
                          !(
                            f.messageId === image.messageId &&
                            f.base64 === image.base64
                          )
                      )
                    )
                  }}
                />
              </div>
            ))}

            {combinedChatFiles.map((file, index) =>
              file.id === "loading" ? (
                <div
                  key={index}
                  className="relative flex h-[64px] items-center space-x-4 rounded-xl border-2 px-4 py-3"
                >
                  <div className="rounded bg-blue-500 p-2">
                    <IconLoader2 className="animate-spin" />
                  </div>

                  <div className="truncate text-sm">
                    <div className="truncate">{file.name}</div>
                    <div className="truncate opacity-50">{file.type}</div>
                  </div>
                </div>
              ) : (
                <div
                  key={file.id}
                  className="relative flex h-[64px] cursor-pointer items-center space-x-4 rounded-xl border-2 px-4 py-3 hover:opacity-50"
                  onClick={() => getLinkAndView(file)}
                >
                  <div className="rounded bg-blue-500 p-2">
                    {(() => {
                      const fileExtension = file.type.includes("/")
                        ? file.type.split("/")[1]
                        : file.type

                      switch (fileExtension) {
                        case "pdf":
                          return <IconFileTypePdf />
                        case "markdown":
                          return <IconMarkdown />
                        case "txt":
                          return <IconFileTypeTxt />
                        case "json":
                          return <IconJson />
                        case "csv":
                          return <IconFileTypeCsv />
                        case "docx":
                          return <IconFileTypeDocx />
                        default:
                          return <IconFileFilled />
                      }
                    })()}
                  </div>

                  <div className="truncate text-sm">
                    <div className="truncate">{file.name}</div>
                  </div>

                  <IconX
                    className="absolute right-[-6px] top-[-6px] flex size-5 cursor-pointer items-center justify-center rounded-full border-DEFAULT border-primary bg-muted-foreground text-[10px] hover:border-red-500 hover:bg-white hover:text-red-500"
                    onClick={e => {
                      e.stopPropagation()
                      setNewMessageFiles(
                        newMessageFiles.filter(f => f.id !== file.id)
                      )
                      setChatFiles(chatFiles.filter(f => f.id !== file.id))
                    }}
                  />
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </>
  ) : (
    combinedMessageFiles.length > 0 && (
      <div className="flex w-full items-center justify-center space-x-2">
        <Button
          className="flex h-[32px] w-auto space-x-2"
          onClick={() => setShowFilesDisplay(true)}
        >
          <RetrievalToggle />

          <div>
            {t("chat.viewFiles", { count: combinedMessageFiles.length })}
          </div>

          <div onClick={e => e.stopPropagation()}>
            <ChatRetrievalSettings />
          </div>
        </Button>
      </div>
    )
  )
}

const RetrievalToggle = ({}) => {
  const { t } = useTranslation()
  const useRetrieval = useRetrievalStore(state => state.useRetrieval)
  const setUseRetrieval = useRetrievalStore(state => state.setUseRetrieval)

  return (
    <div className="flex items-center">
      <WithTooltip
        delayDuration={0}
        side="top"
        display={
          <div>
            {useRetrieval
              ? t("chat.fileRetrievalEnabled")
              : t("chat.fileRetrievalDisabled")}
          </div>
        }
        trigger={
          <IconCircleFilled
            className={cn(
              "p-1",
              useRetrieval ? "text-green-500" : "text-red-500",
              useRetrieval ? "hover:text-green-200" : "hover:text-red-200"
            )}
            size={24}
            onClick={e => {
              e.stopPropagation()
              setUseRetrieval(prev => !prev)
            }}
          />
        }
      />
    </div>
  )
}
