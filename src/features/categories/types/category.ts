/**
 * Category record returned by categories APIs.
 */
export interface CategoryDto {
  id: number
  name: string
  slug: string
  kind: 'need' | 'want' | 'subscription' | 'other'
  userId?: string | null
}

/**
 * Payload accepted by the create category API.
 */
export interface CreateCategoryInput {
  name: string
  slug: string
  kind: 'need' | 'want' | 'subscription' | 'other'
}
