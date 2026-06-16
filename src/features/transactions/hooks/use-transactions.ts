import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTransaction, getTransactions } from '../api/transactions-api'
import { queryKeys } from '#/features/query-keys'

/**
 * React Query hook for fetching transactions.
 */
export function useTransactionsQuery() {
  return useQuery({
    queryKey: queryKeys.transactions.all,
    queryFn: getTransactions,
  })
}

/**
 * React Query mutation hook for creating a transaction.
 */
export function useCreateTransactionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTransaction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.transactions.all,
      })
    },
  })
}
