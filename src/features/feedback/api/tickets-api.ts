import type { ApiListResponse } from '#/types/api'
import type {
  AdminTicketListItemDto,
  CreateTicketInput,
  CreateTicketMessageInput,
  TicketDetailDto,
  TicketDto,
  TicketMessageDto,
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

/** Loads a single ticket with its conversation thread (user). */
export async function getUserTicketDetail(
  id: number,
): Promise<TicketDetailDto> {
  const response = await fetch(`/api/tickets/${id}`)
  const json = (await response.json()) as {
    success: boolean
    data: TicketDetailDto
    error?: string
  }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to load ticket')
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

/** Sends a follow-up reply on the user's own ticket. */
export async function createUserTicketMessage(
  ticketId: number,
  input: CreateTicketMessageInput,
): Promise<TicketMessageDto> {
  const response = await fetch(`/api/tickets/${ticketId}/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })

  const json = (await response.json()) as {
    success: boolean
    data: TicketMessageDto
    error?: string
  }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to send reply')
  }

  return json.data
}

/** Loads every ticket with submitter info (admin). */
export async function listAdminTickets(): Promise<AdminTicketListItemDto[]> {
  const response = await fetch('/api/admin/tickets')
  const json = (await response.json()) as ApiListResponse<AdminTicketListItemDto>

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to load tickets')
  }

  return json.data
}

/** Loads a single ticket with thread and submitter (admin). */
export async function getAdminTicketDetail(
  id: number,
): Promise<TicketDetailDto> {
  const response = await fetch(`/api/admin/tickets/${id}`)
  const json = (await response.json()) as {
    success: boolean
    data: TicketDetailDto
    error?: string
  }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to load ticket')
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

/** Sends an admin reply on a ticket. */
export async function createAdminTicketMessage(
  ticketId: number,
  input: CreateTicketMessageInput,
): Promise<TicketMessageDto> {
  const response = await fetch(`/api/admin/tickets/${ticketId}/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })

  const json = (await response.json()) as {
    success: boolean
    data: TicketMessageDto
    error?: string
  }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to send reply')
  }

  return json.data
}
