import { and, count, desc, eq, isNull, or } from 'drizzle-orm'
import { db } from '#/db/index'
import { categories, transactions } from '#/db/schema'
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

/**
 * Deletes a user-owned category when it is not referenced by transactions.
 */
export async function deleteUserCategory(
  userId: string,
  categoryId: number,
): Promise<{ status: 'deleted'; id: number } | { status: 'blocked' } | { status: 'not_found' } | { status: 'protected' }> {
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1)

  if (!category) {
    return { status: 'not_found' }
  }

  if (category.userId == null) {
    return { status: 'protected' }
  }

  if (category.userId !== userId) {
    return { status: 'not_found' }
  }

  const [{ transactionCount }] = await db
    .select({ transactionCount: count() })
    .from(transactions)
    .where(and(eq(transactions.categoryId, categoryId), eq(transactions.userId, userId)))

  if (Number(transactionCount) > 0) {
    return { status: 'blocked' }
  }

  const [deleted] = await db
    .delete(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .returning({ id: categories.id })

  if (!deleted) {
    return { status: 'not_found' }
  }

  return { status: 'deleted', id: deleted.id }
}
