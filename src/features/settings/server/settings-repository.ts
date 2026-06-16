import { eq } from 'drizzle-orm'
import { db } from '#/db/index'
import { user } from '#/db/auth-schema'

/**
 * Updates user preferred currency and returns updated currency.
 */
export async function updateUserCurrency({
  userId,
  currency,
}: {
  userId: string
  currency: string
}) {
  const [updatedUser] = await db
    .update(user)
    .set({
      currency,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))
    .returning({
      currency: user.currency,
    })

  return updatedUser
}
