import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createSaving, deleteSaving, getSavings, updateSaving } from '../api/savings-api'
import type { UpdateSavingInput } from '../types/saving'
import { queryKeys } from '#/features/query-keys'

/**
 * React Query hook for fetching savings.
 */
export function useSavingsQuery() {
  return useQuery({
    queryKey: queryKeys.savings.all,
    queryFn: getSavings,
  })
}

/**
 * React Query mutation hook for creating a saving.
 */
export function useCreateSavingMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSaving,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.savings.all,
      })
    },
  })
}

/**
 * React Query mutation hook for updating a saving.
 */
export function useUpdateSavingMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateSavingInput }) => updateSaving(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.savings.all,
      })
    },
  })
}

/**
 * React Query mutation hook for deleting a saving.
 */
export function useDeleteSavingMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteSaving,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.savings.all,
      })
    },
  })
}
