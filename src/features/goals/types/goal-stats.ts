export interface GoalProgressBreakdown {
  progressAmount: number
  declaredSavingsAmount: number
  linkedSavingsAmount: number
  savingsForGoal: number
  totalAchieved: number
  targetAmount: number
  stillNeeded: number
}

export interface GoalsPageStats {
  activeCount: number
  totalTarget: number
  totalAchieved: number
  totalStillNeeded: number
}
