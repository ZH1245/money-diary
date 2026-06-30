import { createFileRoute } from '@tanstack/react-router'
import { createTicketMessageSchema } from '#/features/feedback/schemas/ticket'
import {
  createTicketMessage,
  getUserTicketDetail,
} from '#/features/feedback/server/tickets-repository'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'
import { parseRouteId } from '#/lib/server/parse-route-id'
import { parseJsonBody } from '#/lib/server/request-body'

export const Route = createFileRoute('/api/tickets/$id/messages')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const body = await parseJsonBody(request)
        if (body instanceof Response) return body
        const userIdRejected = rejectClientSuppliedUserId(
          request,
          body as Record<string, unknown>,
        )
        if (userIdRejected) return userIdRejected

        const ticketId = parseRouteId(params.id)
        if (!ticketId) {
          return Response.json(
            { success: false, error: 'Invalid ticket id' },
            { status: 400 },
          )
        }

        const parsed = createTicketMessageSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            {
              success: false,
              error: 'Invalid message payload',
              details: parsed.error.flatten(),
            },
            { status: 400 },
          )
        }

        const ticket = await getUserTicketDetail({
          userId: userContext.id,
          ticketId,
        })

        if (!ticket) {
          return Response.json(
            { success: false, error: 'Ticket not found' },
            { status: 404 },
          )
        }

        if (ticket.status === 'closed') {
          return Response.json(
            { success: false, error: 'This ticket is closed and cannot receive replies.' },
            { status: 409 },
          )
        }

        const shouldReopen = ticket.status === 'resolved'

        const message = await createTicketMessage({
          ticketId,
          authorUserId: userContext.id,
          authorRole: 'user',
          body: parsed.data.body,
          nextStatus: shouldReopen ? 'open' : undefined,
        })

        if (!message) {
          return Response.json(
            { success: false, error: 'Unable to send reply' },
            { status: 500 },
          )
        }

        return Response.json({ success: true, data: message }, { status: 201 })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})
