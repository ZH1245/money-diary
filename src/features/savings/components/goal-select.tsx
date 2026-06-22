import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import type { GoalDto } from '#/features/goals/types/goal'

interface GoalSelectProps {
  value: string
  onValueChange: (value: string) => void
  goals: GoalDto[]
  disabled?: boolean
}

/**
 * Optional goal picker for savings entries.
 */
export function GoalSelect({ value, onValueChange, goals, disabled }: GoalSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="General savings" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">General savings</SelectItem>
        {goals.map((goal) => (
          <SelectItem key={goal.id} value={String(goal.id)}>
            {goal.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
