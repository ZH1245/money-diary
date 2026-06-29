import { createFileRoute } from '@tanstack/react-router'
import { updateTicketStatusSchema } from '#/features/feedback/schemas/ticket'
import { updateTicketStatus } from '#/features/feedback/server/tickets-repository'
import { requireAdmin } from '#/lib/server/admin-guard'
import {
  buildOptionsResponse,
  guardApiRequest,
} from '#/lib/server/api-guards'
import { parseRouteId } from '#/lib/server/parse-route-id'
import { parseJsonBody } from '#/lib/server/request-body'

export const Route = createFileRoute('/api/admin/tickets/$id')({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const adminResponse = await requireAdmin(request)
        if (adminResponse) return adminResponse

        const ticketId = parseRouteId(params.id)
        if (!ticketId) {
          return Response.json(
            { success: false, error: 'Invalid ticket id' },
            { status: 400 },
          )
        }

        const body = await parseJsonBody(request)
        if (body instanceof Response) return body

        const parsed = updateTicketStatusSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            {
              success: false,
              error: 'Invalid ticket payload',
              details: parsed.error.flatten(),
            },
            { status: 400 },
          )
        }

        try {
          const row = await updateTicketStatus({
            ticketId,
            status: parsed.data.status,
          })
          if (!row) {
            return Response.json(
              { success: false, error: 'Ticket not found' },
              { status: 404 },
            )
          }
          return Response.json({ success: true, data: row })
        } catch (error) {
          console.error('[admin/tickets/$id PATCH]', error)
          return Response.json(
            { success: false, error: 'Unable to update ticket.' },
            { status: 500 },
          )
        }
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})
