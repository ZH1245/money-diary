import { asc, count, desc, eq, sql } from 'drizzle-orm'
import { db } from '#/db/index'
import { user } from '#/db/auth-schema'
import { ticketMessages, tickets } from '#/db/schema'
import type {
  AdminTicketListItemDto,
  TicketDetailDto,
  TicketDto,
  TicketMessageAuthorRole,
  TicketMessageDto,
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

function toTicketMessageDto(
  row: typeof ticketMessages.$inferSelect,
): TicketMessageDto {
  return {
    id: row.id,
    ticketId: row.ticketId,
    authorUserId: row.authorUserId,
    authorRole: row.authorRole as TicketMessageAuthorRole,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
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

/** Lists every ticket with submitter info and reply counts (admin). */
export async function getAllTicketsForAdmin(): Promise<AdminTicketListItemDto[]> {
  const rows = await db
    .select({
      ticket: tickets,
      submitterName: user.name,
      submitterEmail: user.email,
      replyCount: sql<number>`coalesce(${count(ticketMessages.id)}, 0)`.mapWith(
        Number,
      ),
    })
    .from(tickets)
    .innerJoin(user, eq(tickets.userId, user.id))
    .leftJoin(ticketMessages, eq(ticketMessages.ticketId, tickets.id))
    .groupBy(tickets.id, user.id, user.name, user.email)
    .orderBy(desc(tickets.updatedAt))

  return rows.map((row) => ({
    ...toTicketDto(row.ticket),
    submitter: {
      id: row.ticket.userId,
      name: row.submitterName,
      email: row.submitterEmail,
    },
    replyCount: row.replyCount,
  }))
}

/** @deprecated Use getAllTicketsForAdmin instead. */
export async function getAllTickets(): Promise<TicketDto[]> {
  const rows = await db
    .select()
    .from(tickets)
    .orderBy(desc(tickets.createdAt))

  return rows.map(toTicketDto)
}

/** Loads follow-up messages for a ticket, oldest first. */
export async function getTicketMessages(
  ticketId: number,
): Promise<TicketMessageDto[]> {
  const rows = await db
    .select()
    .from(ticketMessages)
    .where(eq(ticketMessages.ticketId, ticketId))
    .orderBy(asc(ticketMessages.createdAt))

  return rows.map(toTicketMessageDto)
}

/** Loads a ticket owned by the given user with its message thread. */
export async function getUserTicketDetail(params: {
  userId: string
  ticketId: number
}): Promise<TicketDetailDto | null> {
  const [row] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, params.ticketId))
    .limit(1)

  if (!row || row.userId !== params.userId) {
    return null
  }

  const messages = await getTicketMessages(params.ticketId)

  return {
    ...toTicketDto(row),
    messages,
  }
}

/** Loads any ticket with submitter info and message thread (admin). */
export async function getAdminTicketDetail(
  ticketId: number,
): Promise<TicketDetailDto | null> {
  const [row] = await db
    .select({
      ticket: tickets,
      submitterName: user.name,
      submitterEmail: user.email,
    })
    .from(tickets)
    .innerJoin(user, eq(tickets.userId, user.id))
    .where(eq(tickets.id, ticketId))
    .limit(1)

  if (!row) {
    return null
  }

  const messages = await getTicketMessages(ticketId)

  return {
    ...toTicketDto(row.ticket),
    submitter: {
      id: row.ticket.userId,
      name: row.submitterName,
      email: row.submitterEmail,
    },
    messages,
  }
}

/** Appends a reply to a ticket and bumps the parent updated_at timestamp. */
export async function createTicketMessage(params: {
  ticketId: number
  authorUserId: string
  authorRole: TicketMessageAuthorRole
  body: string
  nextStatus?: TicketStatus
}): Promise<TicketMessageDto | null> {
  const [ticketRow] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, params.ticketId))
    .limit(1)

  if (!ticketRow) {
    return null
  }

  const [messageRow] = await db
    .insert(ticketMessages)
    .values({
      ticketId: params.ticketId,
      authorUserId: params.authorUserId,
      authorRole: params.authorRole,
      body: params.body,
    })
    .returning()

  await db
    .update(tickets)
    .set({
      status: params.nextStatus ?? ticketRow.status,
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, params.ticketId))

  return toTicketMessageDto(messageRow)
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
