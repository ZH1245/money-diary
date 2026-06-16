import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPaymentAccount,
  deletePaymentAccount,
  getPaymentAccounts,
  updatePaymentAccount,
} from '../api/payment-accounts-api'
import { queryKeys } from '#/features/query-keys'

/**
 * React Query hook for fetching payment accounts.
 */
export function usePaymentAccountsQuery() {
  return useQuery({
    queryKey: queryKeys.paymentAccounts.all,
    queryFn: getPaymentAccounts,
  })
}

/**
 * React Query mutation hook for creating a payment account.
 */
export function useCreatePaymentAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPaymentAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.paymentAccounts.all,
      })
    },
  })
}

/**
 * React Query mutation hook for updating a payment account.
 */
export function useUpdatePaymentAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Parameters<typeof updatePaymentAccount>[1] }) =>
      updatePaymentAccount(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.paymentAccounts.all,
      })
    },
  })
}

/**
 * React Query mutation hook for deleting a payment account.
 */
export function useDeletePaymentAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deletePaymentAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.paymentAccounts.all,
      })
    },
  })
}
