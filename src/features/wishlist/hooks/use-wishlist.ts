import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createWishlistItem, deleteWishlistItem, getWishlistItems, updateWishlistItem } from '../api/wishlist-api'
import type { UpdateWishlistItemInput } from '../types/wishlist'
import { queryKeys } from '#/features/query-keys'

/**
 * React Query hook for fetching wishlist entries.
 */
export function useWishlistQuery() {
  return useQuery({
    queryKey: queryKeys.wishlist.all,
    queryFn: getWishlistItems,
  })
}

/**
 * React Query mutation hook for creating a wishlist entry.
 */
export function useCreateWishlistMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createWishlistItem,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.wishlist.all,
      })
    },
  })
}

/**
 * React Query mutation hook for updating a wishlist entry.
 */
export function useUpdateWishlistMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateWishlistItemInput }) => updateWishlistItem(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.wishlist.all,
      })
    },
  })
}

/**
 * React Query mutation hook for deleting a wishlist entry.
 */
export function useDeleteWishlistMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteWishlistItem,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.wishlist.all,
      })
    },
  })
}
