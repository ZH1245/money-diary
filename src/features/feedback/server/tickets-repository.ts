import { desc, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import { tickets } from '#/db/schema'
import type {
  TicketDto,
  TicketStatus,
  TicketType,
} from '#/features/feedback/types/ticket'

function toTicketDto(row: typeof tickets.$inferSelect): TicketDto {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as TicketType,
    subject: row.subject,
    body: row.body,
    status: row.status as TicketStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/** Creates a ticket for a user. */
export async function createTicket(params: {
  userId: string
  type: TicketType
  subject: string
  body: string
}): Promise<TicketDto> {
  const [row] = await db
    .insert(tickets)
    .values({
      userId: params.userId,
      type: params.type,
      subject: params.subject,
      body: params.body,
    })
    .returning()

  return toTicketDto(row)
}

/** Lists a user's own tickets, newest first. */
export async function getUserTickets(userId: string): Promise<TicketDto[]> {
  const rows = await db
    .select()
    .from(tickets)
    .where(eq(tickets.userId, userId))
    .orderBy(desc(tickets.createdAt))

  return rows.map(toTicketDto)
}

/** Lists every ticket, newest first (admin). */
export async function getAllTickets(): Promise<TicketDto[]> {
  const rows = await db
    .select()
    .from(tickets)
    .orderBy(desc(tickets.createdAt))

  return rows.map(toTicketDto)
}

/** Updates a ticket's status (admin). */
export async function updateTicketStatus(params: {
  ticketId: number
  status: TicketStatus
}): Promise<TicketDto | null> {
  const [row] = await db
    .update(tickets)
    .set({ status: params.status, updatedAt: new Date() })
    .where(eq(tickets.id, params.ticketId))
    .returning()

  return row ? toTicketDto(row) : null
}
