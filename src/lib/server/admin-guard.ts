import { auth } from '#/lib/auth'
import { AUTH_ROLES } from '#/lib/auth-roles'

const UNAUTHORIZED_RESPONSE = Response.json(
  { success: false, error: 'Unauthorized' },
  { status: 401 },
)

const FORBIDDEN_RESPONSE = Response.json(
  { success: false, error: 'Forbidden: admin access required' },
  { status: 403 },
)

/**
 * Validates that the current request belongs to an authenticated admin.
 */
export async function requireAdmin(request: Request): Promise<Response | null> {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session?.user) return UNAUTHORIZED_RESPONSE

  const role = (session.user as { role?: string }).role
  if (role !== AUTH_ROLES.admin) return FORBIDDEN_RESPONSE

  return null
}
