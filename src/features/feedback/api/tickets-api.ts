import type { ApiListResponse } from '#/types/api'
import type {
  CreateTicketInput,
  TicketDto,
  UpdateTicketStatusInput,
} from '../types/ticket'

/** Loads the active user's own tickets. */
export async function getUserTickets(): Promise<TicketDto[]> {
  const response = await fetch('/api/tickets')
  const json = (await response.json()) as ApiListResponse<TicketDto>

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to load tickets')
  }

  return json.data
}

/** Submits a new ticket. */
export async function createTicket(
  input: CreateTicketInput,
): Promise<TicketDto> {
  const response = await fetch('/api/tickets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })

  const json = (await response.json()) as {
    success: boolean
    data: TicketDto
    error?: string
  }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to submit ticket')
  }

  return json.data
}

/** Loads every ticket (admin). */
export async function listAdminTickets(): Promise<TicketDto[]> {
  const response = await fetch('/api/admin/tickets')
  const json = (await response.json()) as ApiListResponse<TicketDto>

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to load tickets')
  }

  return json.data
}

/** Updates a ticket's status (admin). */
export async function updateAdminTicketStatus(
  id: number,
  input: UpdateTicketStatusInput,
): Promise<TicketDto> {
  const response = await fetch(`/api/admin/tickets/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })

  const json = (await response.json()) as {
    success: boolean
    data: TicketDto
    error?: string
  }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to update ticket')
  }

  return json.data
}
