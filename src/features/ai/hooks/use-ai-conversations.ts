import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '#/features/query-keys'
import type {
  AiConversationDetail,
  AiConversationSummary,
} from '#/features/ai/types/ai-conversation'

interface ApiListResponse {
  success: boolean
  data?: AiConversationSummary[]
  error?: string
}

interface ApiConversationResponse {
  success: boolean
  data?: AiConversationDetail
  error?: string
}

/**
 * Loads the user's saved AI conversations.
 */
export function useAiConversationsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.ai.conversations,
    enabled,
    queryFn: async () => {
      const response = await fetch('/api/ai/conversations')
      const json = (await response.json()) as ApiListResponse
      if (!response.ok || !json.success) {
        throw new Error(json.error ?? 'Unable to load conversations')
      }
      return json.data ?? []
    },
  })
}

/**
 * Loads one conversation with persisted messages.
 */
export function useAiConversationQuery(conversationId: number | null) {
  return useQuery({
    queryKey: conversationId ? queryKeys.ai.conversation(conversationId) : ['ai', 'conversations', 'none'],
    enabled: conversationId != null,
    queryFn: async () => {
      const response = await fetch(`/api/ai/conversations/${conversationId}`)
      const json = (await response.json()) as ApiConversationResponse
      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error ?? 'Unable to load conversation')
      }
      return json.data
    },
  })
}

/**
 * Creates a new empty AI conversation.
 */
export function useCreateAiConversationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = (await response.json()) as ApiConversationResponse
      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error ?? 'Unable to create conversation')
      }
      return json.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ai.conversations })
    },
  })
}

/**
 * Deletes a saved AI conversation.
 */
export function useDeleteAiConversationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (conversationId: number) => {
      const response = await fetch(`/api/ai/conversations/${conversationId}`, {
        method: 'DELETE',
      })
      const json = (await response.json()) as { success?: boolean; error?: string }
      if (!response.ok || !json.success) {
        throw new Error(json.error ?? 'Unable to delete conversation')
      }
      return conversationId
    },
    onSuccess: (_result, conversationId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ai.conversations })
      void queryClient.removeQueries({ queryKey: queryKeys.ai.conversation(conversationId) })
    },
  })
}
