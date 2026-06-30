import { createFileRoute } from '@tanstack/react-router'
import {
  confirmDraftTransaction,
  discardDraftTransaction,
  getUserTransactionById,
} from '#/features/transactions/server/transactions-repository'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'
import { parseRouteId } from '#/lib/server/parse-route-id'

export const Route = createFileRoute('/api/transactions/drafts/$id')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext
        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const transactionId = parseRouteId(params.id)
        if (!transactionId) {
          return Response.json({ success: false, error: 'Invalid transaction id' }, { status: 400 })
        }

        const existing = await getUserTransactionById(userContext.id, transactionId)
        if (!existing || existing.status !== 'draft') {
          return Response.json({ success: false, error: 'Draft transaction not found' }, { status: 404 })
        }

        const row = await confirmDraftTransaction(userContext.id, transactionId)
        if (!row) {
          return Response.json({ success: false, error: 'Could not confirm draft' }, { status: 500 })
        }

        return Response.json({ success: true, data: row })
      },
      DELETE: async ({ request, params }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext
        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const transactionId = parseRouteId(params.id)
        if (!transactionId) {
          return Response.json({ success: false, error: 'Invalid transaction id' }, { status: 400 })
        }

        const existing = await getUserTransactionById(userContext.id, transactionId)
        if (!existing || existing.status !== 'draft') {
          return Response.json({ success: false, error: 'Draft transaction not found' }, { status: 404 })
        }

        const deleted = await discardDraftTransaction(userContext.id, transactionId)
        if (!deleted) {
          return Response.json({ success: false, error: 'Could not discard draft' }, { status: 500 })
        }

        return Response.json({ success: true, data: deleted })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})
