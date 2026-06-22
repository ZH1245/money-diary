import { z } from 'zod'
import {
  createUserTransaction,
  getUserTransactionById,
  isCategoryAccessibleByUser,
  updateUserTransaction,
} from '#/features/transactions/server/transactions-repository'
import {
  getVisibleCategoriesForUser,
  createUserCategory,
} from '#/features/categories/server/categories-repository'
import {
  getUserPaymentAccounts,
  isPaymentAccountAccessibleByUser,
} from '#/features/payment-accounts/server/payment-accounts-repository'
import { createUserSaving } from '#/features/savings/server/savings-repository'
import { createUserGoal, deleteUserGoal, getUserGoalById, getUserGoals, updateUserGoal } from '#/features/goals/server/goals-repository'
import {
  createUserWishlistItem,
  deleteUserWishlistItem,
  getUserWishlistItemById,
  getUserWishlistItems,
  updateUserWishlistItem,
} from '#/features/wishlist/server/wishlist-repository'
import { slugifyCategoryName } from '#/features/categories/utils/category-slug'
import {
  requiresTransactionCategory,
  resolveTransactionCategoryId,
  type TransactionType,
} from '#/features/transactions/utils/transaction-category'
import { normalizeTransactionAmount } from '#/features/transactions/utils/transaction-currency'
import { fetchExchangeRate } from '#/features/exchange-rates/server/fetch-exchange-rate'
import { format, parseISO, startOfMonth } from 'date-fns'
import type { AiToolAction } from '#/features/ai/server/ai-tools'
import { resolveAiNavigateTo } from '#/features/ai/utils/ai-navigation'
import { queryUserData } from '#/features/ai/server/ai-user-data-query'

const createTransactionArgsSchema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().trim().length(3).optional(),
  type: z.enum(['expense', 'income', 'transfer']),
  date: z.string().min(6).optional(),
  categoryId: z.number().int().optional(),
  categoryName: z.string().optional(),
  paymentAccountId: z.number().int().positive().optional(),
  note: z.string().optional(),
})

const updateTransactionArgsSchema = z.object({
  transactionId: z.number().int().positive(),
  title: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().trim().length(3).optional(),
  type: z.enum(['expense', 'income', 'transfer']).optional(),
  date: z.string().min(6).optional(),
  categoryId: z.number().int().optional(),
  categoryName: z.string().optional(),
  paymentAccountId: z.number().int().positive().optional(),
  note: z.string().optional(),
})

const createSavingArgsSchema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().min(6).optional(),
  goalId: z.number().int().positive().optional(),
  paymentAccountId: z.number().int().positive().optional(),
  note: z.string().optional(),
})

const createGoalArgsSchema = z.object({
  title: z.string().min(1),
  targetAmount: z.number().positive(),
  targetDate: z.string().optional(),
  note: z.string().optional(),
})

const createWishlistArgsSchema = z.object({
  title: z.string().min(1),
  targetAmount: z.number().positive(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  note: z.string().optional(),
})

const updateWishlistArgsSchema = z.object({
  itemId: z.number().int().positive(),
  title: z.string().min(1).optional(),
  targetAmount: z.number().positive().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['active', 'paused', 'completed']).optional(),
  note: z.string().optional(),
})

const deleteWishlistArgsSchema = z.object({
  itemId: z.number().int().positive(),
})

const updateGoalArgsSchema = z.object({
  goalId: z.number().int().positive(),
  title: z.string().min(1).optional(),
  targetAmount: z.number().positive().optional(),
  status: z.enum(['active', 'paused', 'completed']).optional(),
  targetDate: z.string().optional(),
  note: z.string().optional(),
})

const deleteGoalArgsSchema = z.object({
  goalId: z.number().int().positive(),
})

const queryUserDataArgsSchema = z.object({
  dataset: z.enum(['transactions', 'savings', 'goals', 'wishlist']).optional(),
  fromDate: z.string().min(6).optional(),
  toDate: z.string().min(6).optional(),
  transactionType: z.enum(['expense', 'income', 'transfer', 'all']).optional(),
  groupBy: z.enum(['none', 'date', 'category']).optional(),
  limit: z.number().int().positive().max(100).optional(),
})

const getExchangeRateArgsSchema = z.object({
  fromCurrency: z.string().trim().length(3),
  toCurrency: z.string().trim().length(3),
})

export interface AiToolExecutionContext {
  userId: string
  currency: string
  today: string
  userGoals: Array<{ id: number; title: string }>
}

export interface AiToolStepResult {
  action: AiToolAction
  success: boolean
  message: string
  entityId?: number
  navigateTo?: string
  data?: Record<string, unknown>
}

/**
 * Executes one validated AI tool call for the authenticated user only.
 */
export async function executeAiTool({
  toolName,
  toolArgs,
  context,
}: {
  toolName: string
  toolArgs: unknown
  context: AiToolExecutionContext
}): Promise<AiToolStepResult> {
  if (toolName === 'create_transaction') {
    const args = createTransactionArgsSchema.safeParse(toolArgs)
    if (!args.success) {
      return { action: 'create_transaction', success: false, message: 'Invalid transaction arguments.' }
    }

    const { title, amount, type, date, currency: rawCurrency, categoryId: rawCatId, categoryName, paymentAccountId: rawAccId, note } = args.data

    let categoryId: number | null = null
    if (type === 'income') {
      categoryId = null
    } else if (rawCatId === undefined) {
      return { action: 'create_transaction', success: false, message: 'Category is required for expense and transfer.' }
    } else if (rawCatId === -1) {
      if (!categoryName?.trim()) {
        return { action: 'create_transaction', success: false, message: 'Category name is required for new category.' }
      }
      const newCat = await createUserCategory({
        userId: context.userId,
        name: categoryName.trim(),
        slug: slugifyCategoryName(categoryName),
        kind: 'other',
      })
      categoryId = newCat.id
    } else {
      const ok = await isCategoryAccessibleByUser({ userId: context.userId, categoryId: rawCatId })
      if (!ok) return { action: 'create_transaction', success: false, message: 'Category not accessible.' }
      categoryId = rawCatId
    }

    categoryId = resolveTransactionCategoryId(type, categoryId)
    if (requiresTransactionCategory(type) && categoryId === null) {
      return { action: 'create_transaction', success: false, message: 'Category is required for expense and transfer.' }
    }

    let paymentAccountId: number | null = null
    if (rawAccId != null) {
      const ok = await isPaymentAccountAccessibleByUser({ userId: context.userId, paymentAccountId: rawAccId })
      if (!ok) return { action: 'create_transaction', success: false, message: 'Account not accessible.' }
      paymentAccountId = rawAccId
    }

    const happenedAt = resolveToolDate(date, context.today)
    if (!happenedAt) {
      return { action: 'create_transaction', success: false, message: `Invalid date: ${date ?? context.today}` }
    }

    const amountResult = await resolveAiTransactionAmount({
      amount,
      currency: rawCurrency,
      userCurrency: context.currency,
    })
    if (!amountResult.ok) {
      return { action: 'create_transaction', success: false, message: amountResult.error }
    }

    const row = await createUserTransaction({
      userId: context.userId,
      title: title.trim(),
      amount: amountResult.data.normalizedAmount,
      sourceAmount: amountResult.data.sourceAmount,
      sourceCurrency: amountResult.data.sourceCurrency,
      exchangeRate: amountResult.data.exchangeRate,
      type,
      categoryId,
      paymentAccountId,
      source: 'ai',
      note: note?.trim() || null,
      happenedAt,
    })

    return buildWriteStepResult({
      action: 'create_transaction',
      success: true,
      message: buildTransactionSuccessMessage({
        title: row.title,
        type: row.type,
        happenedAt,
        sourceAmount: amountResult.data.sourceAmount,
        sourceCurrency: amountResult.data.sourceCurrency,
        normalizedAmount: amountResult.data.normalizedAmount,
        ledgerCurrency: context.currency,
      }),
      entityId: row.id,
    })
  }

  if (toolName === 'update_transaction') {
    const args = updateTransactionArgsSchema.safeParse(toolArgs)
    if (!args.success) {
      return { action: 'update_transaction', success: false, message: 'Invalid transaction update arguments.' }
    }

    const existing = await getUserTransactionById(context.userId, args.data.transactionId)
    if (!existing) {
      return { action: 'update_transaction', success: false, message: 'Transaction not found.' }
    }

    const nextType = (args.data.type ?? existing.type) as TransactionType
    let categoryId: number | null = existing.categoryId

    if (nextType === 'income') {
      categoryId = null
    } else if (args.data.categoryId !== undefined) {
      if (args.data.categoryId === -1) {
        if (!args.data.categoryName?.trim()) {
          return { action: 'update_transaction', success: false, message: 'Category name is required for new category.' }
        }
        const newCat = await createUserCategory({
          userId: context.userId,
          name: args.data.categoryName.trim(),
          slug: slugifyCategoryName(args.data.categoryName),
          kind: 'other',
        })
        categoryId = newCat.id
      } else {
        const ok = await isCategoryAccessibleByUser({ userId: context.userId, categoryId: args.data.categoryId })
        if (!ok) return { action: 'update_transaction', success: false, message: 'Category not accessible.' }
        categoryId = args.data.categoryId
      }
    } else if (args.data.type !== undefined && requiresTransactionCategory(nextType) && categoryId === null) {
      return {
        action: 'update_transaction',
        success: false,
        message: 'Category is required when changing to expense or transfer.',
      }
    }

    categoryId = resolveTransactionCategoryId(nextType, categoryId)
    if (requiresTransactionCategory(nextType) && categoryId === null) {
      return { action: 'update_transaction', success: false, message: 'Category is required for expense and transfer.' }
    }

    let paymentAccountId: number | null | undefined
    if (args.data.paymentAccountId !== undefined) {
      const ok = await isPaymentAccountAccessibleByUser({
        userId: context.userId,
        paymentAccountId: args.data.paymentAccountId,
      })
      if (!ok) return { action: 'update_transaction', success: false, message: 'Account not accessible.' }
      paymentAccountId = args.data.paymentAccountId
    }

    let happenedAtUpdate: Date | undefined
    if (args.data.date !== undefined) {
      const parsedDate = resolveToolDate(args.data.date, context.today)
      if (!parsedDate) {
        return { action: 'update_transaction', success: false, message: `Invalid date: ${args.data.date}` }
      }
      happenedAtUpdate = parsedDate
    }

    let amount: string | undefined
    let sourceAmount: string | null | undefined
    let sourceCurrency: string | undefined
    let exchangeRate: string | undefined

    if (args.data.amount !== undefined || args.data.currency !== undefined) {
      const amountResult = await resolveAiTransactionAmount({
        amount: args.data.amount ?? Number(existing.sourceAmount ?? existing.amount),
        currency: args.data.currency ?? existing.sourceCurrency,
        userCurrency: context.currency,
      })
      if (!amountResult.ok) {
        return { action: 'update_transaction', success: false, message: amountResult.error }
      }
      amount = amountResult.data.normalizedAmount
      sourceAmount = amountResult.data.sourceAmount
      sourceCurrency = amountResult.data.sourceCurrency
      exchangeRate = amountResult.data.exchangeRate
    }

    const shouldUpdateCategory = args.data.type !== undefined || args.data.categoryId !== undefined

    const row = await updateUserTransaction({
      userId: context.userId,
      transactionId: args.data.transactionId,
      ...(args.data.title !== undefined ? { title: args.data.title.trim() } : {}),
      ...(amount !== undefined ? { amount } : {}),
      ...(sourceAmount !== undefined ? { sourceAmount } : {}),
      ...(sourceCurrency !== undefined ? { sourceCurrency } : {}),
      ...(exchangeRate !== undefined ? { exchangeRate } : {}),
      ...(args.data.type !== undefined ? { type: args.data.type } : {}),
      ...(shouldUpdateCategory ? { categoryId } : {}),
      ...(paymentAccountId !== undefined ? { paymentAccountId } : {}),
      ...(args.data.note !== undefined ? { note: args.data.note.trim() || null } : {}),
      ...(happenedAtUpdate !== undefined ? { happenedAt: happenedAtUpdate } : {}),
    })

    if (!row) {
      return { action: 'update_transaction', success: false, message: 'Transaction not found.' }
    }

    return buildWriteStepResult({
      action: 'update_transaction',
      success: true,
      message: `Transaction updated: "${row.title}" (${row.type})`,
      entityId: row.id,
    })
  }

  if (toolName === 'create_saving') {
    const args = createSavingArgsSchema.safeParse(toolArgs)
    if (!args.success) {
      return { action: 'create_saving', success: false, message: 'Invalid saving arguments.' }
    }

    const { title, amount, date, goalId: rawGoalId, paymentAccountId: rawAccId, note } = args.data

    let goalId: number | null = null
    if (rawGoalId != null) {
      const goal = await getUserGoalById(context.userId, rawGoalId)
      if (!goal) return { action: 'create_saving', success: false, message: 'Goal not accessible.' }
      goalId = rawGoalId
    }

    let paymentAccountId: number | null = null
    if (rawAccId != null) {
      const ok = await isPaymentAccountAccessibleByUser({ userId: context.userId, paymentAccountId: rawAccId })
      if (!ok) return { action: 'create_saving', success: false, message: 'Account not accessible.' }
      paymentAccountId = rawAccId
    }

    const savedAt = resolveToolDate(date, context.today)
    if (!savedAt) {
      return { action: 'create_saving', success: false, message: `Invalid date: ${date ?? context.today}` }
    }

    const row = await createUserSaving({
      userId: context.userId,
      title: title.trim(),
      amount: amount.toString(),
      goalId,
      paymentAccountId,
      note: note?.trim() || null,
      savedAt,
    })

    return buildWriteStepResult({
      action: 'create_saving',
      success: true,
      message: `Saving recorded: "${row.title}" (${row.amount} ${context.currency} on ${formatToolDate(savedAt)})`,
      entityId: row.id,
    })
  }

  if (toolName === 'create_goal') {
    const args = createGoalArgsSchema.safeParse(toolArgs)
    if (!args.success) {
      return { action: 'create_goal', success: false, message: 'Invalid goal arguments.' }
    }

    const { title, targetAmount, targetDate, note } = args.data
    let parsedTargetDate: Date | null = null
    if (targetDate) {
      parsedTargetDate = new Date(targetDate)
      if (Number.isNaN(parsedTargetDate.getTime())) parsedTargetDate = null
    }

    const row = await createUserGoal({
      userId: context.userId,
      title: title.trim(),
      targetAmount: targetAmount.toString(),
      currentAmount: '0',
      savingsAmount: '0',
      status: 'active',
      targetDate: parsedTargetDate,
      note: note?.trim() || null,
    })

    return buildWriteStepResult({
      action: 'create_goal',
      success: true,
      message: `Goal created: "${row.title}" (target ${row.targetAmount} ${context.currency})`,
      entityId: row.id,
    })
  }

  if (toolName === 'create_wishlist_item') {
    const args = createWishlistArgsSchema.safeParse(toolArgs)
    if (!args.success) {
      return { action: 'create_wishlist_item', success: false, message: 'Invalid wishlist arguments.' }
    }

    const { title, targetAmount, priority, note } = args.data
    const row = await createUserWishlistItem({
      userId: context.userId,
      title: title.trim(),
      targetAmount: targetAmount.toString(),
      currentAmount: '0',
      priority,
      status: 'active',
      note: note?.trim() || null,
    })

    return buildWriteStepResult({
      action: 'create_wishlist_item',
      success: true,
      message: `Wishlist item added: "${row.title}" (target ${row.targetAmount} ${context.currency})`,
      entityId: row.id,
    })
  }

  if (toolName === 'update_wishlist_item') {
    const args = updateWishlistArgsSchema.safeParse(toolArgs)
    if (!args.success) {
      return { action: 'update_wishlist_item', success: false, message: 'Invalid wishlist update arguments.' }
    }

    const { itemId, title, targetAmount, priority, status, note } = args.data
    const existing = await getUserWishlistItemById(context.userId, itemId)
    if (!existing) {
      return { action: 'update_wishlist_item', success: false, message: 'Wishlist item not accessible.' }
    }

    const row = await updateUserWishlistItem({
      userId: context.userId,
      itemId,
      title: title?.trim(),
      targetAmount: targetAmount?.toString(),
      priority,
      status,
      note: note?.trim(),
    })

    if (!row) {
      return { action: 'update_wishlist_item', success: false, message: 'Wishlist item could not be updated.' }
    }

    const statusLabel = row.status === 'paused' ? 'marked inactive' : row.status
    return buildWriteStepResult({
      action: 'update_wishlist_item',
      success: true,
      message: `Wishlist item updated: "${row.title}" (${statusLabel})`,
      entityId: row.id,
    })
  }

  if (toolName === 'delete_wishlist_item') {
    const args = deleteWishlistArgsSchema.safeParse(toolArgs)
    if (!args.success) {
      return { action: 'delete_wishlist_item', success: false, message: 'Invalid wishlist delete arguments.' }
    }

    const existing = await getUserWishlistItemById(context.userId, args.data.itemId)
    if (!existing) {
      return { action: 'delete_wishlist_item', success: false, message: 'Wishlist item not accessible.' }
    }

    const deleted = await deleteUserWishlistItem(context.userId, args.data.itemId)
    if (!deleted) {
      return { action: 'delete_wishlist_item', success: false, message: 'Wishlist item could not be removed.' }
    }

    return buildWriteStepResult({
      action: 'delete_wishlist_item',
      success: true,
      message: `Wishlist item removed: "${existing.title}"`,
      entityId: deleted.id,
    })
  }

  if (toolName === 'update_goal') {
    const args = updateGoalArgsSchema.safeParse(toolArgs)
    if (!args.success) {
      return { action: 'update_goal', success: false, message: 'Invalid goal update arguments.' }
    }

    const { goalId, title, targetAmount, status, targetDate, note } = args.data
    const goal = await getUserGoalById(context.userId, goalId)
    if (!goal) {
      return { action: 'update_goal', success: false, message: 'Goal not accessible.' }
    }

    let parsedTargetDate: Date | null | undefined
    if (targetDate !== undefined) {
      parsedTargetDate = new Date(targetDate)
      if (Number.isNaN(parsedTargetDate.getTime())) {
        return { action: 'update_goal', success: false, message: `Invalid target date: ${targetDate}` }
      }
    }

    const row = await updateUserGoal({
      userId: context.userId,
      goalId,
      title: title?.trim(),
      targetAmount: targetAmount?.toString(),
      status,
      targetDate: parsedTargetDate,
      note: note?.trim(),
    })

    if (!row) {
      return { action: 'update_goal', success: false, message: 'Goal could not be updated.' }
    }

    const statusLabel = row.status === 'paused' ? 'marked inactive' : row.status
    return buildWriteStepResult({
      action: 'update_goal',
      success: true,
      message: `Goal updated: "${row.title}" (${statusLabel})`,
      entityId: row.id,
    })
  }

  if (toolName === 'delete_goal') {
    const args = deleteGoalArgsSchema.safeParse(toolArgs)
    if (!args.success) {
      return { action: 'delete_goal', success: false, message: 'Invalid goal delete arguments.' }
    }

    const goal = await getUserGoalById(context.userId, args.data.goalId)
    if (!goal) {
      return { action: 'delete_goal', success: false, message: 'Goal not accessible.' }
    }

    const deleted = await deleteUserGoal(context.userId, args.data.goalId)
    if (!deleted) {
      return { action: 'delete_goal', success: false, message: 'Goal could not be removed.' }
    }

    return buildWriteStepResult({
      action: 'delete_goal',
      success: true,
      message: `Goal removed: "${goal.title}"`,
      entityId: deleted.id,
    })
  }

  if (toolName === 'query_user_data') {
    const args = queryUserDataArgsSchema.safeParse(toolArgs)
    if (!args.success) {
      return { action: 'query_user_data', success: false, message: 'Invalid data query arguments.' }
    }

    const todayDate = parseISO(context.today)
    const from =
      args.data.fromDate ??
      format(startOfMonth(todayDate), 'yyyy-MM-dd')
    const to = args.data.toDate ?? context.today

    const message = await queryUserData({
      userId: context.userId,
      currency: context.currency,
      dataset: args.data.dataset ?? 'transactions',
      fromDate: from,
      toDate: to,
      transactionType: args.data.transactionType ?? 'all',
      groupBy: args.data.groupBy ?? 'none',
      limit: args.data.limit ?? 50,
    })

    return {
      action: 'query_user_data',
      success: true,
      message,
    }
  }

  if (toolName === 'get_exchange_rate') {
    const args = getExchangeRateArgsSchema.safeParse(toolArgs)
    if (!args.success) {
      return { action: 'get_exchange_rate', success: false, message: 'Invalid exchange rate arguments.' }
    }

    const fromCurrency = args.data.fromCurrency.toUpperCase()
    const toCurrency = args.data.toCurrency.toUpperCase()

    try {
      const fx = await fetchExchangeRate(fromCurrency, toCurrency)
      return {
        action: 'get_exchange_rate',
        success: true,
        message: `1 ${fromCurrency} = ${fx.rate} ${toCurrency} (as of ${fx.date})`,
        data: {
          fromCurrency,
          toCurrency,
          rate: fx.rate,
          date: fx.date,
        },
      }
    } catch (error) {
      return {
        action: 'get_exchange_rate',
        success: false,
        message: error instanceof Error ? error.message : 'Exchange rate lookup failed.',
      }
    }
  }

  return {
    action: 'create_transaction',
    success: false,
    message: `Unknown tool: ${toolName}`,
  }
}

/**
 * Loads user-scoped context lists for secure prompt injection.
 */
export async function loadUserAiContext(userId: string) {
  const [userCategories, userAccounts, userGoals, userWishlist] = await Promise.all([
    getVisibleCategoriesForUser(userId),
    getUserPaymentAccounts(userId),
    getUserGoals(userId),
    getUserWishlistItems(userId),
  ])

  return {
    categoryList: userCategories.map((category) => `${category.name} [ref ${category.id}]`).join(', '),
    accountList: userAccounts.map((account) => `${account.name} [ref ${account.id}]`).join(', '),
    goalList: userGoals.map((goal) => `${goal.title} [ref ${goal.id}]`).join(', '),
    wishlistList: userWishlist
      .map((item) => `${item.title} [ref ${item.id}] (${item.status})`)
      .join(', '),
    userGoals,
    userWishlist,
  }
}

/**
 * Builds a tool step result with optional navigation after successful writes.
 */
function buildWriteStepResult({
  action,
  success,
  message,
  entityId,
}: {
  action: AiToolAction
  success: boolean
  message: string
  entityId?: number
}): AiToolStepResult {
  const navigateTo = success ? resolveAiNavigateTo(action) ?? undefined : undefined
  return {
    action,
    success,
    message,
    entityId,
    navigateTo,
  }
}

/**
 * Resolves YYYY-MM-DD tool date, defaulting to calendar today when omitted.
 */
function resolveToolDate(rawDate: string | undefined, today: string): Date | null {
  const value = rawDate?.trim() || today
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

/**
 * Formats a tool date for user-facing messages.
 */
function formatToolDate(date: Date): string {
  return format(date, 'MMM d, yyyy')
}

/**
 * Converts entered amount + currency into stored ledger values for AI tools.
 */
async function resolveAiTransactionAmount({
  amount,
  currency,
  userCurrency,
}: {
  amount: number
  currency?: string
  userCurrency: string
}): Promise<
  | { ok: true; data: { normalizedAmount: string; sourceAmount: string | null; sourceCurrency: string; exchangeRate: string } }
  | { ok: false; error: string }
> {
  const enteredCurrency = (currency ?? userCurrency).toUpperCase()
  let exchangeRate: string | undefined

  if (enteredCurrency !== userCurrency.toUpperCase()) {
    try {
      const fx = await fetchExchangeRate(enteredCurrency, userCurrency)
      exchangeRate = fx.rate.toString()
    } catch {
      return {
        ok: false,
        error: `Could not fetch exchange rate from ${enteredCurrency} to ${userCurrency}.`,
      }
    }
  }

  return normalizeTransactionAmount({
    amount: amount.toString(),
    currency: enteredCurrency,
    userCurrency,
    exchangeRate,
  })
}

/**
 * Builds a plain-language success message for a created transaction.
 */
function buildTransactionSuccessMessage({
  title,
  type,
  happenedAt,
  sourceAmount,
  sourceCurrency,
  normalizedAmount,
  ledgerCurrency,
}: {
  title: string
  type: string
  happenedAt: Date
  sourceAmount: string | null
  sourceCurrency: string
  normalizedAmount: string
  ledgerCurrency: string
}): string {
  const dateLabel = formatToolDate(happenedAt)
  const isForeign = sourceAmount !== null && sourceCurrency.toUpperCase() !== ledgerCurrency.toUpperCase()
  const amountPart = isForeign ? `${sourceAmount} ${sourceCurrency}` : `${normalizedAmount} ${ledgerCurrency}`
  return `Transaction created: "${title}" (${type}, ${amountPart} on ${dateLabel})`
}
