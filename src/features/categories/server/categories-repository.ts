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
export async function deleteUserCategory(userId: string, categoryId: number) {
  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1)

  if (!category) {
    return null
  }

  const [{ transactionCount }] = await db
    .select({ transactionCount: count() })
    .from(transactions)
    .where(and(eq(transactions.categoryId, categoryId), eq(transactions.userId, userId)))

  if (Number(transactionCount) > 0) {
    return { blocked: true as const }
  }

  const [deleted] = await db
    .delete(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .returning()

  return deleted ?? null
}
