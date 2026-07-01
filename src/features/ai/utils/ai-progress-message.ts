/**
 * Formats a numeric amount for short progress copy.
 */
function formatProgressAmount(amount: number): string {
  if (!Number.isFinite(amount)) {
    return String(amount)
  }

  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

/**
 * Reads a trimmed string field from loose tool argument objects.
 */
function readStringArg(args: Record<string, unknown>, key: string): string {
  const value = args[key]
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Reads a positive number field from loose tool argument objects.
 */
function readNumberArg(args: Record<string, unknown>, key: string): number | null {
  const value = args[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

const TOOL_PROGRESS_FALLBACKS: Record<string, string> = {
  create_transaction: 'Logging transaction',
  update_transaction: 'Updating transaction',
  create_transfer: 'Recording transfer',
  create_recurring_rule: 'Setting up recurring entry',
  update_recurring_rule: 'Updating recurring entry',
  create_saving: 'Updating savings',
  create_payment_account: 'Adding payment account',
  update_payment_account: 'Updating payment account',
  create_goal: 'Creating goal',
  update_goal: 'Updating goal',
  delete_goal: 'Removing goal',
  create_wishlist_item: 'Adding wishlist item',
  update_wishlist_item: 'Updating wishlist item',
  delete_wishlist_item: 'Removing wishlist item',
  create_scheduled_transaction: 'Scheduling transaction',
  create_ticket: 'Creating support ticket',
  query_user_data: 'Looking up your data',
  get_exchange_rate: 'Fetching exchange rate',
}

/**
 * Short user-facing label for a completed AI tool action.
 */
export function getAiActionDisplayLabel(action: string): string {
  return TOOL_PROGRESS_FALLBACKS[action] ?? 'Working on your request'
}

/**
 * Builds a live progress line for an in-flight AI tool call.
 */
export function buildAiToolProgressMessage(toolName: string, toolArgs: unknown): string {
  const args =
    typeof toolArgs === 'object' && toolArgs !== null
      ? (toolArgs as Record<string, unknown>)
      : {}

  switch (toolName) {
    case 'create_transaction': {
      const title = readStringArg(args, 'title')
      const amount = readNumberArg(args, 'amount')
      const type = args.type === 'income' ? 'income' : 'expense'
      const typeLabel = type === 'income' ? 'income' : 'expense'

      if (title && amount != null) {
        return `Logging ${typeLabel}: ${title} (${formatProgressAmount(amount)})`
      }

      if (title) {
        return `Logging ${typeLabel}: ${title}`
      }

      return `Logging ${typeLabel}`
    }

    case 'create_transfer': {
      const title = readStringArg(args, 'title')
      const amount = readNumberArg(args, 'amount')

      if (title && amount != null) {
        return `Recording transfer: ${title} (${formatProgressAmount(amount)})`
      }

      if (amount != null) {
        return `Moving ${formatProgressAmount(amount)} between accounts`
      }

      return 'Recording transfer between accounts'
    }

    case 'update_transaction': {
      const title = readStringArg(args, 'title')
      if (title) {
        return `Updating transaction: ${title}`
      }

      return 'Updating transaction'
    }

    case 'create_recurring_rule': {
      const title = readStringArg(args, 'title')
      if (title) {
        return `Setting up recurring entry: ${title}`
      }

      return 'Setting up recurring entry'
    }

    case 'update_recurring_rule':
      return 'Updating recurring entry'

    case 'create_saving': {
      const title = readStringArg(args, 'title')
      const entryType = args.entryType === 'withdrawal' ? 'withdrawal' : 'deposit'
      if (title) {
        return `Recording savings ${entryType}: ${title}`
      }

      return `Recording savings ${entryType}`
    }

    case 'create_payment_account': {
      const name = readStringArg(args, 'name')
      if (name) {
        return `Adding account: ${name}`
      }

      return 'Adding payment account'
    }

    case 'update_payment_account':
      return 'Updating payment account'

    case 'create_goal': {
      const title = readStringArg(args, 'title')
      if (title) {
        return `Creating goal: ${title}`
      }

      return 'Creating goal'
    }

    case 'update_goal':
      return 'Updating goal'

    case 'delete_goal':
      return 'Removing goal'

    case 'create_wishlist_item': {
      const title = readStringArg(args, 'title')
      if (title) {
        return `Adding to wishlist: ${title}`
      }

      return 'Adding wishlist item'
    }

    case 'update_wishlist_item':
      return 'Updating wishlist item'

    case 'delete_wishlist_item':
      return 'Removing wishlist item'

    case 'create_scheduled_transaction': {
      const title = readStringArg(args, 'title')
      if (title) {
        return `Scheduling transaction: ${title}`
      }

      return 'Scheduling transaction'
    }

    case 'create_ticket':
      return 'Creating support ticket'

    case 'query_user_data': {
      const dataset = readStringArg(args, 'dataset')
      if (dataset) {
        return `Looking up your ${dataset}`
      }

      return 'Looking up your data'
    }

    case 'get_exchange_rate': {
      const fromCurrency = readStringArg(args, 'fromCurrency')
      const toCurrency = readStringArg(args, 'toCurrency')
      if (fromCurrency && toCurrency) {
        return `Fetching ${fromCurrency} to ${toCurrency} rate`
      }

      return 'Fetching exchange rate'
    }

    default:
      return getAiActionDisplayLabel(toolName)
  }
}
