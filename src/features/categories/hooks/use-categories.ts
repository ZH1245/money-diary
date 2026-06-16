import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCategory, getCategories } from '../api/categories-api'
import { queryKeys } from '#/features/query-keys'

/**
 * React Query hook for fetching categories.
 */
export function useCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: getCategories,
  })
}

/**
 * React Query mutation hook for creating a category.
 */
export function useCreateCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createCategory,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.categories.all,
      })
    },
  })
}
