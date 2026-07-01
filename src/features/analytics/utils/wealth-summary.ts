import { buildOverallGoalProgressPercent } from '#/features/goals/utils/goals-analytics'
import { buildGoalsPageStats, buildLinkedSavingsByGoalId } from '#/features/goals/utils/goal-progress'

export interface WealthGoalSummary {
  activeCount: number
  overallPercent: number
  totalAchieved: number
  totalTarget: number
  totalStillNeeded: number
}

interface WealthSummaryGoal {
  id: number
  title: string
  targetAmount: string
  currentAmount: string
  savingsAmount: string
  status: 'active' | 'paused' | 'completed'
  targetDate: string | null
}

interface WealthSummarySaving {
  goalId: number | null
  amount: string
  entryType?: 'deposit' | 'withdrawal'
}

/**
 * Builds a compact goals rollup for the Analytics wealth section.
 */
export function buildWealthGoalSummary(
  goals: WealthSummaryGoal[],
  savings: WealthSummarySaving[],
): WealthGoalSummary {
  const linkedSavingsByGoalId = buildLinkedSavingsByGoalId(savings)
  const pageStats = buildGoalsPageStats(goals, linkedSavingsByGoalId)
  const overallPercent = buildOverallGoalProgressPercent(goals, linkedSavingsByGoalId)

  return {
    activeCount: pageStats.activeCount,
    overallPercent,
    totalAchieved: pageStats.totalAchieved,
    totalTarget: pageStats.totalTarget,
    totalStillNeeded: pageStats.totalStillNeeded,
  }
}
