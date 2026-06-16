import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '#/features/query-keys'

interface AiTransactionResult {
  success: boolean
  data?: {
    id: number
    title: string
    amount: string
    type: string
    happenedAt: string
  }
  clarification?: string
  error?: string
}

/**
 * Sends a natural-language prompt to the AI transaction endpoint.
 * The server validates the session cookie — no auth token needed from the client.
 */
async function postAiTransaction(prompt: string): Promise<AiTransactionResult> {
  const response = await fetch('/api/ai/transaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })

  const json = (await response.json()) as AiTransactionResult
  if (!response.ok && !json.clarification) {
    throw new Error(json.error ?? 'AI transaction failed')
  }
  return json
}

/**
 * Mutation hook for AI-powered transaction creation.
 * Invalidates the transactions query on success so the table updates live.
 */
export function useAiTransactionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: postAiTransaction,
    onSuccess: (result) => {
      if (result.success) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
      }
    },
  })
}
