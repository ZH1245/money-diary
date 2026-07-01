import type { ApiListResponse } from '#/types/api'
import { apiFetch } from '#/lib/api-fetch'
import type { CreateSavingInput, SavingDto, UpdateSavingInput } from '../types/saving'

/**
 * Loads savings for the active user context.
 */
export async function getSavings(): Promise<SavingDto[]> {
  const response = await apiFetch('/api/savings')
  const json = (await response.json()) as ApiListResponse<SavingDto>

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to load savings')
  }

  return json.data
}

/**
 * Creates a new savings entry.
 */
export async function createSaving(input: CreateSavingInput): Promise<SavingDto> {
  const response = await apiFetch('/api/savings', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const json = (await response.json()) as { success: boolean; data: SavingDto; error?: string }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to create saving')
  }

  return json.data
}

/**
 * Updates an existing savings entry.
 */
export async function updateSaving(id: number, input: UpdateSavingInput): Promise<SavingDto> {
  const response = await apiFetch(`/api/savings/${id}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const json = (await response.json()) as { success: boolean; data: SavingDto; error?: string }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to update saving')
  }

  return json.data
}

/**
 * Deletes a savings entry.
 */
export async function deleteSaving(id: number): Promise<void> {
  const response = await apiFetch(`/api/savings/${id}`, { method: 'DELETE' })
  const json = (await response.json()) as { success: boolean; error?: string }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to delete saving')
  }
}
