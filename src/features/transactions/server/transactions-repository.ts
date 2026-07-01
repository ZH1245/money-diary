import { randomUUID } from 'node:crypto'
import { and, desc, eq, gte, isNull, lte, or } from 'drizzle-orm'
import { endOfDay, startOfDay } from 'date-fns'
import { db } from '#/db/index'
import { categories, transactions } from '#/db/schema'
import {
  findTransactionDuplicate,
  type TransactionDuplicateCandidate,
} from '#/features/transactions/utils/transaction-duplicate'
import {
  TRANSFER_SOURCE_IN,
  TRANSFER_SOURCE_OUT,
} from '#/features/transactions/utils/transfer-direction'

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
 * Loads confirmed transactions belonging to a specific user.
 * Excludes drafts so all balances, stats, and lists automatically omit them.
 */
export async function getUserTransactions(userId: string) {
  return db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.status, 'confirmed')))
    .orderBy(desc(transactions.happenedAt))
}

/**
 * Loads draft (pending) transactions belonging to a specific user, ordered by
 * scheduled date ascending so the soonest pending item appears first.
 */
export async function getUserDraftTransactions(userId: string) {
  return db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.status, 'draft')))
    .orderBy(transactions.happenedAt)
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
 * Validates an optional transfer category and returns the stored id (or null).
 */
export async function resolveOptionalTransferCategoryId(
  userId: string,
  categoryId: number | null | undefined,
): Promise<number | null | 'not_found'> {
  const resolved = categoryId ?? null
  if (resolved === null) {
    return null
  }

  const canUseCategory = await isCategoryAccessibleByUser({
    userId,
    categoryId: resolved,
  })

  if (!canUseCategory) {
    return 'not_found'
  }

  return resolved
}

/**
 * Loads confirmed transactions for one user on a single calendar day.
 * Excludes drafts so they cannot block real duplicate detection.
 */
export async function getUserTransactionsOnDay(userId: string, happenedAt: Date) {
  return db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.status, 'confirmed'),
        gte(transactions.happenedAt, startOfDay(happenedAt)),
        lte(transactions.happenedAt, endOfDay(happenedAt)),
      ),
    )
    .orderBy(desc(transactions.happenedAt))
}

/**
 * Returns an existing transaction that matches title, amount, type, and day.
 */
export async function findUserTransactionDuplicate(params: {
  userId: string
  title: string
  amount: string
  type: 'income' | 'expense' | 'transfer'
  happenedAt: Date
}): Promise<TransactionDuplicateCandidate | null> {
  const rows = await getUserTransactionsOnDay(params.userId, params.happenedAt)
  const candidates: TransactionDuplicateCandidate[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    amount: row.amount,
    type: row.type,
    happenedAt: row.happenedAt,
  }))

  return findTransactionDuplicate(candidates, params)
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

interface CreateTransferParams {
  userId: string
  title: string
  amount: string
  sourceAmount: string | null
  sourceCurrency: string
  exchangeRate: string
  fromPaymentAccountId: number
  toPaymentAccountId: number
  categoryId: number | null
  note: string | null
  happenedAt: Date
}

/**
 * Creates a transfer as two linked legs (debit on the source account, credit on
 * the destination account) sharing one transferGroupId, in a single transaction.
 */
export async function createTransfer(params: CreateTransferParams) {
  const transferGroupId = randomUUID()
  const shared = {
    userId: params.userId,
    title: params.title,
    amount: params.amount,
    sourceAmount: params.sourceAmount,
    sourceCurrency: params.sourceCurrency,
    exchangeRate: params.exchangeRate,
    type: 'transfer' as const,
    categoryId: params.categoryId,
    note: params.note,
    transferGroupId,
    happenedAt: params.happenedAt,
  }

  const rows = await db
    .insert(transactions)
    .values([
      {
        ...shared,
        paymentAccountId: params.fromPaymentAccountId,
        source: TRANSFER_SOURCE_OUT,
      },
      {
        ...shared,
        paymentAccountId: params.toPaymentAccountId,
        source: TRANSFER_SOURCE_IN,
      },
    ])
    .returning()

  return rows
}

interface ConvertTransactionToTransferParams extends CreateTransferParams {
  transactionId: number
}

/**
 * Replaces a single income/expense row with a two-leg transfer atomically.
 */
export async function convertTransactionToTransfer(
  params: ConvertTransactionToTransferParams,
) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, params.userId),
          eq(transactions.id, params.transactionId),
        ),
      )
      .limit(1)

    if (!existing) {
      return null
    }

    if (existing.transferGroupId || existing.type === 'transfer') {
      throw new Error('Transaction is already a transfer')
    }

    const transferGroupId = randomUUID()
    const shared = {
      userId: params.userId,
      title: params.title,
      amount: params.amount,
      sourceAmount: params.sourceAmount,
      sourceCurrency: params.sourceCurrency,
      exchangeRate: params.exchangeRate,
      type: 'transfer' as const,
      categoryId: params.categoryId,
      note: params.note,
      transferGroupId,
      happenedAt: params.happenedAt,
    }

    const rows = await tx
      .insert(transactions)
      .values([
        {
          ...shared,
          paymentAccountId: params.fromPaymentAccountId,
          source: TRANSFER_SOURCE_OUT,
        },
        {
          ...shared,
          paymentAccountId: params.toPaymentAccountId,
          source: TRANSFER_SOURCE_IN,
        },
      ])
      .returning()

    await tx
      .delete(transactions)
      .where(
        and(
          eq(transactions.userId, params.userId),
          eq(transactions.id, params.transactionId),
        ),
      )

    return rows
  })
}

interface UpdateTransferParams {
  userId: string
  transferGroupId: string
  title: string
  amount: string
  sourceAmount: string | null
  sourceCurrency: string
  exchangeRate: string
  fromPaymentAccountId: number
  toPaymentAccountId: number
  categoryId: number | null
  note: string | null
  happenedAt: Date
}

/**
 * Updates both legs of a transfer atomically, reassigning each leg to its account.
 */
export async function updateTransfer(params: UpdateTransferParams) {
  return db.transaction(async (tx) => {
    const shared = {
      title: params.title,
      amount: params.amount,
      sourceAmount: params.sourceAmount,
      sourceCurrency: params.sourceCurrency,
      exchangeRate: params.exchangeRate,
      categoryId: params.categoryId,
      note: params.note,
      happenedAt: params.happenedAt,
      updatedAt: new Date(),
    }

    await tx
      .update(transactions)
      .set({ ...shared, paymentAccountId: params.fromPaymentAccountId })
      .where(
        and(
          eq(transactions.userId, params.userId),
          eq(transactions.transferGroupId, params.transferGroupId),
          eq(transactions.source, TRANSFER_SOURCE_OUT),
        ),
      )

    await tx
      .update(transactions)
      .set({ ...shared, paymentAccountId: params.toPaymentAccountId })
      .where(
        and(
          eq(transactions.userId, params.userId),
          eq(transactions.transferGroupId, params.transferGroupId),
          eq(transactions.source, TRANSFER_SOURCE_IN),
        ),
      )

    return tx
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, params.userId),
          eq(transactions.transferGroupId, params.transferGroupId),
        ),
      )
  })
}

/**
 * Deletes both legs of a transfer for a user.
 */
export async function deleteTransfer(userId: string, transferGroupId: string) {
  return db
    .delete(transactions)
    .where(
      and(eq(transactions.userId, userId), eq(transactions.transferGroupId, transferGroupId)),
    )
    .returning({ id: transactions.id })
}

interface CreateScheduledTransactionParams {
  userId: string
  title: string
  amount: string
  sourceAmount: string | null
  sourceCurrency: string
  exchangeRate: string
  type: 'income' | 'expense'
  categoryId: number | null
  paymentAccountId: number | null
  note: string | null
  happenedAt: Date
}

/**
 * Creates a transaction row with status='draft'. It does not affect any balance
 * or stat until confirmed by the user.
 */
export async function createScheduledTransaction(params: CreateScheduledTransactionParams) {
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
      source: 'scheduled',
      note: params.note,
      status: 'draft',
      happenedAt: params.happenedAt,
    })
    .returning()

  return row
}

/**
 * Confirms a draft transaction, making it affect balances and stats.
 * Keeps the original happenedAt (scheduled date) intact.
 */
export async function confirmDraftTransaction(userId: string, transactionId: number) {
  const [row] = await db
    .update(transactions)
    .set({ status: 'confirmed', updatedAt: new Date() })
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.id, transactionId),
        eq(transactions.status, 'draft'),
      ),
    )
    .returning()

  return row ?? null
}

/**
 * Discards a draft transaction permanently. Has no effect on balances.
 */
export async function discardDraftTransaction(userId: string, transactionId: number) {
  const [row] = await db
    .delete(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.id, transactionId),
        eq(transactions.status, 'draft'),
      ),
    )
    .returning({ id: transactions.id })

  return row ?? null
}
