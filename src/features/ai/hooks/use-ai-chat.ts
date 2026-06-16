import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '#/features/query-keys'

export interface AiChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AiChatResponse {
  success: boolean
  action?: 'create_transaction' | 'create_saving' | 'create_goal' | 'create_wishlist_item' | 'clarification'
  message?: string
  data?: Record<string, unknown>
  error?: string
  clarification?: string
}

/**
 * Sends the full message thread to /api/ai/chat.
 * Server validates the session — no token needed from client.
 */
async function postAiChat(messages: AiChatMessage[]): Promise<AiChatResponse> {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })

  const json = (await response.json()) as AiChatResponse
  if (!response.ok && json.action !== 'clarification') {
    throw new Error(json.error ?? 'AI chat request failed')
  }
  return json
}

/** Maps tool action to the query key(s) that need invalidation after a write. */
const INVALIDATION_MAP: Record<string, Array<readonly string[]>> = {
  create_transaction: [queryKeys.transactions.all],
  create_saving: [queryKeys.savings.all],
  create_goal: [queryKeys.goals.all],
  create_wishlist_item: [queryKeys.wishlist.all],
}

/**
 * Mutation hook for the unified AI chat assistant.
 * Automatically invalidates the relevant query cache on successful writes.
 */
export function useAiChatMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: postAiChat,
    onSuccess: (result) => {
      if (result.success && result.action && result.action !== 'clarification') {
        const keys = INVALIDATION_MAP[result.action] ?? []
        for (const key of keys) {
          void queryClient.invalidateQueries({ queryKey: key })
        }
      }
    },
  })
}
