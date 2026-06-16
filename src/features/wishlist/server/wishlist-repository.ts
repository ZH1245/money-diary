import { and, desc, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import { wishlistItems } from '#/db/schema'

interface CreateUserWishlistParams {
  userId: string
  title: string
  targetAmount: string
  currentAmount: string
  priority: 'low' | 'medium' | 'high'
  status: 'active' | 'paused' | 'completed'
  note: string | null
}

/**
 * Loads wishlist entries belonging to a specific user.
 */
export async function getUserWishlistItems(userId: string) {
  return db
    .select()
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, userId))
    .orderBy(desc(wishlistItems.createdAt))
}

/**
 * Creates a wishlist row for a user.
 */
export async function createUserWishlistItem(params: CreateUserWishlistParams) {
  const [row] = await db
    .insert(wishlistItems)
    .values({
      userId: params.userId,
      title: params.title,
      targetAmount: params.targetAmount,
      currentAmount: params.currentAmount,
      priority: params.priority,
      status: params.status,
      note: params.note,
    })
    .returning()

  return row
}

/**
 * Loads one wishlist item owned by a user.
 */
export async function getUserWishlistItemById(userId: string, itemId: number) {
  const [row] = await db
    .select()
    .from(wishlistItems)
    .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.id, itemId)))
    .limit(1)

  return row ?? null
}

/**
 * Updates a wishlist row for a user.
 */
export async function updateUserWishlistItem(params: {
  userId: string
  itemId: number
  title?: string
  targetAmount?: string
  currentAmount?: string
  priority?: 'low' | 'medium' | 'high'
  status?: 'active' | 'paused' | 'completed'
  note?: string | null
}) {
  const [row] = await db
    .update(wishlistItems)
    .set({
      ...(params.title !== undefined ? { title: params.title } : {}),
      ...(params.targetAmount !== undefined ? { targetAmount: params.targetAmount } : {}),
      ...(params.currentAmount !== undefined ? { currentAmount: params.currentAmount } : {}),
      ...(params.priority !== undefined ? { priority: params.priority } : {}),
      ...(params.status !== undefined ? { status: params.status } : {}),
      ...(params.note !== undefined ? { note: params.note } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(wishlistItems.userId, params.userId), eq(wishlistItems.id, params.itemId)))
    .returning()

  return row ?? null
}

/**
 * Deletes a wishlist row for a user.
 */
export async function deleteUserWishlistItem(userId: string, itemId: number) {
  const [row] = await db
    .delete(wishlistItems)
    .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.id, itemId)))
    .returning({ id: wishlistItems.id })

  return row ?? null
}
