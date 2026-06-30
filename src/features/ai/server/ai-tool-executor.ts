import { z } from 'zod'
import {
  createScheduledTransaction,
  createTransfer,
  createUserTransaction,
  findUserTransactionDuplicate,
  getUserTransactionById,
  isCategoryAccessibleByUser,
  updateUserTransaction,
} from '#/features/transactions/server/transactions-repository'
import {
  createUserRecurringRule,
  getUserRecurringRuleById,
  getUserRecurringRules,
  updateUserRecurringRule,
} from '#/features/recurring/server/recurring-repository'
import { computeNextRun, type RecurringCadence } from '#/features/recurring/utils/recurring-schedule'
import {
  getVisibleCategoriesForUser,
  createUserCategory,
} from '#/features/categories/server/categories-repository'
import {
  createUserPaymentAccount,
  getUserPaymentAccountById,
  getUserPaymentAccounts,
  isPaymentAccountAccessibleByUser,
  updateUserPaymentAccount,
} from '#/features/payment-accounts/server/payment-accounts-repository'
import { resolvePaymentAccountInstitutionSlug, userHasCashPaymentAccount } from '#/features/payment-accounts/utils/resolve-payment-account-institution'
import { formatPaymentAccountLabel } from '#/features/payment-accounts/utils/account-label'
import { isProtectedPaymentAccount } from '#/features/payment-accounts/utils/protected-account'
import type { PaymentAccountType } from '#/features/payment-accounts/types/payment-account'
import { createUserSaving } from '#/features/savings/server/savings-repository'
import { DEFAULT_SAVING_TITLE, DEFAULT_SAVING_WITHDRAWAL_TITLE } from '#/features/savings/schemas/saving'
import { createUserGoal, deleteUserGoal, getUserGoalById, getUserGoals, updateUserGoal } from '#/features/goals/server/goals-repository'
import { createTicket } from '#/features/feedback/server/tickets-repository'
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
import { queryUserData, DEFAULT_QUERY_USER_DATA_LIMIT } from '#/features/ai/server/ai-user-data-query'
import { formatTransferSource, isTransferDirectionEncoded } from '#/features/transactions/utils/transfer-direction'
import { formatTransactionDuplicateMessage } from '#/features/transactions/utils/transaction-duplicate'

const createTransactionArgsSchema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().trim().length(3).optional(),
  type: z.enum(['expense', 'income', 'transfer']),
  date: z.string().min(6).optional(),
  categoryId: z.number().int().optional(),
  categoryName: z.string().optional(),
  paymentAccountId: z.number().int().positive().optional(),
  transferDirection: z.enum(['in', 'out']).optional(),
  note: z.string().optional(),
  forceCreate: z.boolean().optional(),
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
  transferDirection: z.enum(['in', 'out']).optional(),
  note: z.string().optional(),
})

const createTransferArgsSchema = z.object({
  fromPaymentAccountId: z.number().int().positive(),
  toPaymentAccountId: z.number().int().positive(),
  amount: z.number().positive(),
  title: z.string().min(1).optional(),
  currency: z.string().trim().length(3).optional(),
  date: z.string().min(6).optional(),
  note: z.string().optional(),
})

const createRecurringRuleArgsSchema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().trim().length(3).optional(),
  type: z.enum(['income', 'expense']),
  cadence: z.enum(['weekly', 'monthly', 'yearly']),
  startDate: z.string().min(6).optional(),
  categoryId: z.number().int().optional(),
  categoryName: z.string().optional(),
  paymentAccountId: z.number().int().positive().optional(),
  note: z.string().optional(),
})

const updateRecurringRuleArgsSchema = z.object({
  recurringRuleId: z.number().int().positive(),
  title: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().trim().length(3).optional(),
  type: z.enum(['income', 'expense']).optional(),
  cadence: z.enum(['weekly', 'monthly', 'yearly']).optional(),
  nextRunDate: z.string().min(6).optional(),
  categoryId: z.number().int().optional(),
  categoryName: z.string().optional(),
  paymentAccountId: z.number().int().positive().optional(),
  note: z.string().optional(),
  isActive: z.boolean().optional(),
})

const createSavingArgsSchema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  entryType: z.enum(['deposit', 'withdrawal']).optional(),
  date: z.string().min(6).optional(),
  goalId: z.number().int().positive().optional(),
  paymentAccountId: z.number().int().positive().optional(),
  note: z.string().optional(),
})

const createPaymentAccountArgsSchema = z.object({
  name: z.string().min(1),
  accountType: z.enum(['debit', 'credit', 'paypak', 'wallet', 'cash', 'other']),
  institutionSlug: z.string().min(1).optional(),
  institutionName: z.string().min(1).optional(),
  lastFour: z
    .string()
    .trim()
    .regex(/^\d{4}$/)
    .optional(),
  note: z.string().optional(),
})

const updatePaymentAccountArgsSchema = z.object({
  paymentAccountId: z.number().int().positive(),
  name: z.string().min(1).optional(),
  accountType: z.enum(['debit', 'credit', 'paypak', 'wallet', 'cash', 'other']).optional(),
  institutionSlug: z.string().min(1).optional(),
  institutionName: z.string().min(1).optional(),
  lastFour: z
    .string()
    .trim()
    .regex(/^\d{4}$/)
    .nullable()
    .optional(),
  note: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
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

const createTicketArgsSchema = z.object({
  type: z.enum(['bug', 'feature', 'support']),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(2000),
})

const createScheduledTransactionArgsSchema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().trim().length(3).optional(),
  type: z.enum(['expense', 'income']),
  scheduledAt: z.string().min(6),
  categoryId: z.number().int().optional(),
  categoryName: z.string().optional(),
  paymentAccountId: z.number().int().positive().optional(),
  note: z.string().optional(),
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
  duplicate?: boolean
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

    const { title, amount, type, date, currency: rawCurrency, categoryId: rawCatId, categoryName, paymentAccountId: rawAccId, transferDirection, note, forceCreate } = args.data

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

    if ((type === 'expense' || type === 'transfer') && rawAccId == null) {
      return {
        action: 'create_transaction',
        success: false,
        message: 'Please tell me which account was used for this payment. I did not create the transaction yet.',
      }
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

    if (type === 'transfer' && rawAccId != null && !transferDirection) {
      return {
        action: 'create_transaction',
        success: false,
        message: 'transferDirection is required for transfers linked to an account (in or out).',
      }
    }

    if (!forceCreate) {
      const existingDuplicate = await findUserTransactionDuplicate({
        userId: context.userId,
        title: title.trim(),
        amount: amountResult.data.normalizedAmount,
        type,
        happenedAt,
      })

      if (existingDuplicate) {
        return {
          action: 'create_transaction',
          success: false,
          duplicate: true,
          message: formatTransactionDuplicateMessage(existingDuplicate, context.currency),
          entityId: existingDuplicate.id,
          data: {
            duplicate: true,
            existingTransactionId: existingDuplicate.id,
            existingTitle: existingDuplicate.title,
          },
        }
      }
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
      source: type === 'transfer' && transferDirection ? formatTransferSource(transferDirection) : 'ai',
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

    const nextPaymentAccountId = paymentAccountId ?? existing.paymentAccountId
    if (nextType === 'transfer' && nextPaymentAccountId != null) {
      const hasEncodedDirection =
        args.data.transferDirection !== undefined || isTransferDirectionEncoded(existing.source)
      if (!hasEncodedDirection) {
        return {
          action: 'update_transaction',
          success: false,
          message: 'transferDirection is required for transfers linked to an account (in or out).',
        }
      }
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
    let sourceUpdate: string | null | undefined
    if (args.data.transferDirection !== undefined) {
      sourceUpdate = formatTransferSource(args.data.transferDirection)
    } else if (args.data.type === 'transfer' && existing.type !== 'transfer') {
      sourceUpdate = formatTransferSource('out')
    } else if (args.data.type !== undefined && args.data.type !== 'transfer' && existing.type === 'transfer') {
      sourceUpdate = 'ai'
    }

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
      ...(sourceUpdate !== undefined ? { source: sourceUpdate } : {}),
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

  if (toolName === 'create_transfer') {
    const args = createTransferArgsSchema.safeParse(toolArgs)
    if (!args.success) {
      return { action: 'create_transfer', success: false, message: 'Invalid transfer arguments.' }
    }

    const { fromPaymentAccountId, toPaymentAccountId, amount, title, currency: rawCurrency, date, note } = args.data

    if (fromPaymentAccountId === toPaymentAccountId) {
      return { action: 'create_transfer', success: false, message: 'Source and destination accounts must be different.' }
    }

    const fromAccount = await getUserPaymentAccountById(context.userId, fromPaymentAccountId)
    if (!fromAccount) {
      return { action: 'create_transfer', success: false, message: 'Source account not accessible.' }
    }
    const toAccount = await getUserPaymentAccountById(context.userId, toPaymentAccountId)
    if (!toAccount) {
      return { action: 'create_transfer', success: false, message: 'Destination account not accessible.' }
    }

    const happenedAt = resolveToolDate(date, context.today)
    if (!happenedAt) {
      return { action: 'create_transfer', success: false, message: `Invalid date: ${date ?? context.today}` }
    }

    const amountResult = await resolveAiTransactionAmount({
      amount,
      currency: rawCurrency,
      userCurrency: context.currency,
    })
    if (!amountResult.ok) {
      return { action: 'create_transfer', success: false, message: amountResult.error }
    }

    const transferTitle = title?.trim() || `${fromAccount.name} to ${toAccount.name}`

    const rows = await createTransfer({
      userId: context.userId,
      title: transferTitle,
      amount: amountResult.data.normalizedAmount,
      sourceAmount: amountResult.data.sourceAmount,
      sourceCurrency: amountResult.data.sourceCurrency,
      exchangeRate: amountResult.data.exchangeRate,
      fromPaymentAccountId,
      toPaymentAccountId,
      note: note?.trim() || null,
      happenedAt,
    })

    const isForeign =
      amountResult.data.sourceAmount !== null &&
      amountResult.data.sourceCurrency.toUpperCase() !== context.currency.toUpperCase()
    const amountPart = isForeign
      ? `${amountResult.data.sourceAmount} ${amountResult.data.sourceCurrency}`
      : `${amountResult.data.normalizedAmount} ${context.currency}`

    return buildWriteStepResult({
      action: 'create_transfer',
      success: true,
      message: `Transfer recorded: ${amountPart} from ${fromAccount.name} to ${toAccount.name} on ${formatToolDate(happenedAt)}`,
      entityId: rows[0]?.id,
    })
  }

  if (toolName === 'create_recurring_rule') {
    const args = createRecurringRuleArgsSchema.safeParse(toolArgs)
    if (!args.success) {
      return { action: 'create_recurring_rule', success: false, message: 'Invalid recurring rule arguments.' }
    }

    const { title, amount, type, cadence, startDate, currency: rawCurrency, categoryId: rawCatId, categoryName, paymentAccountId: rawAccId, note } = args.data

    const categoryResult = await resolveAiCategoryId({
      userId: context.userId,
      type,
      rawCategoryId: rawCatId,
      categoryName,
    })
    if (!categoryResult.ok) {
      return { action: 'create_recurring_rule', success: false, message: categoryResult.error }
    }

    let paymentAccountId: number | null = null
    if (rawAccId != null) {
      const ok = await isPaymentAccountAccessibleByUser({ userId: context.userId, paymentAccountId: rawAccId })
      if (!ok) return { action: 'create_recurring_rule', success: false, message: 'Account not accessible.' }
      paymentAccountId = rawAccId
    }

    const startAt = resolveToolDate(startDate, context.today)
    if (!startAt) {
      return { action: 'create_recurring_rule', success: false, message: `Invalid date: ${startDate ?? context.today}` }
    }

    const amountResult = await resolveAiTransactionAmount({
      amount,
      currency: rawCurrency,
      userCurrency: context.currency,
    })
    if (!amountResult.ok) {
      return { action: 'create_recurring_rule', success: false, message: amountResult.error }
    }

    const nextRunAt = computeNextRun(startAt, cadence, new Date())

    const row = await createUserRecurringRule({
      userId: context.userId,
      title: title.trim(),
      amount: amountResult.data.normalizedAmount,
      currency: context.currency,
      type,
      categoryId: categoryResult.categoryId,
      paymentAccountId,
      source: 'recurring',
      note: note?.trim() || null,
      cadence,
      nextRunAt,
    })

    return buildWriteStepResult({
      action: 'create_recurring_rule',
      success: true,
      message: `Recurring ${type} set up: "${row.title}" (${row.amount} ${context.currency}, ${cadence}, next on ${formatToolDate(nextRunAt)})`,
      entityId: row.id,
    })
  }

  if (toolName === 'update_recurring_rule') {
    const args = updateRecurringRuleArgsSchema.safeParse(toolArgs)
    if (!args.success) {
      return { action: 'update_recurring_rule', success: false, message: 'Invalid recurring rule update arguments.' }
    }

    const existing = await getUserRecurringRuleById(context.userId, args.data.recurringRuleId)
    if (!existing) {
      return { action: 'update_recurring_rule', success: false, message: 'Recurring rule not accessible.' }
    }

    const nextType = (args.data.type ?? existing.type) as 'income' | 'expense'

    let categoryId: number | null | undefined
    if (args.data.type !== undefined || args.data.categoryId !== undefined) {
      const categoryResult = await resolveAiCategoryId({
        userId: context.userId,
        type: nextType,
        rawCategoryId: args.data.categoryId,
        categoryName: args.data.categoryName,
      })
      if (!categoryResult.ok) {
        return { action: 'update_recurring_rule', success: false, message: categoryResult.error }
      }
      categoryId = categoryResult.categoryId
    }

    let paymentAccountId: number | undefined
    if (args.data.paymentAccountId !== undefined) {
      const ok = await isPaymentAccountAccessibleByUser({
        userId: context.userId,
        paymentAccountId: args.data.paymentAccountId,
      })
      if (!ok) return { action: 'update_recurring_rule', success: false, message: 'Account not accessible.' }
      paymentAccountId = args.data.paymentAccountId
    }

    let amount: string | undefined
    if (args.data.amount !== undefined || args.data.currency !== undefined) {
      const amountResult = await resolveAiTransactionAmount({
        amount: args.data.amount ?? Number(existing.amount),
        currency: args.data.currency ?? existing.currency,
        userCurrency: context.currency,
      })
      if (!amountResult.ok) {
        return { action: 'update_recurring_rule', success: false, message: amountResult.error }
      }
      amount = amountResult.data.normalizedAmount
    }

    const cadence = (args.data.cadence ?? existing.cadence) as RecurringCadence
    let nextRunAt: Date | undefined
    if (args.data.nextRunDate !== undefined) {
      const parsed = resolveToolDate(args.data.nextRunDate, context.today)
      if (!parsed) {
        return { action: 'update_recurring_rule', success: false, message: `Invalid date: ${args.data.nextRunDate}` }
      }
      nextRunAt = parsed
    } else if (args.data.cadence !== undefined) {
      nextRunAt = computeNextRun(existing.nextRunAt, cadence, new Date())
    }

    const row = await updateUserRecurringRule({
      userId: context.userId,
      ruleId: args.data.recurringRuleId,
      ...(args.data.title !== undefined ? { title: args.data.title.trim() } : {}),
      ...(amount !== undefined ? { amount } : {}),
      ...(args.data.type !== undefined ? { type: args.data.type } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(paymentAccountId !== undefined ? { paymentAccountId } : {}),
      ...(args.data.cadence !== undefined ? { cadence } : {}),
      ...(nextRunAt !== undefined ? { nextRunAt } : {}),
      ...(args.data.note !== undefined ? { note: args.data.note.trim() || null } : {}),
      ...(args.data.isActive !== undefined ? { isActive: args.data.isActive } : {}),
    })

    if (!row) {
      return { action: 'update_recurring_rule', success: false, message: 'Recurring rule could not be updated.' }
    }

    const statusLabel = row.isActive ? 'active' : 'paused'
    return buildWriteStepResult({
      action: 'update_recurring_rule',
      success: true,
      message: `Recurring rule updated: "${row.title}" (${statusLabel}, next on ${formatToolDate(row.nextRunAt)})`,
      entityId: row.id,
    })
  }

  if (toolName === 'create_saving') {
    const args = createSavingArgsSchema.safeParse(toolArgs)
    if (!args.success) {
      return { action: 'create_saving', success: false, message: 'Invalid saving arguments.' }
    }

    const { title, amount, entryType: rawEntryType, date, goalId: rawGoalId, paymentAccountId: rawAccId, note } = args.data
    const entryType = rawEntryType ?? 'deposit'

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
      title: title.trim() || (entryType === 'withdrawal' ? DEFAULT_SAVING_WITHDRAWAL_TITLE : DEFAULT_SAVING_TITLE),
      amount: amount.toString(),
      entryType,
      goalId,
      paymentAccountId,
      note: note?.trim() || null,
      savedAt,
    })

    const entryLabel = entryType === 'withdrawal' ? 'Withdrawal from savings' : 'Deposit to savings'
    return buildWriteStepResult({
      action: 'create_saving',
      success: true,
      message: `${entryLabel}: "${row.title}" (${row.amount} ${context.currency} on ${formatToolDate(savedAt)})`,
      entityId: row.id,
    })
  }

  if (toolName === 'create_payment_account') {
    const args = createPaymentAccountArgsSchema.safeParse(toolArgs)
    if (!args.success) {
      return { action: 'create_payment_account', success: false, message: 'Invalid payment account arguments.' }
    }

    const { name, accountType, institutionSlug, institutionName, lastFour, note } = args.data
    const institution = resolvePaymentAccountInstitutionSlug({ institutionSlug, institutionName })
    if (institution.error) {
      return { action: 'create_payment_account', success: false, message: institution.error }
    }

    if (institution.slug === 'cash' || accountType === 'cash') {
      const existingAccounts = await getUserPaymentAccounts(context.userId)
      if (userHasCashPaymentAccount(existingAccounts)) {
        return {
          action: 'create_payment_account',
          success: false,
          message: 'Cash on hand already exists. Use update_payment_account to rename it if needed.',
        }
      }
    }

    const row = await createUserPaymentAccount({
      userId: context.userId,
      name: name.trim(),
      institutionSlug: institution.slug,
      accountType,
      lastFour: lastFour ?? null,
      note: note?.trim() || null,
    })

    return buildWriteStepResult({
      action: 'create_payment_account',
      success: true,
      message: `Account added: ${formatPaymentAccountLabel({
        ...row,
        accountType: row.accountType as PaymentAccountType,
      })}${row.lastFour ? ` ending ${row.lastFour}` : ''}`,
      entityId: row.id,
    })
  }

  if (toolName === 'update_payment_account') {
    const args = updatePaymentAccountArgsSchema.safeParse(toolArgs)
    if (!args.success) {
      return { action: 'update_payment_account', success: false, message: 'Invalid payment account update arguments.' }
    }

    const existing = await getUserPaymentAccountById(context.userId, args.data.paymentAccountId)
    if (!existing) {
      return { action: 'update_payment_account', success: false, message: 'Account not accessible.' }
    }

    let nextInstitutionSlug: string | null | undefined
    if (args.data.institutionSlug !== undefined || args.data.institutionName !== undefined) {
      const institution = resolvePaymentAccountInstitutionSlug({
        institutionSlug: args.data.institutionSlug,
        institutionName: args.data.institutionName,
      })
      if (institution.error) {
        return { action: 'update_payment_account', success: false, message: institution.error }
      }
      nextInstitutionSlug = institution.slug
    }

    if (isProtectedPaymentAccount(existing) && args.data.isActive === false) {
      return {
        action: 'update_payment_account',
        success: false,
        message: 'Cash on hand cannot be marked inactive.',
      }
    }

    const row = await updateUserPaymentAccount({
      userId: context.userId,
      paymentAccountId: args.data.paymentAccountId,
      name: args.data.name?.trim(),
      accountType: args.data.accountType as PaymentAccountType | undefined,
      institutionSlug: nextInstitutionSlug,
      lastFour: args.data.lastFour,
      note: args.data.note,
      isActive: args.data.isActive,
    })

    if (!row) {
      return { action: 'update_payment_account', success: false, message: 'Account could not be updated.' }
    }

    const statusLabel = row.isActive ? 'active' : 'inactive'
    return buildWriteStepResult({
      action: 'update_payment_account',
      success: true,
      message: `Account updated: ${formatPaymentAccountLabel({
        ...row,
        accountType: row.accountType as PaymentAccountType,
      })} (${statusLabel})${row.lastFour ? ` ending ${row.lastFour}` : ''}`,
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

  if (toolName === 'create_ticket') {
    const args = createTicketArgsSchema.safeParse(toolArgs)
    if (!args.success) {
      return { action: 'create_ticket', success: false, message: 'Invalid ticket arguments.' }
    }

    const row = await createTicket({
      userId: context.userId,
      type: args.data.type,
      subject: args.data.subject,
      body: args.data.body,
    })

    return buildWriteStepResult({
      action: 'create_ticket',
      success: true,
      message: `Ticket filed: "${row.subject}" (${row.type})`,
      entityId: row.id,
    })
  }

  if (toolName === 'create_scheduled_transaction') {
    const args = createScheduledTransactionArgsSchema.safeParse(toolArgs)
    if (!args.success) {
      return { action: 'create_scheduled_transaction', success: false, message: 'Invalid scheduled transaction arguments.' }
    }

    const { title, amount, type, scheduledAt, currency: rawCurrency, categoryId: rawCatId, categoryName, paymentAccountId: rawAccId, note } = args.data

    const categoryResult = await resolveAiCategoryId({
      userId: context.userId,
      type,
      rawCategoryId: rawCatId,
      categoryName,
    })
    if (!categoryResult.ok) {
      return { action: 'create_scheduled_transaction', success: false, message: categoryResult.error }
    }

    let paymentAccountId: number | null = null
    if (rawAccId != null) {
      const ok = await isPaymentAccountAccessibleByUser({ userId: context.userId, paymentAccountId: rawAccId })
      if (!ok) return { action: 'create_scheduled_transaction', success: false, message: 'Account not accessible.' }
      paymentAccountId = rawAccId
    }

    const happenedAt = resolveScheduledDate(scheduledAt)
    if (!happenedAt) {
      return { action: 'create_scheduled_transaction', success: false, message: `Invalid scheduled date: ${scheduledAt}` }
    }

    const amountResult = await resolveAiTransactionAmount({
      amount,
      currency: rawCurrency,
      userCurrency: context.currency,
    })
    if (!amountResult.ok) {
      return { action: 'create_scheduled_transaction', success: false, message: amountResult.error }
    }

    const row = await createScheduledTransaction({
      userId: context.userId,
      title: title.trim(),
      amount: amountResult.data.normalizedAmount,
      sourceAmount: amountResult.data.sourceAmount,
      sourceCurrency: amountResult.data.sourceCurrency,
      exchangeRate: amountResult.data.exchangeRate,
      type,
      categoryId: categoryResult.categoryId,
      paymentAccountId,
      note: note?.trim() || null,
      happenedAt,
    })

    const isForeign =
      amountResult.data.sourceAmount !== null &&
      amountResult.data.sourceCurrency.toUpperCase() !== context.currency.toUpperCase()
    const amountPart = isForeign
      ? `${amountResult.data.sourceAmount} ${amountResult.data.sourceCurrency}`
      : `${amountResult.data.normalizedAmount} ${context.currency}`

    return buildWriteStepResult({
      action: 'create_scheduled_transaction',
      success: true,
      message: `Scheduled ${type} "${row.title}" (${amountPart}) on ${formatToolDate(happenedAt)} — saved as pending. It won't affect your balance until you confirm it.`,
      entityId: row.id,
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
      limit: args.data.limit ?? DEFAULT_QUERY_USER_DATA_LIMIT,
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
  const [userCategories, userAccounts, userGoals, userWishlist, userRecurring] = await Promise.all([
    getVisibleCategoriesForUser(userId),
    getUserPaymentAccounts(userId),
    getUserGoals(userId),
    getUserWishlistItems(userId),
    getUserRecurringRules(userId),
  ])

  const sanitizeName = (s: string) => s.replace(/[\r\n]+/g, ' ').trim()

  return {
    categoryList: userCategories.map((category) => `${sanitizeName(category.name)} [ref ${category.id}]`).join(', '),
    accountList: userAccounts
      .map((account) => {
        const suffix = account.lastFour ? ` ••${account.lastFour}` : ''
        const status = account.isActive ? '' : ' inactive'
        return `${sanitizeName(account.name)} (${account.accountType}${suffix})${status} [ref ${account.id}]`
      })
      .join(', '),
    goalList: userGoals.map((goal) => `${sanitizeName(goal.title)} [ref ${goal.id}]`).join(', '),
    wishlistList: userWishlist
      .map((item) => `${sanitizeName(item.title)} [ref ${item.id}] (${item.status})`)
      .join(', '),
    recurringList: userRecurring
      .map((rule) => `${sanitizeName(rule.title)} (${rule.cadence}, ${rule.isActive ? 'active' : 'canceled'}) [ref ${rule.id}]`)
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
 * Resolves a category id for income/expense tools: null for income, a new
 * category for -1 + name, or a validated existing ref. Omitted ref keeps it null.
 */
async function resolveAiCategoryId({
  userId,
  type,
  rawCategoryId,
  categoryName,
}: {
  userId: string
  type: 'income' | 'expense'
  rawCategoryId: number | undefined
  categoryName: string | undefined
}): Promise<{ ok: true; categoryId: number | null } | { ok: false; error: string }> {
  if (type === 'income' || rawCategoryId === undefined) {
    return { ok: true, categoryId: null }
  }
  if (rawCategoryId === -1) {
    if (!categoryName?.trim()) {
      return { ok: false, error: 'Category name is required for new category.' }
    }
    const newCat = await createUserCategory({
      userId,
      name: categoryName.trim(),
      slug: slugifyCategoryName(categoryName),
      kind: 'other',
    })
    return { ok: true, categoryId: newCat.id }
  }
  const ok = await isCategoryAccessibleByUser({ userId, categoryId: rawCategoryId })
  if (!ok) return { ok: false, error: 'Category not accessible.' }
  return { ok: true, categoryId: rawCategoryId }
}

/**
 * Resolves YYYY-MM-DD tool date, defaulting to calendar today when omitted.
 * Uses noon local time to match form-created transactions so same-day entries
 * sort correctly when ordered by happenedAt DESC.
 */
function resolveToolDate(rawDate: string | undefined, today: string): Date | null {
  const value = rawDate?.trim() || today
  const parsed = new Date(`${value}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

/**
 * Resolves a scheduled datetime string. Accepts full ISO datetimes (with time)
 * or YYYY-MM-DD dates (defaulting to noon). Used by create_scheduled_transaction
 * so the AI can pass an exact time (e.g. "today 10PM" → "2026-06-30T22:00:00").
 */
function resolveScheduledDate(rawDate: string): Date | null {
  const value = rawDate.trim()
  // If it already contains a time component (T or space-delimited), parse as-is.
  const hasTime = value.includes('T') || /\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value)
  const parsed = hasTime ? new Date(value) : new Date(`${value}T12:00:00`)
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
