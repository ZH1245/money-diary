import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTransaction, deleteTransaction, getTransactions, updateTransaction } from '../api/transactions-api'
import type { UpdateTransactionInput } from '../types/transaction'
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

/**
 * React Query mutation hook for updating a transaction.
 */
export function useUpdateTransactionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateTransactionInput }) => updateTransaction(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.transactions.all,
      })
    },
  })
}

/**
 * React Query mutation hook for deleting a transaction.
 */
export function useDeleteTransactionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.transactions.all,
      })
    },
  })
}
