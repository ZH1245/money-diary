import { createFileRoute } from '@tanstack/react-router'
import { createTicketMessageSchema } from '#/features/feedback/schemas/ticket'
import {
  createTicketMessage,
  getAdminTicketDetail,
} from '#/features/feedback/server/tickets-repository'
import { requireAdmin } from '#/lib/server/admin-guard'
import {
  buildOptionsResponse,
  guardApiRequest,
  requireUserContext,
} from '#/lib/server/api-guards'
import { parseRouteId } from '#/lib/server/parse-route-id'
import { parseJsonBody } from '#/lib/server/request-body'

export const Route = createFileRoute('/api/admin/tickets/$id/messages')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const adminResponse = await requireAdmin(request)
        if (adminResponse) return adminResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const body = await parseJsonBody(request)
        if (body instanceof Response) return body

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

        const ticket = await getAdminTicketDetail(ticketId)
        if (!ticket) {
          return Response.json(
            { success: false, error: 'Ticket not found' },
            { status: 404 },
          )
        }

        if (ticket.status === 'closed') {
          return Response.json(
            { success: false, error: 'This ticket is closed. Change the status to reply.' },
            { status: 409 },
          )
        }

        const nextStatus = ticket.status === 'open' ? 'in_progress' : undefined

        const message = await createTicketMessage({
          ticketId,
          authorUserId: userContext.id,
          authorRole: 'admin',
          body: parsed.data.body,
          nextStatus,
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
