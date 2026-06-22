/** Form state for creating or editing a financial goal. */
export interface GoalFormState {
  title: string
  targetAmount: string
  currentAmount: string
  savingsAmount: string
  status: 'active' | 'paused' | 'completed'
  targetDate: string
  note: string
}

/** Returns empty defaults for the goal create/edit sheet. */
export function getDefaultGoalForm(): GoalFormState {
  return {
    title: '',
    targetAmount: '',
    currentAmount: '0',
    savingsAmount: '0',
    status: 'active',
    targetDate: '',
    note: '',
  }
}

/** Formats an ISO date for table display. */
export function formatGoalDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}
