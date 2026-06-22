export const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'query_user_data',
      description:
        'Read the user\'s transactions, savings, goals, or wishlist. Use for any question about their data: totals, lists, date-wise breakdowns, category breakdowns, or to find transaction refs before update_transaction.',
      parameters: {
        type: 'object',
        properties: {
          dataset: {
            type: 'string',
            enum: ['transactions', 'savings', 'goals', 'wishlist'],
            description: 'Which data to read',
          },
          fromDate: { type: 'string', description: 'YYYY-MM-DD start (transactions/savings only)' },
          toDate: { type: 'string', description: 'YYYY-MM-DD end (transactions/savings only)' },
          transactionType: {
            type: 'string',
            enum: ['expense', 'income', 'transfer', 'all'],
            description: 'Filter transactions by type',
          },
          groupBy: {
            type: 'string',
            enum: ['none', 'date', 'category'],
            description: 'Group transactions by date or category; use date for date-wise breakdowns',
          },
          limit: { type: 'integer', description: 'Max rows to return (default 50)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_transaction',
      description:
        'Log a new income, expense, or self-transfer transaction. Do NOT use for bulk fixes — use update_transaction to correct existing rows. For any payment to another person, use type expense (not transfer). Ask the user before logging anything as transfer.',
      parameters: {
        type: 'object',
        required: ['title', 'amount', 'type'],
        properties: {
          title: { type: 'string' },
          amount: { type: 'number', description: 'Positive amount in the stated currency' },
          currency: { type: 'string', description: 'ISO 4217 code (e.g. PKR, USD). Omit to use ledger currency.' },
          type: {
            type: 'string',
            enum: ['expense', 'income', 'transfer'],
            description:
              'expense = money spent or paid to someone else. income = money received. transfer = ONLY self-transfer between the user\'s own accounts (e.g. cash to bank). Never use transfer for payments to other people.',
          },
          date: { type: 'string', description: 'YYYY-MM-DD when the transaction happened. Omit to use today.' },
          categoryId: { type: 'integer', description: 'Internal ref from context. Required for expense/transfer. Use -1 with categoryName if no match. Omit for income.' },
          categoryName: { type: 'string', description: 'Required when categoryId is -1' },
          paymentAccountId: { type: 'integer', description: 'Internal account ref from context, or omit' },
          note: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_transaction',
      description:
        'Update an existing transaction (type, title, amount, date, category, account). Use query_user_data first to get transaction refs. Use this to fix misclassified transfers or edit entries — do not create duplicates.',
      parameters: {
        type: 'object',
        required: ['transactionId'],
        properties: {
          transactionId: { type: 'integer', description: 'Internal transaction ref from query_user_data' },
          title: { type: 'string' },
          amount: { type: 'number', description: 'Positive amount in the stated currency' },
          currency: { type: 'string', description: 'ISO 4217 code (e.g. PKR, USD)' },
          type: {
            type: 'string',
            enum: ['expense', 'income', 'transfer'],
            description: 'Change type when correcting mislogged entries',
          },
          date: { type: 'string', description: 'YYYY-MM-DD' },
          categoryId: { type: 'integer', description: 'Required when changing to expense/transfer if none set' },
          categoryName: { type: 'string', description: 'Required when categoryId is -1' },
          paymentAccountId: { type: 'integer' },
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
        required: ['title', 'amount'],
        properties: {
          title: { type: 'string' },
          amount: { type: 'number' },
          date: { type: 'string', description: 'YYYY-MM-DD when saved. Omit to use today.' },
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
  {
    type: 'function',
    function: {
      name: 'update_wishlist_item',
      description: 'Update an existing wishlist item (pause, complete, rename, change target).',
      parameters: {
        type: 'object',
        required: ['itemId'],
        properties: {
          itemId: { type: 'integer', description: 'Internal wishlist ref from context' },
          title: { type: 'string' },
          targetAmount: { type: 'number' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          status: {
            type: 'string',
            enum: ['active', 'paused', 'completed'],
            description: 'Use paused when user wants inactive/archived',
          },
          note: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_wishlist_item',
      description: 'Permanently remove a wishlist item.',
      parameters: {
        type: 'object',
        required: ['itemId'],
        properties: {
          itemId: { type: 'integer', description: 'Internal wishlist ref from context' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_goal',
      description: 'Update an existing financial goal.',
      parameters: {
        type: 'object',
        required: ['goalId'],
        properties: {
          goalId: { type: 'integer', description: 'Internal goal ref from context' },
          title: { type: 'string' },
          targetAmount: { type: 'number' },
          status: {
            type: 'string',
            enum: ['active', 'paused', 'completed'],
            description: 'Use paused when user wants inactive/archived',
          },
          targetDate: { type: 'string', description: 'YYYY-MM-DD or omit' },
          note: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_goal',
      description: 'Permanently remove a financial goal.',
      parameters: {
        type: 'object',
        required: ['goalId'],
        properties: {
          goalId: { type: 'integer', description: 'Internal goal ref from context' },
        },
      },
    },
  },
] as const

/**
 * Read-only FX lookup for offline/local models (Ollama) that cannot browse the web.
 */
export const GET_EXCHANGE_RATE_TOOL = {
  type: 'function',
  function: {
    name: 'get_exchange_rate',
    description:
      'Fetch the latest exchange rate between two ISO 4217 currencies. Use for conversion questions or explaining foreign amounts.',
    parameters: {
      type: 'object',
      required: ['fromCurrency', 'toCurrency'],
      properties: {
        fromCurrency: { type: 'string', description: 'Source currency code (e.g. PKR)' },
        toCurrency: { type: 'string', description: 'Target currency code (e.g. USD)' },
      },
    },
  },
} as const

export type AiWriteToolAction =
  | 'create_transaction'
  | 'update_transaction'
  | 'create_saving'
  | 'create_goal'
  | 'create_wishlist_item'
  | 'update_wishlist_item'
  | 'delete_wishlist_item'
  | 'update_goal'
  | 'delete_goal'

export type AiToolAction = AiWriteToolAction | 'get_exchange_rate' | 'query_user_data'

/**
 * Returns tool definitions for the active AI provider.
 * Ollama (and unset provider defaulting to Ollama) gets get_exchange_rate because it has no internet.
 */
export function getAiToolsForProvider(provider: string | undefined | null) {
  if (provider == null || provider === 'ollama') {
    return [...AI_TOOLS, GET_EXCHANGE_RATE_TOOL]
  }
  return AI_TOOLS
}
