import type { RecurringRuleDto } from '#/features/recurring/types/recurring'
import type { TransactionDto } from '#/features/transactions/types/transaction'
import { formatTransactionHappenedAtLabel } from '#/lib/date-input'

export type UpcomingItemKind = 'planned' | 'recurring'

export interface UpcomingItem {
  key: string
  kind: UpcomingItemKind
  title: string
  amount: number
  dueAt: string
  dueLabel: string
  badge: string
  cadence?: string
  draftId?: number
  recurringRuleId?: number
}

/**
 * Builds sorted upcoming and canceled lists from planned drafts and recurring rules.
 */
export function buildUpcomingItems(
  drafts: TransactionDto[],
  recurringRules: RecurringRuleDto[],
): { upcoming: UpcomingItem[]; canceled: UpcomingItem[] } {
  const plannedItems: UpcomingItem[] = drafts.map((draft) => ({
    key: `draft-${draft.id}`,
    kind: 'planned',
    title: draft.title,
    amount: Number(draft.amount),
    dueAt: draft.happenedAt,
    dueLabel: formatTransactionHappenedAtLabel(draft.happenedAt),
    badge: draft.title.slice(0, 2).toUpperCase(),
    draftId: draft.id,
  }))

  const activeRecurring: UpcomingItem[] = recurringRules
    .filter((rule) => rule.isActive)
    .map((rule) => ({
      key: `recurring-${rule.id}`,
      kind: 'recurring',
      title: rule.title,
      amount: Number(rule.amount),
      dueAt: rule.nextRunAt,
      dueLabel: new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(rule.nextRunAt)),
      badge: rule.title.slice(0, 2).toUpperCase(),
      cadence: rule.cadence,
      recurringRuleId: rule.id,
    }))

  const canceled: UpcomingItem[] = recurringRules
    .filter((rule) => !rule.isActive)
    .map((rule) => ({
      key: `recurring-canceled-${rule.id}`,
      kind: 'recurring',
      title: rule.title,
      amount: Number(rule.amount),
      dueAt: rule.nextRunAt,
      dueLabel: `${rule.cadence} · canceled`,
      badge: rule.title.slice(0, 2).toUpperCase(),
      cadence: rule.cadence,
      recurringRuleId: rule.id,
    }))

  const upcoming = [...plannedItems, ...activeRecurring].sort(
    (first, second) => new Date(first.dueAt).getTime() - new Date(second.dueAt).getTime(),
  )

  return { upcoming, canceled }
}
