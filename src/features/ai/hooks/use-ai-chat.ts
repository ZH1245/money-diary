import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '#/features/query-keys'
import { setActiveAiConversationId } from '#/features/ai/store/active-ai-conversation-store'
import type { AiToolAction } from '#/features/ai/server/ai-tools'

export interface AiChatStep {
  action: AiToolAction
  success: boolean
  message: string
  entityId?: number
  navigateTo?: string
}

export interface AiChatResponse {
  success: boolean
  conversationId?: number
  action?:
    | AiToolAction
    | 'clarification'
    | 'chained'
    | 'provider_error'
  message?: string
  steps?: AiChatStep[]
  navigateTo?: string
  blocked?: boolean
  closeChat?: boolean
  warning?: string
  data?: Record<string, unknown>
  error?: string
}

export interface AiChatRequest {
  conversationId?: number
  message: string
}

/**
 * Sends one message to /api/ai/chat and persists it in the conversation model.
 */
async function postAiChat(input: AiChatRequest): Promise<AiChatResponse> {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  const json = (await response.json()) as AiChatResponse
  // Conversation may already exist even when Ollama fails — still return id for store sync.
  if (!response.ok && !json.conversationId && json.action !== 'clarification') {
    throw new Error(json.error ?? 'AI chat request failed')
  }
  return json
}

/** Maps tool action to the query key(s) that need invalidation after a write. */
const INVALIDATION_MAP: Record<string, Array<readonly string[]>> = {
  create_transaction: [queryKeys.transactions.all],
  update_transaction: [queryKeys.transactions.all],
  create_saving: [queryKeys.savings.all, queryKeys.goals.all],
  create_goal: [queryKeys.goals.all],
  create_wishlist_item: [queryKeys.wishlist.all],
  update_wishlist_item: [queryKeys.wishlist.all],
  delete_wishlist_item: [queryKeys.wishlist.all],
  update_goal: [queryKeys.goals.all],
  delete_goal: [queryKeys.goals.all],
}

/**
 * Mutation hook for the unified AI chat assistant.
 * Automatically invalidates finance caches and conversation history after writes.
 */
export function useAiChatMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: postAiChat,
    onSuccess: (result) => {
      if (result.conversationId) {
        setActiveAiConversationId(result.conversationId)
      }

      void queryClient.invalidateQueries({ queryKey: queryKeys.ai.conversations })
      if (result.conversationId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.ai.conversation(result.conversationId),
        })
      }

      const actions = new Set<string>()

      if (result.steps?.length) {
        for (const step of result.steps) {
          if (step.success) actions.add(step.action)
        }
      } else if (result.success && result.action && result.action !== 'clarification' && result.action !== 'chained') {
        actions.add(result.action)
      }

      for (const action of actions) {
        const keys = INVALIDATION_MAP[action] ?? []
        for (const key of keys) {
          void queryClient.invalidateQueries({ queryKey: key })
        }
      }
    },
  })
}
