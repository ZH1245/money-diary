import { createFileRoute } from '@tanstack/react-router'
import { auth } from '#/lib/auth'
import { enforceAuthRateLimit } from '#/lib/server/auth-rate-limit'
import { enforceSameOrigin } from '#/lib/server/same-origin'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const blockedResponse = enforceSameOrigin(request)
        if (blockedResponse) return blockedResponse
        return auth.handler(request)
      },
      POST: async ({ request }) => {
        const blockedResponse = enforceSameOrigin(request)
        if (blockedResponse) return blockedResponse
        const rateLimited = await enforceAuthRateLimit(request)
        if (rateLimited) return rateLimited
        return auth.handler(request)
      },
      OPTIONS: ({ request }) => {
        const blockedResponse = enforceSameOrigin(request)
        if (blockedResponse) return blockedResponse
        return new Response(null, { status: 204 })
      },
    },
  },
})
