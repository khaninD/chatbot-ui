import { useItemsStore, useProfileStore, useWorkspaceStore } from "@/stores"
import { createChats } from "@/db/chats"
import { createCollections } from "@/db/collections"
import { createFiles } from "@/db/files"
import { createPrompts } from "@/db/prompts"
import { createTools } from "@/db/tools"
import { Tables, TablesInsert } from "@/supabase/types"
import { IconUpload, IconX } from "@tabler/icons-react"
import { FC, useRef, useState } from "react"
import { toast } from "sonner"
import { SIDEBAR_ICON_SIZE } from "../sidebar/sidebar-switcher"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader
} from "../ui/dialog"
import { Input } from "../ui/input"

interface ImportProps {}

export const Import: FC<ImportProps> = ({}) => {
  const profile = useProfileStore(state => state.profile)
  const selectedWorkspace = useWorkspaceStore(state => state.selectedWorkspace)
  const chats = useItemsStore(state => state.chats)
  const prompts = useItemsStore(state => state.prompts)
  const files = useItemsStore(state => state.files)
  const collections = useItemsStore(state => state.collections)
  const tools = useItemsStore(state => state.tools)
  const setChats = useItemsStore(state => state.setChats)
  const setPrompts = useItemsStore(state => state.setPrompts)
  const setFiles = useItemsStore(state => state.setFiles)
  const setCollections = useItemsStore(state => state.setCollections)
  const setTools = useItemsStore(state => state.setTools)

  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  type ImportContentType =
    | "chats"
    | "prompts"
    | "files"
    | "collections"
    | "tools"
  type ImportItem = Record<string, unknown> & {
    contentType?: ImportContentType
  }
  type ImportCounts = Record<ImportContentType, number>

  const [isOpen, setIsOpen] = useState(false)
  const [importList, setImportList] = useState<ImportItem[]>([])
  const [importCounts, setImportCounts] = useState<ImportCounts>({
    chats: 0,
    prompts: 0,
    files: 0,
    collections: 0,
    tools: 0
  })

  const handleSelectFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const filePromises = Array.from(e.target.files).map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = event => {
          try {
            const data = JSON.parse(event.target?.result as string)
            resolve(Array.isArray(data) ? data : [data])
          } catch (error) {
            reject(error)
          }
        }
        reader.readAsText(file as Blob)
      })
    })

    try {
      const results = await Promise.all(filePromises)
      const flatResults = results.flat()
      let uniqueResults: ImportItem[] = []
      setImportList(prevState => {
        const newState = [...prevState, ...flatResults]
        uniqueResults = Array.from(
          new Set(newState.map(item => JSON.stringify(item)))
        ).map(item => JSON.parse(item))
        return uniqueResults
      })

      setImportCounts(prevCounts => {
        const countTypes: ImportContentType[] = [
          "chats",
          "prompts",
          "files",
          "collections",
          "tools"
        ]
        const newCounts: ImportCounts = { ...prevCounts }
        countTypes.forEach(type => {
          newCounts[type] = uniqueResults.filter(
            item => item.contentType === type
          ).length
        })
        return newCounts
      })
    } catch (error) {
      console.error(error)
    }
  }

  const handleRemoveItem = (item: ImportItem) => {
    setImportList(prev => prev.filter(prevItem => prevItem !== item))

    setImportCounts(prev => {
      const newCounts: ImportCounts = { ...prev }
      if (item.contentType) {
        newCounts[item.contentType] = Math.max(
          (newCounts[item.contentType] || 0) - 1,
          0
        )
      }
      return newCounts
    })
  }

  const handleCancel = () => {
    setImportList([])
    setImportCounts({
      chats: 0,
      prompts: 0,
      files: 0,
      collections: 0,
      tools: 0
    })
    setIsOpen(false)
  }

  const handleSaveData = async () => {
    if (!profile) return
    if (!selectedWorkspace) return

    const saveData: Record<
      ImportContentType,
      Array<Record<string, unknown>>
    > = {
      chats: [],
      prompts: [],
      files: [],
      collections: [],
      tools: []
    }

    importList.forEach(item => {
      const { contentType, ...itemWithoutContentType } = item
      if (!contentType) return
      itemWithoutContentType.user_id = profile.user_id
      itemWithoutContentType.workspace_id = selectedWorkspace.id
      saveData[contentType].push(itemWithoutContentType)
    })

    const createdItems = {
      chats: await createChats(saveData.chats as TablesInsert<"chats">[]),
      prompts: await createPrompts(
        saveData.prompts as TablesInsert<"prompts">[],
        selectedWorkspace.id
      ),
      files: await createFiles(
        saveData.files as TablesInsert<"files">[],
        selectedWorkspace.id
      ),
      collections: await createCollections(
        saveData.collections as TablesInsert<"collections">[],
        selectedWorkspace.id
      ),
      tools: await createTools(
        saveData.tools as TablesInsert<"tools">[],
        selectedWorkspace.id
      )
    }

    setChats([...chats, ...createdItems.chats])
    setPrompts([...prompts, ...createdItems.prompts])
    setFiles([...files, ...createdItems.files])
    setCollections([...collections, ...createdItems.collections])
    setTools([...tools, ...createdItems.tools])

    toast.success("Data imported successfully!")

    setImportList([])
    setImportCounts({
      chats: 0,
      prompts: 0,
      files: 0,
      collections: 0,
      tools: 0
    })
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      buttonRef.current?.click()
    }
  }

  return (
    <>
      <IconUpload
        className="cursor-pointer hover:opacity-50"
        size={SIDEBAR_ICON_SIZE}
        onClick={() => setIsOpen(true)}
      />

      {isOpen && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent
            className="max-w-[600px] space-y-4"
            onKeyDown={handleKeyDown}
          >
            <DialogHeader>
              <div className="text-2xl font-bold">Import Data</div>

              <DialogDescription>
                Import data from a JSON file(s).
              </DialogDescription>
            </DialogHeader>

            <div className="max-w-[560px] space-y-4">
              <div className="space-y-1">
                {importList.map((item, index) => (
                  <div key={index} className="flex space-x-2">
                    <Button className="shrink-0" variant="ghost" size="icon">
                      <IconX
                        className="cursor-pointer hover:opacity-50"
                        onClick={() => handleRemoveItem(item)}
                      />
                    </Button>

                    <div className="flex items-center space-x-2 truncate">
                      <Badge>
                        {(item.contentType as string | undefined)
                          ?.slice(0, -1)
                          .toUpperCase() || "ITEM"}
                      </Badge>

                      <div className="truncate">
                        {(item.name as string) || "Unnamed"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {Object.entries(importCounts).map(([key, value]) => {
                if (value > 0) {
                  return <div key={key}>{`${key}: ${value}`}</div>
                }
                return null
              })}

              <Input
                className="mt-4"
                ref={inputRef}
                type="file"
                onChange={handleSelectFiles}
                accept=".json"
                multiple
              />
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>

              <Button
                ref={buttonRef}
                onClick={handleSaveData}
                disabled={importList.length === 0}
              >
                Save Data
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
