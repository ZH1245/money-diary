import { desc, eq, isNull, or } from 'drizzle-orm'
import { db } from '#/db/index'
import { categories } from '#/db/schema'
import type { CategoryKind } from '#/features/categories/types/category'

interface CreateUserCategoryParams {
  userId: string
  name: string
  slug: string
  kind: CategoryKind
}

/**
 * Loads categories visible to a user (global + user-owned).
 */
export async function getVisibleCategoriesForUser(userId: string) {
  return db
    .select()
    .from(categories)
    .where(or(isNull(categories.userId), eq(categories.userId, userId)))
    .orderBy(desc(categories.createdAt))
}

/**
 * Creates a category owned by the given user.
 */
export async function createUserCategory(params: CreateUserCategoryParams) {
  const [row] = await db
    .insert(categories)
    .values({
      name: params.name,
      slug: params.slug,
      kind: params.kind,
      userId: params.userId,
    })
    .returning()

  return row
}
