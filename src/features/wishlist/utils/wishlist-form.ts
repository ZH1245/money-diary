/** Form state for creating or editing a wishlist item. */
export interface WishlistFormState {
  title: string
  targetAmount: string
  currentAmount: string
  priority: 'low' | 'medium' | 'high'
  status: 'active' | 'paused' | 'completed'
  note: string
}

/** Returns empty defaults for the wishlist create/edit sheet. */
export function getDefaultWishlistForm(): WishlistFormState {
  return {
    title: '',
    targetAmount: '',
    currentAmount: '0',
    priority: 'medium',
    status: 'active',
    note: '',
  }
}
