import { createFileRoute } from '@tanstack/react-router'
import {
  createSecurityProfile,
  getSecurityProfileStatusForUser,
  updateSecurityProfile,
  verifyUserCurrentPassword,
} from '#/features/auth/server/user-security-repository'
import { RecoveryEmailInUseError } from '#/features/auth/errors/recovery-email-errors'
import {
  createSecurityProfileSchema,
  updateSecurityProfileSchema,
} from '#/features/auth/schemas/security-profile'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'

export const Route = createFileRoute('/api/auth/security-profile')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const profile = await getSecurityProfileStatusForUser(userContext.id)
        return Response.json({
          success: true,
          data: profile,
        })
      },
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

        const parsed = createSecurityProfileSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid security profile payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        try {
          await createSecurityProfile({
            userId: userContext.id,
            questionOneKey: parsed.data.questionOneKey,
            answerOne: parsed.data.answerOne,
          })

          const profile = await getSecurityProfileStatusForUser(userContext.id)
          return Response.json({ success: true, data: profile }, { status: 201 })
        } catch (error) {
          if (error instanceof RecoveryEmailInUseError) {
            return Response.json(
              {
                success: false,
                error: error.message,
                details: { fieldErrors: { recoveryEmail: [error.message] } },
              },
              { status: 409 },
            )
          }

          const isAlreadyExists = error instanceof Error && error.message.includes('already exists')
          console.error('[security-profile POST]', error)
          return Response.json(
            {
              success: false,
              error: isAlreadyExists
                ? 'A security profile already exists for this account'
                : 'Unable to save security profile. Please try again.',
            },
            { status: isAlreadyExists ? 409 : 500 },
          )
        }
      },
      PATCH: async ({ request }) => {
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

        const parsed = updateSecurityProfileSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid security profile payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const passwordValid = await verifyUserCurrentPassword(
          userContext.id,
          parsed.data.currentPassword,
        )

        if (!passwordValid) {
          return Response.json({ success: false, error: 'Current password is incorrect' }, { status: 403 })
        }

        try {
          await updateSecurityProfile({
            userId: userContext.id,
            questionOneKey: parsed.data.questionOneKey,
            answerOne: parsed.data.answerOne,
          })

          const profile = await getSecurityProfileStatusForUser(userContext.id)
          return Response.json({ success: true, data: profile })
        } catch (error) {
          if (error instanceof RecoveryEmailInUseError) {
            return Response.json(
              {
                success: false,
                error: error.message,
                details: { fieldErrors: { recoveryEmail: [error.message] } },
              },
              { status: 409 },
            )
          }

          console.error('[security-profile PATCH]', error)
          return Response.json({ success: false, error: 'Unable to update security profile. Please try again.' }, { status: 500 })
        }
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})
