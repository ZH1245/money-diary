import { createFileRoute } from '@tanstack/react-router'
import {
  banAdminUser,
  deleteAdminUser,
  restoreAdminUser,
  restrictAdminUser,
} from '#/features/admin/server/admin-users-repository'
import { moderateAdminUserSchema } from '#/features/admin/schemas/admin-user'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'
import { requireAdmin } from '#/lib/server/admin-guard'

export const Route = createFileRoute('/api/admin/users/$id')({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const adminResponse = await requireAdmin(request)
        if (adminResponse) return adminResponse

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

        const parsed = moderateAdminUserSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid moderation payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        try {
          const data =
            parsed.data.action === 'restrict'
              ? await restrictAdminUser({
                  adminUserId: userContext.id,
                  targetUserId: params.id,
                  reason: parsed.data.reason,
                })
              : parsed.data.action === 'ban'
                ? await banAdminUser({
                    adminUserId: userContext.id,
                    targetUserId: params.id,
                    reason: parsed.data.reason,
                  })
                : await restoreAdminUser({
                    adminUserId: userContext.id,
                    targetUserId: params.id,
                  })

          if (!data) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404 })
          }

          return Response.json({ success: true, data })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to update user moderation'
          return Response.json({ success: false, error: message }, { status: 400 })
        }
      },
      DELETE: async ({ request, params }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const adminResponse = await requireAdmin(request)
        if (adminResponse) return adminResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        try {
          const deleted = await deleteAdminUser({
            adminUserId: userContext.id,
            targetUserId: params.id,
          })

          if (!deleted) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404 })
          }

          return Response.json({ success: true, data: { id: params.id } })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to delete user'
          return Response.json({ success: false, error: message }, { status: 400 })
        }
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})
