import { and, desc, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import { paymentAccounts } from '#/db/schema'
import type { PaymentAccountType } from '#/features/payment-accounts/types/payment-account'
import { isProtectedPaymentAccount } from '#/features/payment-accounts/utils/protected-account'

interface CreateUserPaymentAccountParams {
  userId: string
  name: string
  institutionSlug: string | null
  accountType: PaymentAccountType
  lastFour: string | null
  note: string | null
}

/**
 * Ensures every user has a default cash account for quick "Saved to" / "Paid from" picks.
 */
export async function ensureDefaultCashAccount(userId: string) {
  const [existingCashAccount] = await db
    .select({ id: paymentAccounts.id })
    .from(paymentAccounts)
    .where(and(eq(paymentAccounts.userId, userId), eq(paymentAccounts.institutionSlug, 'cash')))
    .limit(1)

  if (existingCashAccount) return

  await createUserPaymentAccount({
    userId,
    name: 'Cash on hand',
    institutionSlug: 'cash',
    accountType: 'cash',
    lastFour: null,
    note: null,
  })
}

/**
 * Loads payment accounts belonging to a specific user.
 */
export async function getUserPaymentAccounts(userId: string) {
  await ensureDefaultCashAccount(userId)

  return db
    .select()
    .from(paymentAccounts)
    .where(eq(paymentAccounts.userId, userId))
    .orderBy(desc(paymentAccounts.createdAt))
}

/**
 * Loads one payment account owned by a user.
 */
export async function getUserPaymentAccountById(userId: string, paymentAccountId: number) {
  const [row] = await db
    .select()
    .from(paymentAccounts)
    .where(and(eq(paymentAccounts.userId, userId), eq(paymentAccounts.id, paymentAccountId)))
    .limit(1)

  return row ?? null
}

/**
 * Returns true when the payment account belongs to the user and is active.
 */
export async function isPaymentAccountAccessibleByUser({
  userId,
  paymentAccountId,
}: {
  userId: string
  paymentAccountId: number
}) {
  const account = await db
    .select({ id: paymentAccounts.id })
    .from(paymentAccounts)
    .where(and(eq(paymentAccounts.userId, userId), eq(paymentAccounts.id, paymentAccountId)))
    .limit(1)

  return account.length > 0
}

/**
 * Creates a payment account row for a user.
 */
export async function createUserPaymentAccount(params: CreateUserPaymentAccountParams) {
  const [row] = await db
    .insert(paymentAccounts)
    .values({
      userId: params.userId,
      name: params.name,
      institutionSlug: params.institutionSlug,
      accountType: params.accountType,
      lastFour: params.lastFour,
      note: params.note,
    })
    .returning()

  return row
}

/**
 * Updates a payment account row for a user.
 */
export async function updateUserPaymentAccount(params: {
  userId: string
  paymentAccountId: number
  name?: string
  institutionSlug?: string | null
  accountType?: PaymentAccountType
  lastFour?: string | null
  note?: string | null
  isActive?: boolean
}) {
  const [row] = await db
    .update(paymentAccounts)
    .set({
      ...(params.name !== undefined ? { name: params.name } : {}),
      ...(params.institutionSlug !== undefined ? { institutionSlug: params.institutionSlug } : {}),
      ...(params.accountType !== undefined ? { accountType: params.accountType } : {}),
      ...(params.lastFour !== undefined ? { lastFour: params.lastFour } : {}),
      ...(params.note !== undefined ? { note: params.note } : {}),
      ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(paymentAccounts.userId, params.userId), eq(paymentAccounts.id, params.paymentAccountId)))
    .returning()

  return row ?? null
}

/**
 * Deletes a payment account row for a user when it is not a protected default account.
 */
export async function deleteUserPaymentAccount(userId: string, paymentAccountId: number) {
  const existing = await getUserPaymentAccountById(userId, paymentAccountId)
  if (!existing) return null
  if (isProtectedPaymentAccount(existing)) return null

  const [row] = await db
    .delete(paymentAccounts)
    .where(and(eq(paymentAccounts.userId, userId), eq(paymentAccounts.id, paymentAccountId)))
    .returning({ id: paymentAccounts.id })

  return row ?? null
}
