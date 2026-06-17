import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  createUserTransaction,
  isCategoryAccessibleByUser,
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
import { createUserGoal, getUserGoals } from '#/features/goals/server/goals-repository'
import { createUserWishlistItem } from '#/features/wishlist/server/wishlist-repository'
import {
  buildOptionsResponse,
  guardApiRequest,
  requireUserContext,
} from '#/lib/server/api-guards'
import { parseJsonBody } from '#/lib/server/request-body'
import { slugifyCategoryName } from '#/features/categories/utils/category-slug'
import {
  requiresTransactionCategory,
  resolveTransactionCategoryId,
} from '#/features/transactions/utils/transaction-category'

export const Route = createFileRoute('/api/ai/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        // Only logged-in users — session cookie required
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const body = await parseJsonBody(request)
        if (body instanceof Response) return body

        const parsed = aiChatSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid request', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const { messages } = parsed.data
        const today = new Date().toISOString().split('T')[0]

        // Load user context for LLM — IDs injected into system prompt so model can reference them
        const [userCategories, userAccounts, userGoals] = await Promise.all([
          getVisibleCategoriesForUser(userContext.id),
          getUserPaymentAccounts(userContext.id),
          getUserGoals(userContext.id),
        ])

        const categoryList = userCategories.map((c) => `${c.name} (id:${c.id})`).join(', ')
        const accountList = userAccounts.map((a) => `${a.name} (id:${a.id})`).join(', ')
        const goalList = userGoals.map((g) => `${g.title} (id:${g.id})`).join(', ')

        const systemPrompt = `You are a personal finance assistant for Money Diary app.
Today is ${today}. User currency: ${userContext.currency}.
Available categories: ${categoryList || 'none'}.
Available payment accounts: ${accountList || 'none'}.
Active goals: ${goalList || 'none'}.

Rules:
- Pick the closest matching category/account/goal id from the lists above.
- Income transactions do not need a category.
- For expense/transfer, if no category matches, use categoryId -1 and provide categoryName.
- Use ISO date YYYY-MM-DD for all date fields.
- Relative dates like "yesterday", "last Monday" must be resolved to exact YYYY-MM-DD.
- Always pick exactly ONE tool per message.
- Do not explain — just call the tool.`

        let ollamaResponse: Response
        try {
          ollamaResponse = await fetch('http://127.0.0.1:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'gemma4:latest',
              stream: false,
              messages: [{ role: 'system', content: systemPrompt }, ...messages],
              tools: AI_TOOLS,
            }),
          })
        } catch {
          return Response.json(
            { success: false, error: 'Could not reach Ollama. Make sure it is running on port 11434.' },
            { status: 503 },
          )
        }

        if (!ollamaResponse.ok) {
          return Response.json(
            { success: false, error: `Ollama error: ${ollamaResponse.status}` },
            { status: 502 },
          )
        }

        const ollamaJson = (await ollamaResponse.json()) as OllamaResponse
        const toolCall = ollamaJson.message?.tool_calls?.[0]

        // Model replied in plain text (clarification / question)
        if (!toolCall) {
          return Response.json({
            success: true,
            action: 'clarification',
            message: ollamaJson.message?.content ?? 'I did not understand. Please try again.',
          })
        }

        const toolName = toolCall.function.name
        const toolArgs = toolCall.function.arguments

        // ── create_transaction ────────────────────────────────────────────────
        if (toolName === 'create_transaction') {
          const args = createTransactionArgsSchema.safeParse(toolArgs)
          if (!args.success) {
            return Response.json(
              { success: false, error: 'Invalid transaction args from LLM', details: args.error.flatten() },
              { status: 422 },
            )
          }

          const { title, amount, type, date, categoryId: rawCatId, categoryName, paymentAccountId: rawAccId, note } = args.data

          let categoryId: number | null = null
          if (type === 'income') {
            categoryId = null
          } else if (rawCatId === undefined) {
            return Response.json({ success: false, error: 'Category is required for expense and transfer.' }, { status: 422 })
          } else if (rawCatId === -1) {
            if (!categoryName?.trim()) {
              return Response.json({ success: false, error: 'No category name provided for new category.' }, { status: 422 })
            }
            const newCat = await createUserCategory({
              userId: userContext.id,
              name: categoryName.trim(),
              slug: slugifyCategoryName(categoryName),
              kind: 'other',
            })
            categoryId = newCat.id
          } else {
            const ok = await isCategoryAccessibleByUser({ userId: userContext.id, categoryId: rawCatId })
            if (!ok) return Response.json({ success: false, error: 'Category not accessible.' }, { status: 403 })
            categoryId = rawCatId
          }

          categoryId = resolveTransactionCategoryId(type, categoryId)
          if (requiresTransactionCategory(type) && categoryId === null) {
            return Response.json({ success: false, error: 'Category is required for expense and transfer.' }, { status: 422 })
          }

          // Resolve account
          let paymentAccountId: number | null = null
          if (rawAccId != null) {
            const ok = await isPaymentAccountAccessibleByUser({ userId: userContext.id, paymentAccountId: rawAccId })
            if (!ok) return Response.json({ success: false, error: 'Account not accessible.' }, { status: 403 })
            paymentAccountId = rawAccId
          }

          const happenedAt = new Date(date)
          if (Number.isNaN(happenedAt.getTime())) {
            return Response.json({ success: false, error: `Bad date: "${date}"` }, { status: 422 })
          }

          const row = await createUserTransaction({
            userId: userContext.id,
            title: title.trim(),
            amount: amount.toString(),
            sourceAmount: null,
            sourceCurrency: userContext.currency,
            exchangeRate: '1',
            type,
            categoryId,
            paymentAccountId,
            source: 'ai',
            note: note?.trim() || null,
            happenedAt,
          })

          return Response.json({
            success: true,
            action: 'create_transaction',
            message: `✓ Transaction created: "${row.title}" — ${row.type}, ${row.amount} ${userContext.currency} on ${formatDate(row.happenedAt)}`,
            data: row,
          }, { status: 201 })
        }

        // ── create_saving ─────────────────────────────────────────────────────
        if (toolName === 'create_saving') {
          const args = createSavingArgsSchema.safeParse(toolArgs)
          if (!args.success) {
            return Response.json(
              { success: false, error: 'Invalid saving args from LLM', details: args.error.flatten() },
              { status: 422 },
            )
          }

          const { title, amount, date, goalId: rawGoalId, paymentAccountId: rawAccId, note } = args.data

          // Validate goal ownership
          let goalId: number | null = null
          if (rawGoalId != null) {
            const goal = userGoals.find((g) => g.id === rawGoalId)
            if (!goal) return Response.json({ success: false, error: 'Goal not found.' }, { status: 403 })
            goalId = rawGoalId
          }

          let paymentAccountId: number | null = null
          if (rawAccId != null) {
            const ok = await isPaymentAccountAccessibleByUser({ userId: userContext.id, paymentAccountId: rawAccId })
            if (!ok) return Response.json({ success: false, error: 'Account not accessible.' }, { status: 403 })
            paymentAccountId = rawAccId
          }

          const savedAt = new Date(date)
          if (Number.isNaN(savedAt.getTime())) {
            return Response.json({ success: false, error: `Bad date: "${date}"` }, { status: 422 })
          }

          const row = await createUserSaving({
            userId: userContext.id,
            title: title.trim(),
            amount: amount.toString(),
            goalId,
            paymentAccountId,
            note: note?.trim() || null,
            savedAt,
          })

          return Response.json({
            success: true,
            action: 'create_saving',
            message: `✓ Saving recorded: "${row.title}" — ${row.amount} ${userContext.currency} on ${formatDate(row.savedAt)}`,
            data: row,
          }, { status: 201 })
        }

        // ── create_goal ───────────────────────────────────────────────────────
        if (toolName === 'create_goal') {
          const args = createGoalArgsSchema.safeParse(toolArgs)
          if (!args.success) {
            return Response.json(
              { success: false, error: 'Invalid goal args from LLM', details: args.error.flatten() },
              { status: 422 },
            )
          }

          const { title, targetAmount, targetDate, note } = args.data

          let parsedTargetDate: Date | null = null
          if (targetDate) {
            parsedTargetDate = new Date(targetDate)
            if (Number.isNaN(parsedTargetDate.getTime())) parsedTargetDate = null
          }

          const row = await createUserGoal({
            userId: userContext.id,
            title: title.trim(),
            targetAmount: targetAmount.toString(),
            currentAmount: '0',
            savingsAmount: '0',
            status: 'active',
            targetDate: parsedTargetDate,
            note: note?.trim() || null,
          })

          return Response.json({
            success: true,
            action: 'create_goal',
            message: `✓ Goal created: "${row.title}" with target ${row.targetAmount} ${userContext.currency}`,
            data: row,
          }, { status: 201 })
        }

        // ── create_wishlist_item ──────────────────────────────────────────────
        if (toolName === 'create_wishlist_item') {
          const args = createWishlistArgsSchema.safeParse(toolArgs)
          if (!args.success) {
            return Response.json(
              { success: false, error: 'Invalid wishlist args from LLM', details: args.error.flatten() },
              { status: 422 },
            )
          }

          const { title, targetAmount, priority, note } = args.data

          const row = await createUserWishlistItem({
            userId: userContext.id,
            title: title.trim(),
            targetAmount: targetAmount.toString(),
            currentAmount: '0',
            priority,
            status: 'active',
            note: note?.trim() || null,
          })

          return Response.json({
            success: true,
            action: 'create_wishlist_item',
            message: `✓ Wishlist item added: "${row.title}" — target ${row.targetAmount} ${userContext.currency}`,
            data: row,
          }, { status: 201 })
        }

        return Response.json({ success: false, error: `Unknown tool: ${toolName}` }, { status: 422 })
      },

      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

// ─── Tool definitions sent to Ollama ─────────────────────────────────────────

const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_transaction',
      description: 'Log an income, expense, or transfer transaction.',
      parameters: {
        type: 'object',
        required: ['title', 'amount', 'type', 'date'],
        properties: {
          title: { type: 'string' },
          amount: { type: 'number', description: 'Positive amount' },
          type: { type: 'string', enum: ['expense', 'income', 'transfer'] },
          date: { type: 'string', description: 'YYYY-MM-DD' },
          categoryId: { type: 'integer', description: 'Required for expense/transfer. Use -1 if no match found. Omit for income.' },
          categoryName: { type: 'string', description: 'Required when categoryId is -1' },
          paymentAccountId: { type: 'integer', description: 'Account id or omit' },
          note: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_saving',
      description: 'Record money moved into savings.',
      parameters: {
        type: 'object',
        required: ['title', 'amount', 'date'],
        properties: {
          title: { type: 'string' },
          amount: { type: 'number' },
          date: { type: 'string', description: 'YYYY-MM-DD' },
          goalId: { type: 'integer', description: 'Goal id to link to, or omit' },
          paymentAccountId: { type: 'integer', description: 'Account id or omit' },
          note: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_goal',
      description: 'Create a new financial goal.',
      parameters: {
        type: 'object',
        required: ['title', 'targetAmount'],
        properties: {
          title: { type: 'string' },
          targetAmount: { type: 'number' },
          targetDate: { type: 'string', description: 'YYYY-MM-DD or omit' },
          note: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_wishlist_item',
      description: 'Add an item to the wishlist.',
      parameters: {
        type: 'object',
        required: ['title', 'targetAmount'],
        properties: {
          title: { type: 'string' },
          targetAmount: { type: 'number' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          note: { type: 'string' },
        },
      },
    },
  },
]

// ─── Schemas ──────────────────────────────────────────────────────────────────

const aiChatSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() }))
    .min(1)
    .max(20),
})

const createTransactionArgsSchema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(['expense', 'income', 'transfer']),
  date: z.string().min(6),
  categoryId: z.number().int().optional(),
  categoryName: z.string().optional(),
  paymentAccountId: z.number().int().positive().optional(),
  note: z.string().optional(),
})

const createSavingArgsSchema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().min(6),
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface OllamaResponse {
  message?: {
    role: string
    content: string
    tool_calls?: Array<{
      function: {
        name: string
        arguments: unknown
      }
    }>
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value: Date | string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}
