import { auth } from '#/lib/auth'
import { AUTH_ROLES } from '#/lib/auth-roles'
import { DEFAULT_CURRENCY } from '#/lib/currency'
import { enforceRateLimit } from '#/lib/server/rate-limit'
import { enforceSameOrigin } from '#/lib/server/same-origin'

interface AuthenticatedUserContext {
  id: string
  currency: string
  role: string
}

/**
 * Runs shared request protections for API handlers.
 */
export function guardApiRequest(request: Request): Response | null {
  const sameOriginResponse = enforceSameOrigin(request)
  if (sameOriginResponse) return sameOriginResponse

  return enforceRateLimit(request)
}

/**
 * Returns authenticated user context for API handlers.
 */
export async function requireUserContext(request: Request): Promise<AuthenticatedUserContext | Response> {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  const user = session?.user as { id?: string; currency?: string; role?: string } | undefined
  if (!user?.id) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    )
  }

  return {
    id: user.id,
    currency: (user.currency ?? DEFAULT_CURRENCY).toUpperCase(),
    role: user.role ?? AUTH_ROLES.user,
  }
}

/**
 * Returns the authenticated user id for user-scoped API handlers.
 */
export async function requireUserId(request: Request): Promise<string | Response> {
  const userContext = await requireUserContext(request)
  if (userContext instanceof Response) return userContext
  return userContext.id
}

/**
 * Shared preflight response for API routes.
 */
export function buildOptionsResponse(request: Request): Response {
  const blockedResponse = guardApiRequest(request)
  if (blockedResponse) return blockedResponse
  return new Response(null, { status: 204 })
}

/**
 * Resolves the target user id while allowing admin overrides.
 */
export function resolveTargetUserId({
  requester,
  requestedUserId,
}: {
  requester: AuthenticatedUserContext
  requestedUserId?: string | null
}) {
  if (!requestedUserId || requestedUserId === requester.id) return requester.id
  if (requester.role !== AUTH_ROLES.admin) return requester.id
  return requestedUserId
}

/**
 * Resolves target user id and rejects non-admin cross-user access.
 */
export function assertTargetUserId({
  requester,
  requestedUserId,
}: {
  requester: AuthenticatedUserContext
  requestedUserId?: string | null
}): string | Response {
  if (!requestedUserId || requestedUserId === requester.id) return requester.id
  if (requester.role !== AUTH_ROLES.admin) {
    return Response.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }
  return requestedUserId
}
