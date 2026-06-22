import { parseLedgerAmount } from '#/features/shared/utils/amount'
import type { SavingsPageStats } from '#/features/savings/types/savings-stats'

export type { SavingsPageStats } from '#/features/savings/types/savings-stats'

/**
 * Builds descriptive stats for the savings page header.
 */
export function buildSavingsPageStats(
  savings: Array<{ amount: string; goalId: number | null }>,
): SavingsPageStats {
  let totalSaved = 0
  let linkedToGoals = 0
  let linkedEntryCount = 0

  for (const saving of savings) {
    const amount = parseLedgerAmount(saving.amount)
    totalSaved += amount

    if (saving.goalId) {
      linkedToGoals += amount
      linkedEntryCount += 1
    }
  }

  return {
    totalSaved,
    linkedToGoals,
    generalSavings: totalSaved - linkedToGoals,
    entryCount: savings.length,
    linkedEntryCount,
  }
}
