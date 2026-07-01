import { buildNetWorth } from '#/features/analytics/utils/analytics-stats'
import { buildOverallGoalProgressPercent } from '#/features/goals/utils/goals-analytics'
import { buildGoalsPageStats, buildLinkedSavingsByGoalId } from '#/features/goals/utils/goal-progress'
import type { PaymentAccountBalanceTransaction } from '#/features/payment-accounts/utils/payment-account-balance'
import { buildSavingsPageStats } from '#/features/savings/utils/savings-stats'
import { buildWishlistPageStats } from '#/features/wishlist/utils/wishlist-stats'

export interface DashboardWealthStats {
  savings: {
    totalSaved: number
    entryCount: number
  }
  goals: {
    activeCount: number
    overallPercent: number
  }
  wishlist: {
    activeCount: number
    overallPercent: number
  }
  netWorth: number
}

interface DashboardWealthInput {
  paymentAccountIds: number[]
  transactions: PaymentAccountBalanceTransaction[]
  savings: Array<{
    amount: string
    goalId: number | null
    paymentAccountId: number | null
    entryType?: 'deposit' | 'withdrawal'
  }>
  goals: Array<{
    id: number
    targetAmount: string
    currentAmount: string
    savingsAmount: string
    status: 'active' | 'paused' | 'completed'
    targetDate: string | null
  }>
  wishlist: Array<{
    targetAmount: string
    currentAmount: string
    status: 'active' | 'paused' | 'completed'
  }>
}

/**
 * Builds all-time wealth rollup stats for the dashboard compact tiles.
 */
export function buildDashboardWealthStats(input: DashboardWealthInput): DashboardWealthStats {
  const savingsStats = buildSavingsPageStats(input.savings)
  const linkedSavingsByGoalId = buildLinkedSavingsByGoalId(input.savings)
  const goalsStats = buildGoalsPageStats(input.goals, linkedSavingsByGoalId)
  const goalsPercent = buildOverallGoalProgressPercent(input.goals, linkedSavingsByGoalId)
  const wishlistStats = buildWishlistPageStats(input.wishlist)
  const netWorth = buildNetWorth({
    accountIds: input.paymentAccountIds,
    transactions: input.transactions,
    savings: input.savings,
  }).netWorth

  return {
    savings: {
      totalSaved: savingsStats.totalSaved,
      entryCount: savingsStats.entryCount,
    },
    goals: {
      activeCount: goalsStats.activeCount,
      overallPercent: goalsPercent,
    },
    wishlist: {
      activeCount: wishlistStats.activeCount,
      overallPercent: wishlistStats.overallPercent,
    },
    netWorth,
  }
}
