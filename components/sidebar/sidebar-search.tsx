import { ContentType } from "@/types"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { Input } from "../ui/input"

interface SidebarSearchProps {
  contentType: ContentType
  searchTerm: string
  setSearchTerm: Function
}

export const SidebarSearch: FC<SidebarSearchProps> = ({
  contentType,
  searchTerm,
  setSearchTerm
}) => {
  const { t } = useTranslation()

  return (
    <Input
      placeholder={t("sidebar.search", { contentType })}
      value={searchTerm}
      onChange={e => setSearchTerm(e.target.value)}
    />
  )
}
