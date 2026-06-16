import type { ApiListResponse } from '#/types/api'
import type { CreateGoalInput, GoalDto, UpdateGoalInput } from '../types/goal'

/**
 * Loads goals for the active user context.
 */
export async function getGoals(): Promise<GoalDto[]> {
  const response = await fetch('/api/goals')
  const json = (await response.json()) as ApiListResponse<GoalDto>

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to load goals')
  }

  return json.data
}

/**
 * Creates a new goal entry.
 */
export async function createGoal(input: CreateGoalInput): Promise<GoalDto> {
  const response = await fetch('/api/goals', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const json = (await response.json()) as { success: boolean; data: GoalDto; error?: string }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to create goal')
  }

  return json.data
}

/**
 * Updates a goal entry.
 */
export async function updateGoal(id: number, input: UpdateGoalInput): Promise<GoalDto> {
  const response = await fetch(`/api/goals/${id}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const json = (await response.json()) as { success: boolean; data: GoalDto; error?: string }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to update goal')
  }

  return json.data
}

/**
 * Deletes a goal entry.
 */
export async function deleteGoal(id: number): Promise<void> {
  const response = await fetch(`/api/goals/${id}`, { method: 'DELETE' })
  const json = (await response.json()) as { success: boolean; error?: string }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to delete goal')
  }
}
