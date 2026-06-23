import { createFileRoute } from '@tanstack/react-router'
import { changePasswordForAuthenticatedUser } from '#/features/auth/server/user-security-repository'
import { changePasswordSchema } from '#/features/auth/schemas/security-profile'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'

export const Route = createFileRoute('/api/auth/change-password')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const body = await request.json().catch(() => null)
        const bodyUserIdRejected = rejectClientSuppliedUserId(
          request,
          body && typeof body === 'object' ? (body as Record<string, unknown>) : null,
        )
        if (bodyUserIdRejected) return bodyUserIdRejected

        const parsed = changePasswordSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid password change payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const result = await changePasswordForAuthenticatedUser({
          userId: userContext.id,
          currentPassword: parsed.data.currentPassword,
          newPassword: parsed.data.newPassword,
          recoveryEmail: parsed.data.recoveryEmail,
          answerOne: parsed.data.answerOne,
        })

        if (result === 'invalid_current_password') {
          return Response.json({ success: false, error: 'Current password is incorrect' }, { status: 403 })
        }

        if (result === 'recovery_verification_required') {
          return Response.json(
            { success: false, error: 'Enter your recovery email and security answer' },
            { status: 400 },
          )
        }

        if (result === 'invalid_recovery_verification') {
          return Response.json(
            { success: false, error: 'Recovery verification failed. Check your details and try again.' },
            { status: 403 },
          )
        }

        return Response.json({
          success: true,
          data: {
            message: 'Password updated. Sign in again on all devices.',
            sessionsRevoked: true,
          },
        })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})
