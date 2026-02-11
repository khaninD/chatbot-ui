"use client"

import { useWorkspaceStore } from "@/stores"

export default function WorkspacePage() {
  const selectedWorkspace = useWorkspaceStore(state => state.selectedWorkspace)

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center">
      <div className="text-4xl">{selectedWorkspace?.name}</div>
    </div>
  )
}
