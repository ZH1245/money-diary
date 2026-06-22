import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  createUserTransaction,
  isCategoryAccessibleByUser,
} from '#/features/transactions/server/transactions-repository'
import { getVisibleCategoriesForUser } from '#/features/categories/server/categories-repository'
import { createUserCategory } from '#/features/categories/server/categories-repository'
import {
  getUserPaymentAccounts,
  isPaymentAccountAccessibleByUser,
} from '#/features/payment-accounts/server/payment-accounts-repository'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'
import { parseJsonBody } from '#/lib/server/request-body'
import { slugifyCategoryName } from '#/features/categories/utils/category-slug'
import {
  requiresTransactionCategory,
  resolveTransactionCategoryId,
} from '#/features/transactions/utils/transaction-category'

export const Route = createFileRoute('/api/ai/transaction')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Standard auth + same-origin protection
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        // Session-based auth: only the logged-in user can trigger this
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const body = await parseJsonBody(request)
        if (body instanceof Response) return body

        const bodyUserIdRejected = rejectClientSuppliedUserId(request, body as Record<string, unknown>)
        if (bodyUserIdRejected) return bodyUserIdRejected

        const parsed = aiTransactionSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid request', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const { prompt } = parsed.data

        // Load user's categories and accounts to inject into LLM context
        const [userCategories, userAccounts] = await Promise.all([
          getVisibleCategoriesForUser(userContext.id),
          getUserPaymentAccounts(userContext.id),
        ])

        const categoryList = userCategories.map((c) => `${c.name} (id:${c.id})`).join(', ')
        const accountList = userAccounts.map((a) => `${a.name} (id:${a.id})`).join(', ')
        const today = new Date().toISOString().split('T')[0]

        // Call Ollama with create_transaction tool definition
        let ollamaResponse: Response
        try {
          ollamaResponse = await fetch('http://127.0.0.1:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'qwen3.5:4b',
              stream: false,
              think: false,
              messages: [
                {
                  role: 'system',
                  content: `You are a personal finance assistant. Today is ${today}. 
The user's currency is ${userContext.currency}.
Available categories: ${categoryList}.
Available payment accounts: ${accountList}.
When the user describes a transaction, call the create_transaction tool with exact IDs from the lists above.
Income transactions do not need a category — omit categoryId for income.
For expense and transfer, if a category name roughly matches (e.g. "food" → "Groceries"), pick the closest match.
If there is no matching category for expense/transfer, set categoryId to -1 and categoryName to a short descriptive name.
Use ISO date format (YYYY-MM-DD) for the date field.`,
                },
                {
                  role: 'user',
                  content: prompt,
                },
              ],
              tools: [
                {
                  type: 'function',
                  function: {
                    name: 'create_transaction',
                    description: 'Create a financial transaction entry in the database.',
                    parameters: {
                      type: 'object',
                      required: ['title', 'amount', 'type', 'date'],
                      properties: {
                        title: { type: 'string', description: 'Short title for the transaction' },
                        amount: { type: 'number', description: 'Positive amount in user currency' },
                        type: { type: 'string', enum: ['expense', 'income', 'transfer'] },
                        date: { type: 'string', description: 'ISO date YYYY-MM-DD' },
                        categoryId: {
                          type: 'integer',
                          description: 'Required for expense/transfer. Category id from the list, or -1 if new category needed. Omit for income.',
                        },
                        categoryName: {
                          type: 'string',
                          description: 'Required when categoryId is -1: name for new category',
                        },
                        paymentAccountId: {
                          type: 'integer',
                          description: 'Payment account id from the list, or omit if unknown',
                        },
                        note: { type: 'string', description: 'Optional note' },
                      },
                    },
                  },
                },
              ],
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
            { success: false, error: `Ollama returned ${ollamaResponse.status}` },
            { status: 502 },
          )
        }

        const ollamaJson = (await ollamaResponse.json()) as OllamaResponse

        const toolCall = ollamaJson.message?.tool_calls?.[0]
        if (!toolCall || toolCall.function.name !== 'create_transaction') {
          // Model replied in text — return it as a clarification message
          return Response.json({
            success: false,
            clarification: ollamaJson.message?.content ?? 'No tool call returned.',
          })
        }

        const args = toolCallArgsSchema.safeParse(toolCall.function.arguments)
        if (!args.success) {
          return Response.json(
            { success: false, error: 'LLM returned invalid tool arguments', details: args.error.flatten() },
            { status: 422 },
          )
        }

        const {
          title,
          amount,
          type,
          date,
          categoryId: rawCategoryId,
          categoryName,
          paymentAccountId: rawPaymentAccountId,
          note,
        } = args.data

        // Resolve category — income has none; expense/transfer may create new category when model said -1
        let resolvedCategoryId: number | null = null
        if (type === 'income') {
          resolvedCategoryId = null
        } else if (rawCategoryId === undefined || rawCategoryId === null) {
          return Response.json(
            { success: false, error: 'Category is required for expense and transfer.' },
            { status: 422 },
          )
        } else if (rawCategoryId === -1) {
          if (!categoryName?.trim()) {
            return Response.json(
              { success: false, error: 'Model requested new category but gave no name.' },
              { status: 422 },
            )
          }
          const slug = slugifyCategoryName(categoryName)
          const newCat = await createUserCategory({
            userId: userContext.id,
            name: categoryName.trim(),
            slug,
            kind: 'other',
          })
          resolvedCategoryId = newCat.id
        } else {
          const canUse = await isCategoryAccessibleByUser({
            userId: userContext.id,
            categoryId: rawCategoryId,
          })
          if (!canUse) {
            return Response.json(
              { success: false, error: 'Category not accessible by this user.' },
              { status: 403 },
            )
          }
          resolvedCategoryId = rawCategoryId
        }

        resolvedCategoryId = resolveTransactionCategoryId(type, resolvedCategoryId)
        if (requiresTransactionCategory(type) && resolvedCategoryId === null) {
          return Response.json(
            { success: false, error: 'Category is required for expense and transfer.' },
            { status: 422 },
          )
        }

        // Resolve payment account — ownership check
        let resolvedPaymentAccountId: number | null = null
        if (rawPaymentAccountId != null) {
          const canUseAccount = await isPaymentAccountAccessibleByUser({
            userId: userContext.id,
            paymentAccountId: rawPaymentAccountId,
          })
          if (!canUseAccount) {
            return Response.json(
              { success: false, error: 'Payment account not accessible by this user.' },
              { status: 403 },
            )
          }
          resolvedPaymentAccountId = rawPaymentAccountId
        }

        // Parse date from LLM (YYYY-MM-DD or ISO)
        const happenedAt = new Date(date)
        if (Number.isNaN(happenedAt.getTime())) {
          return Response.json(
            { success: false, error: `Could not parse date: "${date}"` },
            { status: 422 },
          )
        }

        // Write to DB — userId is always from the session, never from LLM output
        const transaction = await createUserTransaction({
          userId: userContext.id,
          title: title.trim(),
          amount: amount.toString(),
          sourceAmount: null,
          sourceCurrency: userContext.currency,
          exchangeRate: '1',
          type,
          categoryId: resolvedCategoryId,
          paymentAccountId: resolvedPaymentAccountId,
          source: 'ai',
          note: note?.trim() || null,
          happenedAt,
        })

        return Response.json({ success: true, data: transaction }, { status: 201 })
      },

      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

// ─── Schemas ─────────────────────────────────────────────────────────────────

const aiTransactionSchema = z.object({
  prompt: z.string().min(1).max(1000),
})

const toolCallArgsSchema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(['expense', 'income', 'transfer']),
  date: z.string().min(6),
  categoryId: z.number().int().optional(),
  categoryName: z.string().optional(),
  paymentAccountId: z.number().int().positive().optional(),
  note: z.string().optional(),
})

// ─── Ollama response type ─────────────────────────────────────────────────────

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
