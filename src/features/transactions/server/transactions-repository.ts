import { and, desc, eq, isNull, or } from 'drizzle-orm'
import { db } from '#/db/index'
import { categories, transactions } from '#/db/schema'

interface CreateUserTransactionParams {
  userId: string
  title: string
  amount: string
  sourceAmount: string | null
  sourceCurrency: string
  exchangeRate: string
  type: 'income' | 'expense' | 'transfer'
  categoryId: number
  source: string | null
  note: string | null
  happenedAt: Date
}

/**
 * Loads transactions belonging to a specific user.
 */
export async function getUserTransactions(userId: string) {
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.happenedAt))
}

/**
 * Returns true when category is global or owned by user.
 */
export async function isCategoryAccessibleByUser({
  userId,
  categoryId,
}: {
  userId: string
  categoryId: number
}) {
  const category = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        or(isNull(categories.userId), eq(categories.userId, userId)),
      ),
    )
    .limit(1)

  return category.length > 0
}

/**
 * Creates a transaction row for a user.
 */
export async function createUserTransaction(params: CreateUserTransactionParams) {
  const [row] = await db
    .insert(transactions)
    .values({
      userId: params.userId,
      title: params.title,
      amount: params.amount,
      sourceAmount: params.sourceAmount,
      sourceCurrency: params.sourceCurrency,
      exchangeRate: params.exchangeRate,
      type: params.type,
      categoryId: params.categoryId,
      source: params.source,
      note: params.note,
      happenedAt: params.happenedAt,
    })
    .returning()

  return row
}
