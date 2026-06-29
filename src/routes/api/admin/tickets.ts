import { createFileRoute } from '@tanstack/react-router'
import { getAllTickets } from '#/features/feedback/server/tickets-repository'
import { requireAdmin } from '#/lib/server/admin-guard'
import {
  buildOptionsResponse,
  guardApiRequest,
} from '#/lib/server/api-guards'

export const Route = createFileRoute('/api/admin/tickets')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const adminResponse = await requireAdmin(request)
        if (adminResponse) return adminResponse

        try {
          const data = await getAllTickets()
          return Response.json({ success: true, data })
        } catch (error) {
          console.error('[admin/tickets GET]', error)
          return Response.json(
            { success: false, error: 'Unable to load tickets.' },
            { status: 500 },
          )
        }
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})
