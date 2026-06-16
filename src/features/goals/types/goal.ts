/**
 * Goal record returned by goals APIs.
 */
export interface GoalDto {
  id: number
  title: string
  targetAmount: string
  currentAmount: string
  savingsAmount: string
  status: 'active' | 'paused' | 'completed'
  targetDate: string | null
  note: string | null
}

/**
 * Payload accepted by create goals API.
 */
export interface CreateGoalInput {
  title: string
  targetAmount: string
  currentAmount?: string
  savingsAmount?: string
  status?: 'active' | 'paused' | 'completed'
  targetDate?: string
  note?: string
}

/**
 * Payload accepted by update goals API.
 */
export interface UpdateGoalInput {
  title?: string
  targetAmount?: string
  currentAmount?: string
  savingsAmount?: string
  status?: 'active' | 'paused' | 'completed'
  targetDate?: string | null
  note?: string | null
}
