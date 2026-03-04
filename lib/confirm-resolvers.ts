import { ConfirmResult } from "@/components/chat/chat-helpers"

// Singleton registry for confirm_required promise resolvers.
// processResponse writes resolvers here, ConfirmRequiredBlock reads them.
// This avoids the problem of multiple useChatHandler() instances
// having separate useRef Maps.

const resolvers = new Map<string, (result: ConfirmResult) => void>()

export function setConfirmResolver(
  confirmationId: string,
  resolve: (result: ConfirmResult) => void
) {
  resolvers.set(confirmationId, resolve)
}

export function callConfirmResolver(
  confirmationId: string,
  result: ConfirmResult
): boolean {
  const resolve = resolvers.get(confirmationId)
  console.log("resolve", resolve)
  if (resolve) {
    resolve(result)
    resolvers.delete(confirmationId)
    return true
  }
  return false
}
