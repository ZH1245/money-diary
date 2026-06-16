/**
 * Wishlist record returned by wishlist APIs.
 */
export interface WishlistItemDto {
  id: number
  title: string
  targetAmount: string
  currentAmount: string
  priority: 'low' | 'medium' | 'high'
  status: 'active' | 'paused' | 'completed'
  note: string | null
}

/**
 * Payload accepted by create wishlist API.
 */
export interface CreateWishlistItemInput {
  title: string
  targetAmount: string
  currentAmount?: string
  priority?: 'low' | 'medium' | 'high'
  status?: 'active' | 'paused' | 'completed'
  note?: string
}

/**
 * Payload accepted by update wishlist API.
 */
export interface UpdateWishlistItemInput {
  title?: string
  targetAmount?: string
  currentAmount?: string
  priority?: 'low' | 'medium' | 'high'
  status?: 'active' | 'paused' | 'completed'
  note?: string | null
}
