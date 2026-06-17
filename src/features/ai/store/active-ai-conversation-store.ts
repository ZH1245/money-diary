import { Store } from '@tanstack/react-store'

const ACTIVE_AI_CONVERSATION_STORAGE_KEY = 'money-diary:active-ai-conversation'

interface ActiveAiConversationState {
  conversationId: number | null
}

/**
 * Reads the last active conversation id from browser storage.
 */
function readStoredActiveConversationId(): number | null {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(ACTIVE_AI_CONVERSATION_STORAGE_KEY)
  if (!raw) return null

  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/**
 * Shared active AI conversation id across routes (module store survives shell remounts).
 */
export const activeAiConversationStore = new Store<ActiveAiConversationState>({
  conversationId: readStoredActiveConversationId(),
})

activeAiConversationStore.subscribe(() => {
  if (typeof window === 'undefined') return

  const { conversationId } = activeAiConversationStore.state
  if (conversationId == null) {
    window.localStorage.removeItem(ACTIVE_AI_CONVERSATION_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(ACTIVE_AI_CONVERSATION_STORAGE_KEY, String(conversationId))
})

/**
 * Sets the active AI conversation for the workspace.
 */
export function setActiveAiConversationId(conversationId: number | null) {
  activeAiConversationStore.setState(() => ({ conversationId }))
}
