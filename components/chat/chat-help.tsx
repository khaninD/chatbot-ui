import useHotkey from "@/lib/hooks/use-hotkey"
import {
  IconBrandGithub,
  IconBrandX,
  IconHelpCircle,
  IconQuestionMark
} from "@tabler/icons-react"
import Link from "next/link"
import { FC, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../ui/dropdown-menu"
import { Announcements } from "../utility/announcements"

interface ChatHelpProps {}

export const ChatHelp: FC<ChatHelpProps> = ({}) => {
  const { t } = useTranslation()
  useHotkey("/", () => setIsOpen(prevState => !prevState))

  const [isOpen, setIsOpen] = useState(false)

  const isMac =
    typeof window !== "undefined" &&
    navigator.userAgent.toUpperCase().indexOf("MAC") >= 0
  const modifier = isMac ? "⌘" : "Ctrl"

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <IconQuestionMark className="size-[24px] cursor-pointer rounded-full bg-primary p-0.5 text-secondary opacity-60 hover:opacity-50 lg:size-[30px] lg:p-1" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem className="flex justify-between">
          <div>{t("help.showHelp")}</div>
          <div className="flex opacity-60">
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              {modifier}
            </div>
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              Shift
            </div>
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              /
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem className="flex justify-between">
          <div>{t("help.showWorkspaces")}</div>
          <div className="flex opacity-60">
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              {modifier}
            </div>
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              Shift
            </div>
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              ;
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem className="flex w-[300px] justify-between">
          <div>{t("chat.newChat")}</div>
          <div className="flex opacity-60">
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              {modifier}
            </div>
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              Shift
            </div>
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              O
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem className="flex justify-between">
          <div>{t("chat.focusChat")}</div>
          <div className="flex opacity-60">
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              {modifier}
            </div>
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              Shift
            </div>
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              L
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem className="flex justify-between">
          <div>{t("help.toggleFiles")}</div>
          <div className="flex opacity-60">
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              {modifier}
            </div>
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              Shift
            </div>
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              F
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem className="flex justify-between">
          <div>{t("help.toggleRetrieval")}</div>
          <div className="flex opacity-60">
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              {modifier}
            </div>
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              Shift
            </div>
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              E
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem className="flex justify-between">
          <div>{t("help.openSettings")}</div>
          <div className="flex opacity-60">
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              {modifier}
            </div>
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              Shift
            </div>
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              I
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem className="flex justify-between">
          <div>{t("help.toggleSidebar")}</div>
          <div className="flex opacity-60">
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              {modifier}
            </div>
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              Shift
            </div>
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              S
            </div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
