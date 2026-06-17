import type { ApiListResponse } from '#/types/api'
import type { CategoryDto, CreateCategoryInput } from '../types/category'

/**
 * Loads categories visible to the current user context.
 */
export async function getCategories(): Promise<CategoryDto[]> {
  const response = await fetch('/api/categories')
  const json = (await response.json()) as ApiListResponse<CategoryDto>

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to load categories')
  }

  return json.data
}

/**
 * Creates a new category entry.
 */
export async function createCategory(input: CreateCategoryInput): Promise<CategoryDto> {
  const response = await fetch('/api/categories', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const json = (await response.json()) as { success: boolean; data: CategoryDto; error?: string }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to create category')
  }

  return json.data
}

/**
 * Deletes a user-owned category.
 */
export async function deleteCategory(id: number): Promise<void> {
  const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
  const json = (await response.json()) as { success: boolean; error?: string }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to delete category')
  }
}
