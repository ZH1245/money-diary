import { createFileRoute } from '@tanstack/react-router'
import { getRecoveryChallengeByEmail } from '#/features/auth/server/user-security-repository'
import { recoveryChallengeSchema } from '#/features/auth/schemas/security-profile'
import { buildOptionsResponse, guardApiRequest, rejectClientSuppliedUserId } from '#/lib/server/api-guards'
import { enforceRecoveryRateLimit } from '#/lib/server/recovery-rate-limit'

export const Route = createFileRoute('/api/auth/recovery/challenge')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const recoveryLimitResponse = enforceRecoveryRateLimit(request)
        if (recoveryLimitResponse) return recoveryLimitResponse

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const body = await request.json().catch(() => null)
        const bodyUserIdRejected = rejectClientSuppliedUserId(
          request,
          body && typeof body === 'object' ? (body as Record<string, unknown>) : null,
        )
        if (bodyUserIdRejected) return bodyUserIdRejected

        const parsed = recoveryChallengeSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid recovery challenge payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const challenge = await getRecoveryChallengeByEmail(parsed.data.email.toLowerCase())

        if (!challenge) {
          return Response.json({
            success: true,
            data: {
              available: false,
              message:
                'No recovery profile is set up for this email. Sign in and add recovery details in Settings if this is your account.',
            },
          })
        }

        return Response.json({
          success: true,
          data: {
            available: true,
            ...challenge,
          },
        })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})
