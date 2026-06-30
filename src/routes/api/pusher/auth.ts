import { createFileRoute } from '@tanstack/react-router'
import { buildOptionsResponse, guardApiRequest, requireUserContext } from '#/lib/server/api-guards'
import { getPusherServer } from '#/lib/server/pusher'

export const Route = createFileRoute('/api/pusher/auth')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const pusher = getPusherServer()
        if (!pusher) {
          return Response.json({ success: false, error: 'Realtime not enabled.' }, { status: 503 })
        }

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        // Pusher sends form-encoded: socket_id=xxx&channel_name=yyy
        let socketId: string | null = null
        let channelName: string | null = null

        const contentType = request.headers.get('content-type') ?? ''
        if (contentType.includes('application/x-www-form-urlencoded')) {
          const text = await request.text()
          const params = new URLSearchParams(text)
          socketId = params.get('socket_id')
          channelName = params.get('channel_name')
        } else {
          const body = await request.json().catch(() => null) as Record<string, string> | null
          socketId = body?.socket_id ?? null
          channelName = body?.channel_name ?? null
        }

        if (!socketId || !channelName) {
          return Response.json({ success: false, error: 'Missing socket_id or channel_name.' }, { status: 400 })
        }

        const auth = pusher.authorizeChannel(socketId, channelName, {
          user_id: userContext.id,
          user_info: {},
        })

        return Response.json(auth)
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})
