import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { useChatStore } from "@/stores"
import { IconInfoCircle, IconMessagePlus } from "@tabler/icons-react"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { WithTooltip } from "../ui/with-tooltip"

interface ChatSecondaryButtonsProps {}

export const ChatSecondaryButtons: FC<ChatSecondaryButtonsProps> = ({}) => {
  const { t } = useTranslation()
  const selectedChat = useChatStore(state => state.selectedChat)

  const { handleNewChat } = useChatHandler()

  return (
    <>
      {selectedChat && (
        <>
          <WithTooltip
            delayDuration={200}
            display={
              <div>
                <div className="text-xl font-bold">{t("chat.chatInfo")}</div>

                <div className="mx-auto mt-2 max-w-xs space-y-2 sm:max-w-sm md:max-w-md lg:max-w-lg">
                  <div>
                    {t("settings.model")} {selectedChat.model}
                  </div>
                  <div>
                    {t("settings.prompt")} {selectedChat.prompt}
                  </div>

                  <div>
                    {t("settings.profileContext")}{" "}
                    {selectedChat.include_profile_context
                      ? t("common.enabled")
                      : t("common.disabled")}
                  </div>
                  <div>
                    {" "}
                    {t("settings.workspaceInstructions")}{" "}
                    {selectedChat.include_workspace_instructions
                      ? t("common.enabled")
                      : t("common.disabled")}
                  </div>

                  <div>
                    {t("settings.embeddingsProvider")}{" "}
                    {selectedChat.embeddings_provider}
                  </div>
                </div>
              </div>
            }
            trigger={
              <div className="mt-1">
                <IconInfoCircle
                  className="cursor-default hover:opacity-50"
                  size={24}
                />
              </div>
            }
          />

          <WithTooltip
            delayDuration={200}
            display={<div>{t("chat.startNewChat")}</div>}
            trigger={
              <div className="mt-1">
                <IconMessagePlus
                  className="cursor-pointer hover:opacity-50"
                  size={24}
                  onClick={handleNewChat}
                />
              </div>
            }
          />
        </>
      )}
    </>
  )
}
