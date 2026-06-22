import { createFileRoute } from '@tanstack/react-router'
import { listAdminUsers } from '#/features/admin/server/admin-users-repository'
import { buildOptionsResponse, guardApiRequest } from '#/lib/server/api-guards'
import { requireAdmin } from '#/lib/server/admin-guard'

export const Route = createFileRoute('/api/admin/users')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const adminResponse = await requireAdmin(request)
        if (adminResponse) return adminResponse

        const users = await listAdminUsers()
        return Response.json({ success: true, data: users })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})
