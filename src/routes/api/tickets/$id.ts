import { createFileRoute } from '@tanstack/react-router'
import { getUserTicketDetail } from '#/features/feedback/server/tickets-repository'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'
import { parseRouteId } from '#/lib/server/parse-route-id'

export const Route = createFileRoute('/api/tickets/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext
        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const ticketId = parseRouteId(params.id)
        if (!ticketId) {
          return Response.json(
            { success: false, error: 'Invalid ticket id' },
            { status: 400 },
          )
        }

        const data = await getUserTicketDetail({
          userId: userContext.id,
          ticketId,
        })

        if (!data) {
          return Response.json(
            { success: false, error: 'Ticket not found' },
            { status: 404 },
          )
        }

        return Response.json({ success: true, data })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})
