import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTransaction,
  createTransfer,
  deleteTransaction,
  getTransactions,
  updateTransaction,
  updateTransfer,
} from '../api/transactions-api'
import type { TransferInput, UpdateTransactionInput } from '../types/transaction'
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
 * React Query mutation hook for creating a two-leg transfer.
 */
export function useCreateTransferMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTransfer,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.transactions.all,
      })
    },
  })
}

/**
 * React Query mutation hook for updating both legs of a transfer.
 */
export function useUpdateTransferMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: TransferInput }) => updateTransfer(id, input),
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
