import { parseLedgerAmount } from '#/features/shared/utils/amount'
import type { GoalProgressBreakdown, GoalsPageStats } from '#/features/goals/types/goal-stats'

export { parseLedgerAmount } from '#/features/shared/utils/amount'
export type { GoalProgressBreakdown, GoalsPageStats } from '#/features/goals/types/goal-stats'

interface GoalProgressInput {
  targetAmount: string
  currentAmount: string
  savingsAmount: string
}

/**
 * Combines goal progress, declared savings, and linked savings entries.
 */
export function buildGoalProgress(goal: GoalProgressInput, linkedSavingsAmount: number): GoalProgressBreakdown {
  const progressAmount = parseLedgerAmount(goal.currentAmount)
  const declaredSavingsAmount = parseLedgerAmount(goal.savingsAmount)
  const targetAmount = parseLedgerAmount(goal.targetAmount)
  const savingsForGoal = declaredSavingsAmount + linkedSavingsAmount
  const totalAchieved = progressAmount + savingsForGoal
  const stillNeeded = Math.max(0, targetAmount - totalAchieved)

  return {
    progressAmount,
    declaredSavingsAmount,
    linkedSavingsAmount,
    savingsForGoal,
    totalAchieved,
    targetAmount,
    stillNeeded,
  }
}

/**
 * Sums savings ledger amounts linked to each goal id.
 */
export function buildLinkedSavingsByGoalId(
  savings: Array<{ goalId: number | null; amount: string }>,
): Record<number, number> {
  return savings.reduce<Record<number, number>>((accumulator, saving) => {
    if (!saving.goalId) return accumulator
    const amount = parseLedgerAmount(saving.amount)
    accumulator[saving.goalId] = (accumulator[saving.goalId] ?? 0) + amount
    return accumulator
  }, {})
}

interface GoalWithStatus extends GoalProgressInput {
  id: number
  status: 'active' | 'paused' | 'completed'
}

/**
 * Builds descriptive stats for the goals page header.
 */
export function buildGoalsPageStats(
  goals: GoalWithStatus[],
  linkedSavingsByGoalId: Record<number, number>,
): GoalsPageStats {
  let totalTarget = 0
  let totalAchieved = 0
  let totalStillNeeded = 0
  let activeCount = 0

  for (const goal of goals) {
    if (goal.status !== 'active') continue

    activeCount += 1
    const breakdown = buildGoalProgress(goal, linkedSavingsByGoalId[goal.id] ?? 0)
    totalTarget += breakdown.targetAmount
    totalAchieved += breakdown.totalAchieved
    totalStillNeeded += breakdown.stillNeeded
  }

  return {
    activeCount,
    totalTarget,
    totalAchieved,
    totalStillNeeded,
  }
}
