import { format, parseISO, startOfMonth, startOfWeek, subDays } from 'date-fns'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const WRITE_INTENT =
  /(?:^|\s)(?:spent|paid|log(?:ged)?|add(?:ed)?|create(?:d)?|record(?:ed)?|saved|transfer(?:red)?|bought|delete|remove|update)\s+\d/i

/**
 * Combines recent user messages so follow-ups keep read context.
 */
function buildUserContext(messages: ChatMessage[]): string {
  return messages
    .filter((message) => message.role === 'user')
    .slice(-3)
    .map((message) => message.content.trim())
    .join(' ')
    .toLowerCase()
}

/**
 * Resolves a date range from natural language for fallback tool args.
 */
function resolveDateRangeFromText(text: string, today: string): { from: string; to: string } {
  const todayDate = parseISO(today)

  if (/\btoday\b/.test(text)) {
    return { from: today, to: today }
  }

  if (/\byesterday\b/.test(text)) {
    const yesterday = format(subDays(todayDate, 1), 'yyyy-MM-dd')
    return { from: yesterday, to: yesterday }
  }

  if (/\bthis week\b|\bweekly\b/.test(text)) {
    return {
      from: format(startOfWeek(todayDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      to: today,
    }
  }

  if (/\blast 7 days\b|\bpast week\b/.test(text)) {
    return { from: format(subDays(todayDate, 6), 'yyyy-MM-dd'), to: today }
  }

  if (/\blast 30 days\b|\bpast month\b/.test(text)) {
    return { from: format(subDays(todayDate, 29), 'yyyy-MM-dd'), to: today }
  }

  return { from: format(startOfMonth(todayDate), 'yyyy-MM-dd'), to: today }
}

/**
 * Returns true when the assistant reply failed to answer without tools.
 */
export function isWeakAssistantReply(reply: string): boolean {
  const trimmed = reply.trim()
  if (!trimmed) return true

  return /did not understand|cannot access|can't access|don't have access|do not have access|language model|i'm unable to|i am unable to/i.test(
    trimmed,
  )
}

/**
 * Maps obvious read intents to query_user_data when the model skips tool calls.
 */
export function resolveFallbackToolInvocation(
  messages: ChatMessage[],
  today: string,
): { toolName: 'query_user_data'; toolArgs: Record<string, unknown> } | null {
  const context = buildUserContext(messages)
  if (!context.trim()) return null
  if (WRITE_INTENT.test(context)) return null

  const isReadQuestion =
    /\b(my|show|list|what|how much|how many|total|expense|expenses|income|saving|savings|goal|goals|wishlist|transaction|breakdown|date|wise|category|categories|spent|spending)\b/i.test(
      context,
    )

  if (!isReadQuestion) return null

  const range = resolveDateRangeFromText(context, today)

  let dataset: 'transactions' | 'savings' | 'goals' | 'wishlist' = 'transactions'
  if (/\bwishlist\b/.test(context)) {
    dataset = 'wishlist'
  } else if (/\bsavings?\b/.test(context)) {
    dataset = 'savings'
  } else if (/\bgoals?\b/.test(context)) {
    dataset = 'goals'
  }

  let transactionType: 'expense' | 'income' | 'transfer' | 'all' = 'all'
  if (/\btransfer/.test(context)) {
    transactionType = 'transfer'
  } else if (/\b(income|salary|earned)\b/.test(context) && !/\b(expense|spent|spending)\b/.test(context)) {
    transactionType = 'income'
  } else if (/\b(expense|expenses|spent|spending)\b/.test(context)) {
    transactionType = 'expense'
  }

  let groupBy: 'none' | 'date' | 'category' = 'none'
  if (/date.?wise|per date|by date|each date|group.*date|day by day|daily/.test(context)) {
    groupBy = 'date'
  } else if (/by category|per category|top categor|breakdown/.test(context)) {
    groupBy = 'category'
  } else if (dataset === 'transactions' && /\b(total|how much|what are my|summary|summar)\b/.test(context)) {
    groupBy = 'category'
  }

  return {
    toolName: 'query_user_data',
    toolArgs: {
      dataset,
      fromDate: range.from,
      toDate: range.to,
      transactionType,
      groupBy,
      limit: 50,
    },
  }
}
