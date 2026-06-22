import type { CategoryDto } from '#/features/categories/types/category'

/** Form state for creating a personal category. */
export interface CategoryFormState {
  name: string
  kind: CategoryDto['kind']
}

/** Returns empty defaults for the category create sheet. */
export function getDefaultCategoryForm(): CategoryFormState {
  return {
    name: '',
    kind: 'need',
  }
}

export const CATEGORY_KIND_OPTIONS = [
  { value: 'need', label: 'Need' },
  { value: 'want', label: 'Want' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'charity', label: 'Charity' },
  { value: 'other', label: 'Other' },
] as const
