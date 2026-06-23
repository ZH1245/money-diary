import { createFileRoute } from '@tanstack/react-router'
import { resetPasswordWithSecurityAnswers } from '#/features/auth/server/user-security-repository'
import { recoveryResetSchema } from '#/features/auth/schemas/security-profile'
import { buildOptionsResponse, guardApiRequest, rejectClientSuppliedUserId } from '#/lib/server/api-guards'
import { enforceRecoveryRateLimit } from '#/lib/server/recovery-rate-limit'

const GENERIC_RESET_FAILURE =
  'Unable to reset password. Check your email and security answers, then try again.'

export const Route = createFileRoute('/api/auth/recovery/reset')({
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

        const parsed = recoveryResetSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid password reset payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const result = await resetPasswordWithSecurityAnswers({
          email: parsed.data.email.toLowerCase(),
          recoveryEmail: parsed.data.recoveryEmail,
          answerOne: parsed.data.answerOne,
          newPassword: parsed.data.newPassword,
        })

        if (result !== 'reset') {
          return Response.json({ success: false, error: GENERIC_RESET_FAILURE }, { status: 403 })
        }

        return Response.json({
          success: true,
          data: { message: 'Password updated. You can sign in with your new password.' },
        })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})
