import { and, desc, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import { savings } from '#/db/schema'

interface CreateUserSavingParams {
  userId: string
  goalId: number | null
  paymentAccountId: number | null
  title: string
  amount: string
  note: string | null
  savedAt: Date
}

/**
 * Loads savings belonging to a specific user.
 */
export async function getUserSavings(userId: string) {
  return db
    .select()
    .from(savings)
    .where(eq(savings.userId, userId))
    .orderBy(desc(savings.savedAt))
}

/**
 * Creates a saving row for a user.
 */
export async function createUserSaving(params: CreateUserSavingParams) {
  const [row] = await db
    .insert(savings)
    .values({
      userId: params.userId,
      goalId: params.goalId,
      paymentAccountId: params.paymentAccountId,
      title: params.title,
      amount: params.amount,
      note: params.note,
      savedAt: params.savedAt,
    })
    .returning()

  return row
}

/**
 * Loads one saving owned by a user.
 */
export async function getUserSavingById(userId: string, savingId: number) {
  const [row] = await db
    .select()
    .from(savings)
    .where(and(eq(savings.userId, userId), eq(savings.id, savingId)))
    .limit(1)

  return row ?? null
}

/**
 * Updates a saving row for a user.
 */
export async function updateUserSaving(params: {
  userId: string
  savingId: number
  title?: string
  amount?: string
  note?: string | null
  savedAt?: Date
  goalId?: number | null
  paymentAccountId?: number | null
}) {
  const [row] = await db
    .update(savings)
    .set({
      ...(params.title !== undefined ? { title: params.title } : {}),
      ...(params.amount !== undefined ? { amount: params.amount } : {}),
      ...(params.note !== undefined ? { note: params.note } : {}),
      ...(params.savedAt !== undefined ? { savedAt: params.savedAt } : {}),
      ...(params.goalId !== undefined ? { goalId: params.goalId } : {}),
      ...(params.paymentAccountId !== undefined ? { paymentAccountId: params.paymentAccountId } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(savings.userId, params.userId), eq(savings.id, params.savingId)))
    .returning()

  return row ?? null
}

/**
 * Deletes a saving row for a user.
 */
export async function deleteUserSaving(userId: string, savingId: number) {
  const [row] = await db
    .delete(savings)
    .where(and(eq(savings.userId, userId), eq(savings.id, savingId)))
    .returning({ id: savings.id })

  return row ?? null
}
