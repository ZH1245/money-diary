import { createFileRoute } from '@tanstack/react-router'
import { accountHasRecoveryProfile } from '#/features/auth/server/user-security-repository'
import { recoveryChallengeSchema } from '#/features/auth/schemas/security-profile'
import { buildOptionsResponse, guardApiRequest, rejectClientSuppliedUserId } from '#/lib/server/api-guards'
import { enforceRecoveryRateLimit } from '#/lib/server/recovery-rate-limit'

export const Route = createFileRoute('/api/auth/recovery/challenge')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const recoveryLimitResponse = await enforceRecoveryRateLimit(request)
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

        const available = await accountHasRecoveryProfile(parsed.data.email.toLowerCase())

        return Response.json({
          success: true,
          data: {
            available,
            message: available
              ? undefined
              : 'No recovery profile is set up for this email. Sign in and complete account recovery setup if this is your account.',
          },
        })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})
