import { auth } from '#/lib/auth'
import { DEFAULT_CURRENCY } from '#/lib/currency'
import { enforceSameOrigin } from '#/lib/server/same-origin'

interface AuthenticatedUserContext {
  id: string
  currency: string
}

/**
 * Runs shared request protections for API handlers.
 */
export function guardApiRequest(request: Request): Response | null {
  return enforceSameOrigin(request)
}

/**
 * Returns authenticated user context for API handlers.
 */
export async function requireUserContext(request: Request): Promise<AuthenticatedUserContext | Response> {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  const user = session?.user as { id?: string; currency?: string } | undefined
  if (!user?.id) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    )
  }

  return {
    id: user.id,
    currency: (user.currency ?? DEFAULT_CURRENCY).toUpperCase(),
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
