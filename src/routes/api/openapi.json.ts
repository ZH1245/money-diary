import { createFileRoute } from '@tanstack/react-router'
import { requireAdmin } from '#/lib/server/admin-guard'
import { enforceSameOrigin } from '#/lib/server/same-origin'

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Money Diary API',
    version: '0.1.0',
    description: 'OpenAPI specification for Money Diary server routes.',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'auth', description: 'Authentication endpoints' },
    { name: 'categories', description: 'Category endpoints' },
    { name: 'goals', description: 'Goal endpoints' },
    { name: 'payment-accounts', description: 'Payment account endpoints' },
    { name: 'savings', description: 'Savings endpoints' },
    { name: 'transactions', description: 'Transaction endpoints' },
    { name: 'exchange-rates', description: 'Currency exchange rate endpoints' },
    { name: 'wishlist', description: 'Wishlist endpoints' },
  ],
  paths: {
    '/api/auth/{path}': {
      get: {
        tags: ['auth'],
        summary: 'Auth GET endpoint',
        description: 'Delegates to Better Auth handler.',
        parameters: [
          {
            name: 'path',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Better Auth dynamic subpath.',
          },
        ],
        responses: {
          '200': { description: 'Auth response' },
          default: { description: 'Auth error response' },
        },
      },
      post: {
        tags: ['auth'],
        summary: 'Auth POST endpoint',
        description: 'Delegates to Better Auth handler.',
        parameters: [
          {
            name: 'path',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Better Auth dynamic subpath.',
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { type: 'object', additionalProperties: true },
            },
          },
        },
        responses: {
          '200': { description: 'Auth response' },
          default: { description: 'Auth error response' },
        },
      },
    },
    '/api/categories': {
      get: {
        tags: ['categories'],
        summary: 'List categories',
        responses: {
          '200': {
            description: 'Category list',
          },
        },
      },
      post: {
        tags: ['categories'],
        summary: 'Create category',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'slug', 'kind'],
                properties: {
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  kind: { type: 'string', enum: ['need', 'want', 'subscription', 'charity', 'other'] },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Category created' },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/api/categories/{id}': {
      delete: {
        tags: ['categories'],
        summary: 'Delete user-owned category',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Category deleted' },
          '404': { description: 'Category not found' },
          '409': { description: 'Category is used by transactions' },
        },
      },
    },
    '/api/exchange-rate': {
      get: {
        tags: ['exchange-rates'],
        summary: 'Fetch latest exchange rate',
        parameters: [
          {
            name: 'from',
            in: 'query',
            required: true,
            schema: { type: 'string', minLength: 3, maxLength: 3 },
            description: 'Source currency code (e.g. USD)',
          },
          {
            name: 'to',
            in: 'query',
            required: true,
            schema: { type: 'string', minLength: 3, maxLength: 3 },
            description: 'Target currency code (e.g. PKR)',
          },
        ],
        responses: {
          '200': { description: 'Latest exchange rate' },
          '400': { description: 'Invalid currency query' },
          '502': { description: 'Exchange rate provider error' },
        },
      },
    },
    '/api/transactions': {
      get: {
        tags: ['transactions'],
        summary: 'List transactions',
        responses: {
          '200': {
            description: 'Transaction list',
          },
        },
      },
      post: {
        tags: ['transactions'],
        summary: 'Create transaction',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'amount', 'type'],
                properties: {
                  title: { type: 'string' },
                  amount: { type: 'string' },
                  currency: { type: 'string', minLength: 3, maxLength: 3 },
                  exchangeRate: { type: 'string' },
                  type: { type: 'string', enum: ['income', 'expense', 'transfer'] },
                  categoryId: { type: 'integer', nullable: true },
                  paymentAccountId: { type: 'integer', nullable: true },
                  source: { type: 'string' },
                  note: { type: 'string' },
                  happenedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Transaction created' },
          '400': { description: 'Validation error' },
          '404': { description: 'Category not found' },
          '413': { description: 'Payload too large' },
        },
      },
    },
    '/api/transactions/{id}': {
      patch: {
        tags: ['transactions'],
        summary: 'Update transaction',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  amount: { type: 'string' },
                  currency: { type: 'string', minLength: 3, maxLength: 3 },
                  exchangeRate: { type: 'string' },
                  type: { type: 'string', enum: ['income', 'expense', 'transfer'] },
                  categoryId: { type: 'integer', nullable: true },
                  paymentAccountId: { type: 'integer', nullable: true },
                  source: { type: 'string', nullable: true },
                  note: { type: 'string', nullable: true },
                  happenedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Transaction updated' },
          '400': { description: 'Validation error' },
          '404': { description: 'Transaction not found' },
        },
      },
      delete: {
        tags: ['transactions'],
        summary: 'Delete transaction',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          '200': { description: 'Transaction deleted' },
          '404': { description: 'Transaction not found' },
        },
      },
    },
    '/api/savings': {
      get: {
        tags: ['savings'],
        summary: 'List savings',
        responses: {
          '200': {
            description: 'Savings list',
          },
        },
      },
      post: {
        tags: ['savings'],
        summary: 'Create saving',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'amount'],
                properties: {
                  title: { type: 'string' },
                  amount: { type: 'string' },
                  note: { type: 'string' },
                  savedAt: { type: 'string', format: 'date-time' },
                  goalId: { type: 'integer', nullable: true },
                  paymentAccountId: { type: 'integer', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Saving created' },
          '400': { description: 'Validation error' },
          '403': { description: 'Forbidden' },
          '413': { description: 'Payload too large' },
        },
      },
    },
    '/api/savings/{id}': {
      patch: {
        tags: ['savings'],
        summary: 'Update saving',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  amount: { type: 'string' },
                  note: { type: 'string', nullable: true },
                  savedAt: { type: 'string', format: 'date-time' },
                  goalId: { type: 'integer', nullable: true },
                  paymentAccountId: { type: 'integer', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Saving updated' },
          '400': { description: 'Validation error' },
          '404': { description: 'Saving not found' },
        },
      },
      delete: {
        tags: ['savings'],
        summary: 'Delete saving',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Saving deleted' },
          '404': { description: 'Saving not found' },
        },
      },
    },
    '/api/payment-accounts': {
      get: {
        tags: ['payment-accounts'],
        summary: 'List payment accounts',
        responses: {
          '200': { description: 'Payment account list' },
        },
      },
      post: {
        tags: ['payment-accounts'],
        summary: 'Create payment account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'accountType'],
                properties: {
                  name: { type: 'string' },
                  institutionSlug: { type: 'string', nullable: true },
                  accountType: {
                    type: 'string',
                    enum: ['debit', 'credit', 'paypak', 'wallet', 'cash', 'other'],
                  },
                  lastFour: { type: 'string', nullable: true },
                  note: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Payment account created' },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/api/payment-accounts/{id}': {
      patch: {
        tags: ['payment-accounts'],
        summary: 'Update payment account',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  institutionSlug: { type: 'string', nullable: true },
                  accountType: {
                    type: 'string',
                    enum: ['debit', 'credit', 'paypak', 'wallet', 'cash', 'other'],
                  },
                  lastFour: { type: 'string', nullable: true },
                  note: { type: 'string', nullable: true },
                  isActive: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Payment account updated' },
          '404': { description: 'Payment account not found' },
        },
      },
      delete: {
        tags: ['payment-accounts'],
        summary: 'Delete payment account',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Payment account deleted' },
          '404': { description: 'Payment account not found' },
        },
      },
    },
    '/api/wishlist': {
      get: {
        tags: ['wishlist'],
        summary: 'List wishlist items',
        responses: {
          '200': {
            description: 'Wishlist list',
          },
        },
      },
      post: {
        tags: ['wishlist'],
        summary: 'Create wishlist item',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'targetAmount'],
                properties: {
                  title: { type: 'string' },
                  targetAmount: { type: 'string' },
                  currentAmount: { type: 'string' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                  status: { type: 'string', enum: ['active', 'paused', 'completed'] },
                  note: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Wishlist item created' },
          '400': { description: 'Validation error' },
          '403': { description: 'Forbidden' },
          '413': { description: 'Payload too large' },
        },
      },
    },
    '/api/wishlist/{id}': {
      patch: {
        tags: ['wishlist'],
        summary: 'Update wishlist item',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  targetAmount: { type: 'string' },
                  currentAmount: { type: 'string' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                  status: { type: 'string', enum: ['active', 'paused', 'completed'] },
                  note: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Wishlist item updated' },
          '400': { description: 'Validation error' },
          '404': { description: 'Wishlist item not found' },
        },
      },
      delete: {
        tags: ['wishlist'],
        summary: 'Delete wishlist item',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Wishlist item deleted' },
          '404': { description: 'Wishlist item not found' },
        },
      },
    },
    '/api/goals': {
      get: {
        tags: ['goals'],
        summary: 'List goals',
        responses: {
          '200': {
            description: 'Goals list',
          },
        },
      },
      post: {
        tags: ['goals'],
        summary: 'Create goal',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'targetAmount'],
                properties: {
                  title: { type: 'string' },
                  targetAmount: { type: 'string' },
                  currentAmount: { type: 'string' },
                  savingsAmount: { type: 'string' },
                  status: { type: 'string', enum: ['active', 'paused', 'completed'] },
                  targetDate: { type: 'string', format: 'date-time' },
                  note: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Goal created' },
          '400': { description: 'Validation error' },
          '403': { description: 'Forbidden' },
          '413': { description: 'Payload too large' },
        },
      },
    },
    '/api/settings/ai/test': {
      post: {
        tags: ['settings'],
        summary: 'Test Ollama base URL connectivity',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['baseUrl'],
                properties: {
                  baseUrl: { type: 'string', format: 'uri' },
                  apiKey: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Probe result' },
          '400': { description: 'Validation error' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/api/goals/{id}': {
      patch: {
        tags: ['goals'],
        summary: 'Update goal',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  targetAmount: { type: 'string' },
                  currentAmount: { type: 'string' },
                  savingsAmount: { type: 'string' },
                  status: { type: 'string', enum: ['active', 'paused', 'completed'] },
                  targetDate: { type: 'string', format: 'date-time', nullable: true },
                  note: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Goal updated' },
          '400': { description: 'Validation error' },
          '404': { description: 'Goal not found' },
        },
      },
      delete: {
        tags: ['goals'],
        summary: 'Delete goal',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Goal deleted' },
          '404': { description: 'Goal not found' },
        },
      },
    },
  },
} as const

export const Route = createFileRoute('/api/openapi/json')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = enforceSameOrigin(request)
        if (blockedResponse) return blockedResponse
        const authResponse = await requireAdmin(request)
        if (authResponse) return authResponse

        return new Response(JSON.stringify(openApiSpec, null, 2), {
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
          },
        })
      },
      OPTIONS: ({ request }) => {
        const blockedResponse = enforceSameOrigin(request)
        if (blockedResponse) return blockedResponse
        return new Response(null, { status: 204 })
      },
    },
  },
})
