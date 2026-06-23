import { getSavingLedgerDelta, type SavingEntryType } from '#/features/savings/utils/saving-ledger'
import type { SavingsPageStats } from '#/features/savings/types/savings-stats'

export type { SavingsPageStats } from '#/features/savings/types/savings-stats'

interface SavingsStatsRow {
  amount: string
  goalId: number | null
  entryType?: SavingEntryType
}

/**
 * Builds descriptive stats for the savings page header (net of withdrawals).
 */
export function buildSavingsPageStats(savings: SavingsStatsRow[]): SavingsPageStats {
  let totalSaved = 0
  let totalDeposits = 0
  let totalWithdrawals = 0
  let linkedToGoals = 0
  let linkedEntryCount = 0

  for (const saving of savings) {
    const entryType = saving.entryType ?? 'deposit'
    const delta = getSavingLedgerDelta(saving.amount, entryType)
    totalSaved += delta

    if (entryType === 'withdrawal') {
      totalWithdrawals += Math.abs(delta)
    } else {
      totalDeposits += delta
    }

    if (saving.goalId) {
      linkedToGoals += delta
      linkedEntryCount += 1
    }
  }

  return {
    totalSaved,
    totalDeposits,
    totalWithdrawals,
    linkedToGoals,
    generalSavings: totalSaved - linkedToGoals,
    entryCount: savings.length,
    linkedEntryCount,
  }
}
