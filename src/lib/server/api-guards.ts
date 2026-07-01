import { auth } from '#/lib/auth'
import { AUTH_ROLES } from '#/lib/auth-roles'
import { DEFAULT_CURRENCY } from '#/lib/currency'
import { enforceRateLimit } from '#/lib/server/rate-limit'
import { resolveRequestTimeZone } from '#/lib/server/request-timezone'
import { enforceSameOrigin } from '#/lib/server/same-origin'

interface AuthenticatedUserContext {
  id: string
  currency: string
  role: string
  timezone: string
}

interface SessionUserFields {
  id?: string
  currency?: string
  role?: string
  accountStatus?: string
  moderationReason?: string | null
}

/**
 * Runs shared request protections for API handlers.
 */
export async function guardApiRequest(request: Request): Promise<Response | null> {
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

  const user = session?.user as SessionUserFields | undefined
  if (!user?.id) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    )
  }

  const role = user.role ?? AUTH_ROLES.user
  if (role !== AUTH_ROLES.admin) {
    const accountStatus = user.accountStatus ?? 'active'
    if (accountStatus !== 'active') {
      return Response.json(
        {
          success: false,
          error: user.moderationReason?.trim() || 'Access to this account is not available.',
          accountStatus,
          moderationReason: user.moderationReason ?? null,
        },
        { status: 403 },
      )
    }
  }

  return {
    id: user.id,
    currency: (user.currency ?? DEFAULT_CURRENCY).toUpperCase(),
    role,
    timezone: resolveRequestTimeZone(request),
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
export async function buildOptionsResponse(request: Request): Promise<Response> {
  const blockedResponse = await guardApiRequest(request)
  if (blockedResponse) return blockedResponse
  return new Response(null, { status: 204 })
}

/**
 * Rejects API calls that try to scope data with a client-supplied userId.
 * All user data access must come from the authenticated session only.
 */
export function rejectClientSuppliedUserId(
  request: Request,
  body?: Record<string, unknown> | null,
): Response | null {
  const url = new URL(request.url)
  if (url.searchParams.has('userId')) {
    return Response.json(
      { success: false, error: 'userId must not be supplied in query parameters' },
      { status: 400 },
    )
  }

  if (body && Object.prototype.hasOwnProperty.call(body, 'userId')) {
    return Response.json(
      { success: false, error: 'userId must not be supplied in request body' },
      { status: 400 },
    )
  }

  return null
}
