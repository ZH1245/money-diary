import { parseLedgerAmount } from '#/features/goals/utils/goal-progress'

export interface SavingsPageStats {
  totalSaved: number
  linkedToGoals: number
  generalSavings: number
  entryCount: number
  linkedEntryCount: number
}

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
