import { eq, sql } from 'drizzle-orm'
import { hashPassword, verifyPassword } from 'better-auth/crypto'
import { db } from '#/db/index'
import { account, session, user, userSecurityProfile } from '#/db/auth-schema'
import { getSecurityQuestionLabel } from '#/features/auth/constants/security-questions'
import {
  normalizeRecoveryEmail,
  RecoveryEmailInUseError,
} from '#/features/auth/errors/recovery-email-errors'
import { hashSecurityAnswer, verifySecurityAnswer } from '#/lib/server/security-answer'

export interface SecurityProfileRecord {
  recoveryEmail: string
  recoveryEmailVerified: boolean
  questionOneKey: string
  questionOneLabel: string
  hasProfile: boolean
}

export interface SecurityProfileStatus {
  hasProfile: true
}

/**
 * Returns whether the user has configured account recovery, without exposing recovery details.
 */
export async function getSecurityProfileStatusForUser(userId: string): Promise<SecurityProfileStatus | null> {
  const [row] = await db
    .select({ userId: userSecurityProfile.userId })
    .from(userSecurityProfile)
    .where(eq(userSecurityProfile.userId, userId))
    .limit(1)

  if (!row) return null

  return { hasProfile: true }
}

/**
 * Loads the full security profile for server-side verification only.
 */
async function getSecurityProfileRecordForUser(userId: string): Promise<SecurityProfileRecord | null> {
  const [row] = await db
    .select()
    .from(userSecurityProfile)
    .where(eq(userSecurityProfile.userId, userId))
    .limit(1)

  if (!row) return null

  return {
    recoveryEmail: row.recoveryEmail,
    recoveryEmailVerified: row.recoveryEmailVerified,
    questionOneKey: row.questionOneKey,
    questionOneLabel: getSecurityQuestionLabel(row.questionOneKey),
    hasProfile: true,
  }
}

/** @deprecated Use getSecurityProfileStatusForUser for API responses. */
export async function getSecurityProfileForUser(userId: string): Promise<SecurityProfileRecord | null> {
  return getSecurityProfileRecordForUser(userId)
}

/**
 * Verifies recovery email and security answer against the stored profile.
 */
async function verifyRecoveryCredentials({
  profile,
  recoveryEmail,
  answerOne,
}: {
  profile: typeof userSecurityProfile.$inferSelect
  recoveryEmail: string
  answerOne: string
}): Promise<boolean> {
  const normalizedRecoveryEmail = normalizeRecoveryEmail(recoveryEmail)
  if (normalizeRecoveryEmail(profile.recoveryEmail) !== normalizedRecoveryEmail) {
    return false
  }

  return verifySecurityAnswer(answerOne, profile.answerOneHash)
}

/**
 * Ensures a recovery email is not already linked to another account.
 */
async function assertRecoveryEmailAvailable({
  recoveryEmail,
  excludeUserId,
}: {
  recoveryEmail: string
  excludeUserId?: string
}) {
  const normalizedEmail = normalizeRecoveryEmail(recoveryEmail)

  const [existing] = await db
    .select({ userId: userSecurityProfile.userId })
    .from(userSecurityProfile)
    .where(
      excludeUserId
        ? sql`lower(${userSecurityProfile.recoveryEmail}) = ${normalizedEmail} AND ${userSecurityProfile.userId} <> ${excludeUserId}`
        : sql`lower(${userSecurityProfile.recoveryEmail}) = ${normalizedEmail}`,
    )
    .limit(1)

  if (existing) {
    throw new RecoveryEmailInUseError()
  }
}

/**
 * Creates a security profile for a newly registered user.
 * Recovery email is always the account sign-in email.
 */
export async function createSecurityProfile({
  userId,
  questionOneKey,
  answerOne,
}: {
  userId: string
  questionOneKey: string
  answerOne: string
}) {
  const [existing] = await db
    .select({ userId: userSecurityProfile.userId })
    .from(userSecurityProfile)
    .where(eq(userSecurityProfile.userId, userId))
    .limit(1)

  if (existing) {
    throw new Error('Security profile already exists')
  }

  const [foundUser] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  if (!foundUser?.email) {
    throw new Error('Account email not found')
  }

  const normalizedRecoveryEmail = normalizeRecoveryEmail(foundUser.email)
  await assertRecoveryEmailAvailable({ recoveryEmail: normalizedRecoveryEmail })

  const answerOneHash = await hashSecurityAnswer(answerOne)

  await db.insert(userSecurityProfile).values({
    userId,
    recoveryEmail: normalizedRecoveryEmail,
    recoveryEmailVerified: false,
    questionOneKey,
    answerOneHash,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

/**
 * Updates recovery details for an authenticated user after password verification.
 */
export async function updateSecurityProfile({
  userId,
  questionOneKey,
  answerOne,
}: {
  userId: string
  questionOneKey?: string
  answerOne?: string
}) {
  const [existing] = await db
    .select()
    .from(userSecurityProfile)
    .where(eq(userSecurityProfile.userId, userId))
    .limit(1)

  if (!existing) {
    throw new Error('Security profile not found')
  }

  const nextValues: Partial<typeof userSecurityProfile.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (questionOneKey && answerOne) {
    nextValues.questionOneKey = questionOneKey
    nextValues.answerOneHash = await hashSecurityAnswer(answerOne)
  }

  await db.update(userSecurityProfile).set(nextValues).where(eq(userSecurityProfile.userId, userId))
}

/**
 * Checks whether an account email has recovery configured, without exposing recovery details.
 */
export async function accountHasRecoveryProfile(email: string): Promise<boolean> {
  const [foundUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`lower(${user.email}) = ${email.toLowerCase()}`)
    .limit(1)
  if (!foundUser) return false

  const status = await getSecurityProfileStatusForUser(foundUser.id)
  return Boolean(status)
}

/**
 * Verifies recovery credentials and resets the account password.
 */
export async function resetPasswordWithSecurityAnswers({
  email,
  recoveryEmail,
  answerOne,
  newPassword,
}: {
  email: string
  recoveryEmail: string
  answerOne: string
  newPassword: string
}): Promise<'reset' | 'invalid'> {
  const [foundUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`lower(${user.email}) = ${email.toLowerCase()}`)
    .limit(1)
  if (!foundUser) return 'invalid'

  const [profile] = await db
    .select()
    .from(userSecurityProfile)
    .where(eq(userSecurityProfile.userId, foundUser.id))
    .limit(1)

  if (!profile) return 'invalid'

  const recoveryValid = await verifyRecoveryCredentials({
    profile,
    recoveryEmail,
    answerOne,
  })
  if (!recoveryValid) return 'invalid'

  const [credentialAccount] = await db
    .select({ id: account.id, password: account.password })
    .from(account)
    .where(eq(account.userId, foundUser.id))
    .limit(1)

  if (!credentialAccount?.password) return 'invalid'

  const nextPasswordHash = await hashPassword(newPassword)

  await db
    .update(account)
    .set({
      password: nextPasswordHash,
      updatedAt: new Date(),
    })
    .where(eq(account.id, credentialAccount.id))

  await revokeAllUserSessions(foundUser.id)

  return 'reset'
}

export type ChangePasswordResult =
  | 'success'
  | 'invalid_current_password'
  | 'invalid_recovery_verification'
  | 'recovery_verification_required'

/**
 * Deletes every active session for a user so they must sign in again on all devices.
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  await db.delete(session).where(eq(session.userId, userId))
}

/**
 * Changes a signed-in user's password after verifying current password and security answer.
 */
export async function changePasswordForAuthenticatedUser({
  userId,
  currentPassword,
  newPassword,
  recoveryEmail,
  answerOne,
}: {
  userId: string
  currentPassword: string
  newPassword: string
  recoveryEmail?: string
  answerOne?: string
}): Promise<ChangePasswordResult> {
  const currentValid = await verifyUserCurrentPassword(userId, currentPassword)
  if (!currentValid) {
    return 'invalid_current_password'
  }

  const [profile] = await db
    .select()
    .from(userSecurityProfile)
    .where(eq(userSecurityProfile.userId, userId))
    .limit(1)

  if (profile) {
    if (!recoveryEmail?.trim() || !answerOne?.trim()) {
      return 'recovery_verification_required'
    }

    const recoveryValid = await verifyRecoveryCredentials({
      profile,
      recoveryEmail,
      answerOne,
    })
    if (!recoveryValid) {
      return 'invalid_recovery_verification'
    }
  }

  const [credentialAccount] = await db
    .select({ id: account.id })
    .from(account)
    .where(eq(account.userId, userId))
    .limit(1)

  if (!credentialAccount) {
    return 'invalid_current_password'
  }

  const nextPasswordHash = await hashPassword(newPassword)

  await db
    .update(account)
    .set({
      password: nextPasswordHash,
      updatedAt: new Date(),
    })
    .where(eq(account.id, credentialAccount.id))

  await revokeAllUserSessions(userId)

  return 'success'
}

/**
 * Verifies a user's current password before sensitive security profile changes.
 */
export async function verifyUserCurrentPassword(userId: string, currentPassword: string): Promise<boolean> {
  const [credentialAccount] = await db
    .select({ password: account.password })
    .from(account)
    .where(eq(account.userId, userId))
    .limit(1)

  if (!credentialAccount?.password) return false

  return verifyPassword({
    password: currentPassword,
    hash: credentialAccount.password,
  })
}
