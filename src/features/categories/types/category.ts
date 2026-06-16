/**
 * Supported category kinds in Money Diary.
 */
export const CATEGORY_KINDS = ['need', 'want', 'subscription', 'charity', 'other'] as const

export type CategoryKind = (typeof CATEGORY_KINDS)[number]

/**
 * Category record returned by categories APIs.
 */
export interface CategoryDto {
  id: number
  name: string
  slug: string
  kind: CategoryKind
  userId?: string | null
}

/**
 * Payload accepted by the create category API.
 */
export interface CreateCategoryInput {
  name: string
  slug: string
  kind: CategoryKind
}
