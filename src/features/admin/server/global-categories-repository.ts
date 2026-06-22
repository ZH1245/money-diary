import { and, count, desc, eq, isNull } from 'drizzle-orm'
import { db } from '#/db/index'
import { categories, transactions } from '#/db/schema'
import type { CategoryKind } from '#/features/categories/types/category'

/**
 * Lists all global (built-in) categories for admin management.
 */
export async function getGlobalCategories() {
  return db
    .select()
    .from(categories)
    .where(isNull(categories.userId))
    .orderBy(desc(categories.createdAt))
}

/**
 * Creates a global category visible to all users.
 */
export async function createGlobalCategory({
  name,
  slug,
  kind,
}: {
  name: string
  slug: string
  kind: CategoryKind
}) {
  const [row] = await db
    .insert(categories)
    .values({
      name,
      slug,
      kind,
      userId: null,
    })
    .returning()

  return row
}

/**
 * Updates a global category by id.
 */
export async function updateGlobalCategory({
  categoryId,
  name,
  slug,
  kind,
}: {
  categoryId: number
  name?: string
  slug?: string
  kind?: CategoryKind
}) {
  const [existing] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), isNull(categories.userId)))
    .limit(1)

  if (!existing) return null

  const [row] = await db
    .update(categories)
    .set({
      ...(name !== undefined ? { name } : {}),
      ...(slug !== undefined ? { slug } : {}),
      ...(kind !== undefined ? { kind } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(categories.id, categoryId), isNull(categories.userId)))
    .returning()

  return row ?? null
}

/**
 * Deletes a global category when it is not referenced by any transaction.
 */
export async function deleteGlobalCategory(
  categoryId: number,
): Promise<{ status: 'deleted'; id: number } | { status: 'blocked' } | { status: 'not_found' }> {
  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), isNull(categories.userId)))
    .limit(1)

  if (!category) {
    return { status: 'not_found' }
  }

  const [{ transactionCount }] = await db
    .select({ transactionCount: count() })
    .from(transactions)
    .where(eq(transactions.categoryId, categoryId))

  if (Number(transactionCount) > 0) {
    return { status: 'blocked' }
  }

  const [deleted] = await db
    .delete(categories)
    .where(and(eq(categories.id, categoryId), isNull(categories.userId)))
    .returning({ id: categories.id })

  if (!deleted) {
    return { status: 'not_found' }
  }

  return { status: 'deleted', id: deleted.id }
}
