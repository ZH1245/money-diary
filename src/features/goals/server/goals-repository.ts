import { and, desc, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import { goals } from '#/db/schema'

interface CreateUserGoalParams {
  userId: string
  title: string
  targetAmount: string
  currentAmount: string
  savingsAmount: string
  status: 'active' | 'paused' | 'completed'
  targetDate: Date | null
  note: string | null
}

/**
 * Loads goals belonging to a specific user.
 */
export async function getUserGoals(userId: string) {
  return db
    .select()
    .from(goals)
    .where(eq(goals.userId, userId))
    .orderBy(desc(goals.createdAt))
}

/**
 * Creates a goal row for a user.
 */
export async function createUserGoal(params: CreateUserGoalParams) {
  const [row] = await db
    .insert(goals)
    .values({
      userId: params.userId,
      title: params.title,
      targetAmount: params.targetAmount,
      currentAmount: params.currentAmount,
      savingsAmount: params.savingsAmount,
      status: params.status,
      targetDate: params.targetDate,
      note: params.note,
    })
    .returning()

  return row
}

/**
 * Loads one goal owned by a user.
 */
export async function getUserGoalById(userId: string, goalId: number) {
  const [row] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.id, goalId)))
    .limit(1)

  return row ?? null
}

/**
 * Updates a goal row for a user.
 */
export async function updateUserGoal(params: {
  userId: string
  goalId: number
  title?: string
  targetAmount?: string
  currentAmount?: string
  savingsAmount?: string
  status?: 'active' | 'paused' | 'completed'
  targetDate?: Date | null
  note?: string | null
}) {
  const [row] = await db
    .update(goals)
    .set({
      ...(params.title !== undefined ? { title: params.title } : {}),
      ...(params.targetAmount !== undefined ? { targetAmount: params.targetAmount } : {}),
      ...(params.currentAmount !== undefined ? { currentAmount: params.currentAmount } : {}),
      ...(params.savingsAmount !== undefined ? { savingsAmount: params.savingsAmount } : {}),
      ...(params.status !== undefined ? { status: params.status } : {}),
      ...(params.targetDate !== undefined ? { targetDate: params.targetDate } : {}),
      ...(params.note !== undefined ? { note: params.note } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(goals.userId, params.userId), eq(goals.id, params.goalId)))
    .returning()

  return row ?? null
}

/**
 * Deletes a goal row for a user.
 */
export async function deleteUserGoal(userId: string, goalId: number) {
  const [row] = await db
    .delete(goals)
    .where(and(eq(goals.userId, userId), eq(goals.id, goalId)))
    .returning({ id: goals.id })

  return row ?? null
}
