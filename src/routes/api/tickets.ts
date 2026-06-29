import { createFileRoute } from '@tanstack/react-router'
import { createTicketSchema } from '#/features/feedback/schemas/ticket'
import {
  createTicket,
  getUserTickets,
} from '#/features/feedback/server/tickets-repository'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'
import { parseJsonBody } from '#/lib/server/request-body'

export const Route = createFileRoute('/api/tickets')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext
        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const data = await getUserTickets(userContext.id)
        return Response.json({ success: true, data })
      },
      POST: async ({ request }) => {
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

        const parsed = createTicketSchema.safeParse(body)
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

        const row = await createTicket({
          userId: userContext.id,
          type: parsed.data.type,
          subject: parsed.data.subject,
          body: parsed.data.body,
        })

        return Response.json({ success: true, data: row }, { status: 201 })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})
