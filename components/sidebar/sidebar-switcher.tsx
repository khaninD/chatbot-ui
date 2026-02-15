import { ContentType } from "@/types"
import {
  IconAdjustmentsHorizontal,
  IconBolt,
  IconFile,
  IconMessage,
  IconPencil,
  IconPlugConnected,
  IconSparkles
} from "@tabler/icons-react"
import { FC } from "react"
import { TabsList } from "../ui/tabs"
import { WithTooltip } from "../ui/with-tooltip"
import { ProfileSettings } from "../utility/profile-settings"
import { SidebarSwitchItem } from "./sidebar-switch-item"

export const SIDEBAR_ICON_SIZE = 28

interface SidebarSwitcherProps {
  onContentTypeChange: (contentType: ContentType) => void
}

export const SidebarSwitcher: FC<SidebarSwitcherProps> = ({
  onContentTypeChange
}) => {
  return (
    <div className="flex flex-col justify-between border-r-2 pb-5">
      <TabsList className="grid h-[385px] grid-rows-8 bg-background">
        <SidebarSwitchItem
          icon={<IconMessage size={SIDEBAR_ICON_SIZE} />}
          contentType="chats"
          onContentTypeChange={onContentTypeChange}
        />

        <SidebarSwitchItem
          icon={<IconPencil size={SIDEBAR_ICON_SIZE} />}
          contentType="prompts"
          onContentTypeChange={onContentTypeChange}
        />

        <SidebarSwitchItem
          icon={<IconSparkles size={SIDEBAR_ICON_SIZE} />}
          contentType="models"
          onContentTypeChange={onContentTypeChange}
        />

        {/* <SidebarSwitchItem
          icon={<IconFile size={SIDEBAR_ICON_SIZE} />}
          contentType="files"
          onContentTypeChange={onContentTypeChange}
        /> */}

        {/* <SidebarSwitchItem
          icon={<IconBolt size={SIDEBAR_ICON_SIZE} />}
          contentType="tools"
          onContentTypeChange={onContentTypeChange}
        /> */}

        <SidebarSwitchItem
          icon={<IconPlugConnected size={SIDEBAR_ICON_SIZE} />}
          contentType="mcp_servers"
          onContentTypeChange={onContentTypeChange}
        />
      </TabsList>

      <div className="flex flex-col items-center space-y-4">
        {/* TODO */}
        {/* <WithTooltip display={<div>Import</div>} trigger={<Import />} /> */}

        {/* TODO */}
        {/* <Alerts /> */}

        <WithTooltip
          display={<div>Profile Settings</div>}
          trigger={<ProfileSettings />}
        />
      </div>
    </div>
  )
}
