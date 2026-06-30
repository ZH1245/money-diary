import { createFileRoute } from '@tanstack/react-router'
import { getAppMeta } from '#/lib/server/app-build'
import { buildOptionsResponse, guardApiRequest } from '#/lib/server/api-guards'

export const Route = createFileRoute('/api/app/meta')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        return Response.json({ success: true, data: getAppMeta() })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})
