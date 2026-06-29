export type TicketType = 'bug' | 'feature' | 'support'

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

/** A ticket as returned by the API (timestamps are ISO strings). */
export interface TicketDto {
  id: number
  userId: string
  type: TicketType
  subject: string
  body: string
  status: TicketStatus
  createdAt: string
  updatedAt: string
}

export interface CreateTicketInput {
  type: TicketType
  subject: string
  body: string
}

export interface UpdateTicketStatusInput {
  status: TicketStatus
}
