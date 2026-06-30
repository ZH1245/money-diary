import { createFileRoute } from '@tanstack/react-router'
import { serverEnv } from '#/env.server'
import { buildOptionsResponse, guardApiRequest } from '#/lib/server/api-guards'

export const Route = createFileRoute('/api/pusher/config')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const { PUSHER_KEY, PUSHER_CLUSTER } = serverEnv

        if (!PUSHER_KEY || !PUSHER_CLUSTER) {
          return Response.json({ enabled: false })
        }

        // Only key + cluster are client-safe. APP_ID and SECRET stay server-only.
        return Response.json({ enabled: true, key: PUSHER_KEY, cluster: PUSHER_CLUSTER })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})
