import { createFileRoute } from '@tanstack/react-router'
import { getSignInModerationBlock } from '#/features/admin/server/admin-users-repository'
import { buildOptionsResponse, guardApiRequest } from '#/lib/server/api-guards'
import { z } from 'zod'

const signInModerationSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
})

export const Route = createFileRoute('/api/auth/sign-in-moderation')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const body = await request.json().catch(() => null)
        const parsed = signInModerationSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid email', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        try {
          const block = await getSignInModerationBlock(parsed.data.email)
          if (!block) {
            return Response.json({ success: true, data: { allowed: true } })
          }

          return Response.json({
            success: true,
            data: {
              allowed: false,
              accountStatus: block.accountStatus,
              moderationReason: block.moderationReason,
            },
          })
        } catch (error) {
          console.error('[sign-in-moderation POST]', error)
          return Response.json({ success: false, error: 'Unable to check account status.' }, { status: 500 })
        }
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})
