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
  categoryId: number | null
  paymentAccountId: number | null
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
      paymentAccountId: params.paymentAccountId,
      source: params.source,
      note: params.note,
      happenedAt: params.happenedAt,
    })
    .returning()

  return row
}

interface UpdateUserTransactionParams {
  userId: string
  transactionId: number
  title?: string
  amount?: string
  sourceAmount?: string | null
  sourceCurrency?: string
  exchangeRate?: string
  type?: 'income' | 'expense' | 'transfer'
  categoryId?: number | null
  paymentAccountId?: number | null
  source?: string | null
  note?: string | null
  happenedAt?: Date
}

/**
 * Loads one transaction owned by a user.
 */
export async function getUserTransactionById(userId: string, transactionId: number) {
  const [row] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.id, transactionId)))
    .limit(1)

  return row ?? null
}

/**
 * Updates a transaction row for a user.
 */
export async function updateUserTransaction(params: UpdateUserTransactionParams) {
  const [row] = await db
    .update(transactions)
    .set({
      ...(params.title !== undefined ? { title: params.title } : {}),
      ...(params.amount !== undefined ? { amount: params.amount } : {}),
      ...(params.sourceAmount !== undefined ? { sourceAmount: params.sourceAmount } : {}),
      ...(params.sourceCurrency !== undefined ? { sourceCurrency: params.sourceCurrency } : {}),
      ...(params.exchangeRate !== undefined ? { exchangeRate: params.exchangeRate } : {}),
      ...(params.type !== undefined ? { type: params.type } : {}),
      ...(params.categoryId !== undefined ? { categoryId: params.categoryId } : {}),
      ...(params.paymentAccountId !== undefined ? { paymentAccountId: params.paymentAccountId } : {}),
      ...(params.source !== undefined ? { source: params.source } : {}),
      ...(params.note !== undefined ? { note: params.note } : {}),
      ...(params.happenedAt !== undefined ? { happenedAt: params.happenedAt } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(transactions.userId, params.userId), eq(transactions.id, params.transactionId)))
    .returning()

  return row ?? null
}

/**
 * Deletes a transaction row for a user.
 */
export async function deleteUserTransaction(userId: string, transactionId: number) {
  const [row] = await db
    .delete(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.id, transactionId)))
    .returning({ id: transactions.id })

  return row ?? null
}
