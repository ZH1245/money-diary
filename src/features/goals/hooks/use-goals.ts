import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createGoal, deleteGoal, getGoals, updateGoal } from '../api/goals-api'
import type { UpdateGoalInput } from '../types/goal'
import { queryKeys } from '#/features/query-keys'

/**
 * React Query hook for fetching goals.
 */
export function useGoalsQuery() {
  return useQuery({
    queryKey: queryKeys.goals.all,
    queryFn: getGoals,
  })
}

/**
 * React Query mutation hook for creating a goal.
 */
export function useCreateGoalMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createGoal,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.goals.all,
      })
    },
  })
}

/**
 * React Query mutation hook for updating a goal.
 */
export function useUpdateGoalMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateGoalInput }) => updateGoal(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.goals.all,
      })
    },
  })
}

/**
 * React Query mutation hook for deleting a goal.
 */
export function useDeleteGoalMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteGoal,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.goals.all,
      })
    },
  })
}
