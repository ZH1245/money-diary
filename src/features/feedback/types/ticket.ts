export type TicketType = 'bug' | 'feature' | 'support'

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export type TicketMessageAuthorRole = 'user' | 'admin'

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

export interface TicketSubmitterDto {
  id: string
  name: string
  email: string
}

/** A follow-up message on a ticket thread. */
export interface TicketMessageDto {
  id: number
  ticketId: number
  authorUserId: string
  authorRole: TicketMessageAuthorRole
  body: string
  createdAt: string
}

/** Ticket with full conversation thread. */
export interface TicketDetailDto extends TicketDto {
  messages: TicketMessageDto[]
  submitter?: TicketSubmitterDto
}

/** Admin list row with submitter identity. */
export interface AdminTicketListItemDto extends TicketDto {
  submitter: TicketSubmitterDto
  replyCount: number
}

export interface CreateTicketInput {
  type: TicketType
  subject: string
  body: string
}

export interface UpdateTicketStatusInput {
  status: TicketStatus
}

export interface CreateTicketMessageInput {
  body: string
}
