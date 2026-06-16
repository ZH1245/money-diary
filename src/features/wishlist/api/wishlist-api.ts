import type { ApiListResponse } from '#/types/api'
import type { CreateWishlistItemInput, UpdateWishlistItemInput, WishlistItemDto } from '../types/wishlist'

/**
 * Loads wishlist entries for the active user context.
 */
export async function getWishlistItems(): Promise<WishlistItemDto[]> {
  const response = await fetch('/api/wishlist')
  const json = (await response.json()) as ApiListResponse<WishlistItemDto>

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to load wishlist')
  }

  return json.data
}

/**
 * Creates a new wishlist entry.
 */
export async function createWishlistItem(input: CreateWishlistItemInput): Promise<WishlistItemDto> {
  const response = await fetch('/api/wishlist', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const json = (await response.json()) as { success: boolean; data: WishlistItemDto; error?: string }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to create wishlist item')
  }

  return json.data
}

/**
 * Updates a wishlist entry.
 */
export async function updateWishlistItem(id: number, input: UpdateWishlistItemInput): Promise<WishlistItemDto> {
  const response = await fetch(`/api/wishlist/${id}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const json = (await response.json()) as { success: boolean; data: WishlistItemDto; error?: string }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to update wishlist item')
  }

  return json.data
}

/**
 * Deletes a wishlist entry.
 */
export async function deleteWishlistItem(id: number): Promise<void> {
  const response = await fetch(`/api/wishlist/${id}`, { method: 'DELETE' })
  const json = (await response.json()) as { success: boolean; error?: string }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to delete wishlist item')
  }
}
