import { buildGoalProgress } from '#/features/goals/utils/goal-progress'

export type GoalPaceStatus = 'completed' | 'on_track' | 'behind' | 'in_progress'

export interface GoalProgressChartRow {
  id: number
  title: string
  achieved: number
  target: number
  percent: number
  paceStatus: GoalPaceStatus
  targetDate: string | null
}

export interface GoalPaceSummary {
  onTrack: number
  behind: number
  inProgress: number
  completed: number
}

interface GoalAnalyticsInput {
  id: number
  title: string
  targetAmount: string
  currentAmount: string
  savingsAmount: string
  status: 'active' | 'paused' | 'completed'
  targetDate: string | null
}

/**
 * Classifies goal pace using target date and remaining amount.
 */
export function resolveGoalPaceStatus(
  breakdown: { stillNeeded: number; totalAchieved: number; targetAmount: number },
  targetDate: string | null,
  referenceDate = new Date(),
): GoalPaceStatus {
  if (breakdown.targetAmount > 0 && breakdown.stillNeeded <= 0) {
    return 'completed'
  }

  if (targetDate) {
    const due = new Date(targetDate)
    if (!Number.isNaN(due.getTime()) && due.getTime() < referenceDate.getTime() && breakdown.stillNeeded > 0) {
      return 'behind'
    }
  }

  if (breakdown.targetAmount > 0) {
    const percent = (breakdown.totalAchieved / breakdown.targetAmount) * 100
    if (percent >= 25) {
      return 'on_track'
    }
  }

  return 'in_progress'
}

/**
 * Builds chart rows for active goals with progress and pace labels.
 */
export function buildGoalProgressChartRows(
  goals: GoalAnalyticsInput[],
  linkedSavingsByGoalId: Record<number, number>,
  referenceDate = new Date(),
): GoalProgressChartRow[] {
  return goals
    .filter((goal) => goal.status === 'active')
    .map((goal) => {
      const breakdown = buildGoalProgress(goal, linkedSavingsByGoalId[goal.id] ?? 0)
      const target = breakdown.targetAmount
      const percent = target > 0 ? Math.min(100, (breakdown.totalAchieved / target) * 100) : 0

      return {
        id: goal.id,
        title: goal.title,
        achieved: breakdown.totalAchieved,
        target,
        percent,
        paceStatus: resolveGoalPaceStatus(breakdown, goal.targetDate, referenceDate),
        targetDate: goal.targetDate,
      }
    })
    .sort((first, second) => second.percent - first.percent)
}

/**
 * Summarizes how many active goals are on track, behind, or still early.
 */
export function buildGoalPaceSummary(rows: GoalProgressChartRow[]): GoalPaceSummary {
  return rows.reduce<GoalPaceSummary>(
    (accumulator, row) => {
      if (row.paceStatus === 'completed') accumulator.completed += 1
      if (row.paceStatus === 'on_track') accumulator.onTrack += 1
      if (row.paceStatus === 'behind') accumulator.behind += 1
      if (row.paceStatus === 'in_progress') accumulator.inProgress += 1
      return accumulator
    },
    { onTrack: 0, behind: 0, inProgress: 0, completed: 0 },
  )
}

/**
 * Overall goal progress percent across active goals.
 */
export function buildOverallGoalProgressPercent(
  goals: Array<
    Pick<GoalAnalyticsInput, 'id' | 'targetAmount' | 'currentAmount' | 'savingsAmount' | 'status'>
  >,
  linkedSavingsByGoalId: Record<number, number>,
): number {
  let totalTarget = 0
  let totalAchieved = 0

  for (const goal of goals) {
    if (goal.status !== 'active') {
      continue
    }

    const breakdown = buildGoalProgress(goal, linkedSavingsByGoalId[goal.id] ?? 0)
    totalTarget += breakdown.targetAmount
    totalAchieved += breakdown.totalAchieved
  }

  if (totalTarget <= 0) {
    return 0
  }

  return Math.min(100, (totalAchieved / totalTarget) * 100)
}
