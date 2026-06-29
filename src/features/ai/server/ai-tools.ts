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
          limit: { type: 'integer', description: 'Max detail rows returned (default 20); totals use the full filtered set' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_transaction',
      description:
        'Log a new income or expense transaction. Default to expense when the user describes spending without specifying income or a savings deposit. To move money between the user\'s own accounts, use create_transfer instead — do NOT log transfers here. Skips duplicates automatically (same title, amount, type, date) unless forceCreate is true. For bulk pastes, call query_user_data for the date range first. Do NOT use for bulk fixes — use update_transaction to correct existing rows.',
      parameters: {
        type: 'object',
        required: ['title', 'amount', 'type'],
        properties: {
          title: { type: 'string' },
          amount: { type: 'number', description: 'Positive amount in the stated currency' },
          currency: { type: 'string', description: 'ISO 4217 code (e.g. PKR, USD). Omit to use ledger currency.' },
          type: {
            type: 'string',
            enum: ['expense', 'income'],
            description:
              'expense = money spent or paid to someone else. income = money received. For moving money between the user\'s own accounts, use create_transfer instead.',
          },
          date: { type: 'string', description: 'YYYY-MM-DD when the transaction happened. Omit to use today.' },
          categoryId: { type: 'integer', description: 'Internal ref from context. Required for expense. Use -1 with categoryName if no match. Omit for income.' },
          categoryName: { type: 'string', description: 'Required when categoryId is -1' },
          paymentAccountId: { type: 'integer', description: 'Internal account ref from context, or omit' },
          note: { type: 'string' },
          forceCreate: {
            type: 'boolean',
            description:
              'Set true only when the user explicitly wants a second identical entry. Otherwise duplicates are skipped server-side.',
          },
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
          transferDirection: {
            type: 'string',
            enum: ['in', 'out'],
            description: 'For transfer rows: in = money into paymentAccountId, out = money out of paymentAccountId',
          },
          note: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_transfer',
      description:
        'Move money between the user\'s OWN accounts (e.g. Meezan to NayaPay, cash to bank). Creates a balanced two-leg transfer. Resolve both account refs from the payment accounts in WORKSPACE CONTEXT. Use this instead of create_transaction for self-transfers; never use it for payments to other people.',
      parameters: {
        type: 'object',
        required: ['fromPaymentAccountId', 'toPaymentAccountId', 'amount'],
        properties: {
          fromPaymentAccountId: { type: 'integer', description: 'Internal ref of the account money leaves (source)' },
          toPaymentAccountId: { type: 'integer', description: 'Internal ref of the account money arrives in (destination). Must differ from the source.' },
          amount: { type: 'number', description: 'Positive amount moved, in the stated currency' },
          title: { type: 'string', description: 'Optional label, e.g. "Meezan to NayaPay". Defaults to a transfer label.' },
          currency: { type: 'string', description: 'ISO 4217 code (e.g. PKR, USD). Omit to use ledger currency.' },
          date: { type: 'string', description: 'YYYY-MM-DD when the transfer happened. Omit to use today.' },
          note: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_recurring_rule',
      description:
        'Set up a recurring income or expense (subscriptions, bills, salary), e.g. "Netflix every month". The server auto-creates the transaction on each due date. Resolve account/category refs from WORKSPACE CONTEXT.',
      parameters: {
        type: 'object',
        required: ['title', 'amount', 'type', 'cadence'],
        properties: {
          title: { type: 'string', description: 'Name of the bill or subscription, e.g. "Netflix"' },
          amount: { type: 'number', description: 'Positive amount per occurrence, in the stated currency' },
          currency: { type: 'string', description: 'ISO 4217 code (e.g. PKR, USD). Omit to use ledger currency.' },
          type: {
            type: 'string',
            enum: ['income', 'expense'],
            description: 'expense for bills/subscriptions, income for recurring money received (e.g. salary)',
          },
          cadence: {
            type: 'string',
            enum: ['weekly', 'monthly', 'yearly'],
            description: 'How often it repeats',
          },
          startDate: { type: 'string', description: 'YYYY-MM-DD of the first occurrence. Omit to use today.' },
          categoryId: { type: 'integer', description: 'Internal ref from context. Recommended for expense; use -1 with categoryName for a new category. Omit for income.' },
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
      name: 'update_recurring_rule',
      description:
        'Update an existing recurring rule (change amount, cadence, account, pause/resume). Match the rule by its ref from WORKSPACE CONTEXT.',
      parameters: {
        type: 'object',
        required: ['recurringRuleId'],
        properties: {
          recurringRuleId: { type: 'integer', description: 'Internal recurring rule ref from context' },
          title: { type: 'string' },
          amount: { type: 'number', description: 'Positive amount per occurrence, in the stated currency' },
          currency: { type: 'string', description: 'ISO 4217 code (e.g. PKR, USD)' },
          type: { type: 'string', enum: ['income', 'expense'] },
          cadence: { type: 'string', enum: ['weekly', 'monthly', 'yearly'] },
          nextRunDate: { type: 'string', description: 'YYYY-MM-DD of the next occurrence' },
          categoryId: { type: 'integer', description: 'Internal ref from context, or -1 with categoryName for a new category' },
          categoryName: { type: 'string', description: 'Required when categoryId is -1' },
          paymentAccountId: { type: 'integer' },
          note: { type: 'string' },
          isActive: { type: 'boolean', description: 'false to pause the rule; true to resume' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_saving',
      description:
        'Record money moved into savings (deposit) or spent/withdrawn from savings (withdrawal). Use withdrawal only when the user explicitly says the money came from savings.',
      parameters: {
        type: 'object',
        required: ['title', 'amount'],
        properties: {
          title: { type: 'string' },
          amount: { type: 'number' },
          entryType: {
            type: 'string',
            enum: ['deposit', 'withdrawal'],
            description: 'deposit = money into savings (default). withdrawal = money spent or taken from savings.',
          },
          date: { type: 'string', description: 'YYYY-MM-DD when saved. Omit to use today.' },
          goalId: { type: 'integer', description: 'Goal id to link to, or omit' },
          paymentAccountId: { type: 'integer', description: 'Source account for deposits or destination for withdrawals, or omit' },
          note: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_payment_account',
      description:
        'Add a new card, bank account, or wallet. Name and account type are enough — do not ask for card numbers or last four digits.',
      parameters: {
        type: 'object',
        required: ['name', 'accountType'],
        properties: {
          name: { type: 'string', description: 'Display name, e.g. "HBL Salary" or "JazzCash"' },
          accountType: {
            type: 'string',
            enum: ['debit', 'credit', 'paypak', 'wallet', 'cash', 'other'],
            description:
              'debit/credit/paypak for bank cards, wallet for JazzCash/Easypaisa/SadaPay/NayaPay, cash for physical cash, other when unclear',
          },
          institutionSlug: {
            type: 'string',
            description:
              'Preset slug when known: hbl, ubl, mcb, meezan, jazzcash, easypaisa, sadapay, nayapay, cash, etc. Omit for custom names.',
          },
          institutionName: {
            type: 'string',
            description: 'Bank or wallet name when slug is unknown; server matches presets or treats as custom',
          },
          lastFour: {
            type: 'string',
            description: 'Optional. Only when the user already stated the last 4 digits — never request card numbers.',
          },
          note: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_payment_account',
      description:
        'Update an existing card or account (rename, change type, last four digits, note, or mark inactive). Match account by name from WORKSPACE CONTEXT.',
      parameters: {
        type: 'object',
        required: ['paymentAccountId'],
        properties: {
          paymentAccountId: { type: 'integer', description: 'Internal account ref from context' },
          name: { type: 'string' },
          accountType: {
            type: 'string',
            enum: ['debit', 'credit', 'paypak', 'wallet', 'cash', 'other'],
          },
          institutionSlug: { type: 'string' },
          institutionName: { type: 'string' },
          lastFour: {
            type: 'string',
            description: 'Optional. Only when the user already gave last 4 digits — never request card numbers.',
          },
          note: { type: 'string' },
          isActive: {
            type: 'boolean',
            description: 'false to mark inactive/archived; true to reactivate',
          },
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
  | 'create_transfer'
  | 'create_recurring_rule'
  | 'update_recurring_rule'
  | 'create_saving'
  | 'create_payment_account'
  | 'update_payment_account'
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
