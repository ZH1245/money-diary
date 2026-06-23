import { auth } from '#/lib/auth'
import { AUTH_ROLES } from '#/lib/auth-roles'

/**
 * Validates that the current request belongs to an authenticated admin.
 */
export async function requireAdmin(request: Request): Promise<Response | null> {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session?.user) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const role = (session.user as { role?: string }).role
  if (role !== AUTH_ROLES.admin) {
    return Response.json(
      { success: false, error: 'Forbidden: admin access required' },
      { status: 403 },
    )
  }

  return null
}
