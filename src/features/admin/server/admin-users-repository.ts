import { desc, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import { user } from '#/db/auth-schema'
import { revokeAllUserSessions } from '#/features/auth/server/user-security-repository'
import type { AdminUserRecord, UserAccountStatus } from '#/features/admin/types/admin-user'
import { AUTH_ROLES } from '#/lib/auth-roles'

function toAdminUserRecord(row: typeof user.$inferSelect): AdminUserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    accountStatus: (row.accountStatus as UserAccountStatus) ?? 'active',
    moderationReason: row.moderationReason ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

/**
 * Lists application users for the admin moderation table.
 */
export async function listAdminUsers(): Promise<AdminUserRecord[]> {
  const rows = await db
    .select()
    .from(user)
    .orderBy(desc(user.createdAt))

  return rows.map(toAdminUserRecord)
}

/**
 * Returns moderation state for a single user.
 */
export async function getUserModerationState(userId: string): Promise<UserAccountStatus | null> {
  const [row] = await db
    .select({ accountStatus: user.accountStatus })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  if (!row) return null
  return (row.accountStatus as UserAccountStatus) ?? 'active'
}

/**
 * Returns moderation details for access enforcement.
 */
export async function getUserModerationDetails(userId: string) {
  const [row] = await db
    .select({
      accountStatus: user.accountStatus,
      moderationReason: user.moderationReason,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  if (!row) return null

  return {
    accountStatus: (row.accountStatus as UserAccountStatus) ?? 'active',
    moderationReason: row.moderationReason ?? null,
  }
}

async function assertAdminCanModerateTarget({
  adminUserId,
  targetUserId,
}: {
  adminUserId: string
  targetUserId: string
}) {
  if (adminUserId === targetUserId) {
    throw new Error('You cannot moderate your own account')
  }

  const [target] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1)

  if (!target) {
    throw new Error('User not found')
  }

  if (target.role === AUTH_ROLES.admin) {
    throw new Error('Admin accounts cannot be moderated from this screen')
  }
}

/**
 * Restricts a user account with a reason and revokes active sessions.
 */
export async function restrictAdminUser({
  adminUserId,
  targetUserId,
  reason,
}: {
  adminUserId: string
  targetUserId: string
  reason: string
}) {
  await assertAdminCanModerateTarget({ adminUserId, targetUserId })

  await db
    .update(user)
    .set({
      accountStatus: 'restricted',
      moderationReason: reason.trim(),
      moderatedAt: new Date(),
      moderatedBy: adminUserId,
      updatedAt: new Date(),
    })
    .where(eq(user.id, targetUserId))

  await revokeAllUserSessions(targetUserId)

  return getAdminUserById(targetUserId)
}

/**
 * Bans a user account with a reason and revokes active sessions.
 */
export async function banAdminUser({
  adminUserId,
  targetUserId,
  reason,
}: {
  adminUserId: string
  targetUserId: string
  reason: string
}) {
  await assertAdminCanModerateTarget({ adminUserId, targetUserId })

  await db
    .update(user)
    .set({
      accountStatus: 'banned',
      moderationReason: reason.trim(),
      moderatedAt: new Date(),
      moderatedBy: adminUserId,
      updatedAt: new Date(),
    })
    .where(eq(user.id, targetUserId))

  await revokeAllUserSessions(targetUserId)

  return getAdminUserById(targetUserId)
}

/**
 * Restores a restricted or banned user to active status.
 */
export async function restoreAdminUser({
  adminUserId,
  targetUserId,
}: {
  adminUserId: string
  targetUserId: string
}) {
  await assertAdminCanModerateTarget({ adminUserId, targetUserId })

  await db
    .update(user)
    .set({
      accountStatus: 'active',
      moderationReason: null,
      moderatedAt: null,
      moderatedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, targetUserId))

  return getAdminUserById(targetUserId)
}

/**
 * Permanently deletes a non-admin user and cascades related data.
 */
export async function deleteAdminUser({
  adminUserId,
  targetUserId,
}: {
  adminUserId: string
  targetUserId: string
}) {
  await assertAdminCanModerateTarget({ adminUserId, targetUserId })

  await revokeAllUserSessions(targetUserId)

  const result = await db
    .delete(user)
    .where(eq(user.id, targetUserId))
    .returning({ id: user.id })

  return result.length > 0
}

/**
 * Loads one user row for admin responses.
 */
export async function getAdminUserById(userId: string): Promise<AdminUserRecord | null> {
  const [row] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  if (!row) return null
  return toAdminUserRecord(row)
}

/**
 * Blocks sign-in for restricted or banned accounts by email lookup.
 */
export async function getSignInModerationBlock(email: string) {
  const [row] = await db
    .select({
      accountStatus: user.accountStatus,
      moderationReason: user.moderationReason,
    })
    .from(user)
    .where(eq(user.email, email.trim()))
    .limit(1)

  if (!row) return null

  const accountStatus = (row.accountStatus as UserAccountStatus) ?? 'active'
  if (accountStatus === 'active') return null

  return {
    accountStatus,
    moderationReason: row.moderationReason ?? 'Access to this account is not available.',
  }
}