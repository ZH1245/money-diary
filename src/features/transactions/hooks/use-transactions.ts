import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  confirmDraftTransaction,
  createScheduledTransaction,
  createTransaction,
  createTransfer,
  deleteTransaction,
  discardDraftTransaction,
  getDraftTransactions,
  getTransactions,
  updateTransaction,
  updateTransfer,
} from '../api/transactions-api'
import type { CreateScheduledTransactionInput, TransferInput, UpdateTransactionInput } from '../types/transaction'
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

/**
 * React Query hook for fetching pending draft transactions.
 */
export function useDraftTransactionsQuery() {
  return useQuery({
    queryKey: queryKeys.transactions.drafts,
    queryFn: getDraftTransactions,
  })
}

/**
 * React Query mutation hook for creating a scheduled (draft) transaction.
 */
export function useCreateScheduledTransactionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateScheduledTransactionInput) => createScheduledTransaction(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.transactions.drafts,
      })
    },
  })
}

/**
 * React Query mutation hook for confirming a draft transaction.
 */
export function useConfirmDraftTransactionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => confirmDraftTransaction(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.drafts }),
      ])
    },
  })
}

/**
 * React Query mutation hook for discarding a draft transaction.
 */
export function useDiscardDraftTransactionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => discardDraftTransaction(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.transactions.drafts,
      })
    },
  })
}
