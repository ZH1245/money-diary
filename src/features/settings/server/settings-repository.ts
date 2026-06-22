import { eq } from 'drizzle-orm'
import { db } from '#/db/index'
import { user } from '#/db/auth-schema'
import { aiProviderSettings } from '#/db/schema'
import { decryptSecret, encryptSecret, maskSecret } from '#/lib/server/encryption'

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

export interface AiSettingsRecord {
  provider: string
  baseUrl: string
  model: string
  apiKeyMasked: string | null
  hasApiKey: boolean
}

export async function getUserAiSettings({ userId }: { userId: string }): Promise<AiSettingsRecord | null> {
  const [row] = await db
    .select()
    .from(aiProviderSettings)
    .where(eq(aiProviderSettings.userId, userId))
    .limit(1)

  if (!row) return null

  const baseUrl = decryptSecret(row.baseUrlEncrypted)
  const model = decryptSecret(row.modelEncrypted)
  const apiKey = row.apiKeyEncrypted ? decryptSecret(row.apiKeyEncrypted) : null

  return {
    provider: row.provider,
    baseUrl,
    model,
    apiKeyMasked: apiKey ? maskSecret(apiKey) : null,
    hasApiKey: Boolean(apiKey),
  }
}

export type AiProviderId = 'ollama' | 'gemini'

export async function upsertUserAiSettings({
  userId,
  provider,
  baseUrl,
  model,
  apiKey,
}: {
  userId: string
  provider: AiProviderId
  baseUrl: string
  model: string
  apiKey?: string | null
}) {
  const [existing] = await db
    .select({ id: aiProviderSettings.id })
    .from(aiProviderSettings)
    .where(eq(aiProviderSettings.userId, userId))
    .limit(1)

  const nextValues: {
    provider: AiProviderId
    baseUrlEncrypted: string
    modelEncrypted: string
    apiKeyEncrypted?: string | null
    updatedAt: Date
  } = {
    provider,
    baseUrlEncrypted: encryptSecret(baseUrl),
    modelEncrypted: encryptSecret(model),
    updatedAt: new Date(),
  }

  if (apiKey?.trim()) {
    nextValues.apiKeyEncrypted = encryptSecret(apiKey.trim())
  } else if (!existing) {
    nextValues.apiKeyEncrypted = null
  }

  if (!existing) {
    await db.insert(aiProviderSettings).values({
      userId,
      provider: nextValues.provider,
      baseUrlEncrypted: nextValues.baseUrlEncrypted,
      modelEncrypted: nextValues.modelEncrypted,
      apiKeyEncrypted: nextValues.apiKeyEncrypted ?? null,
      createdAt: new Date(),
      updatedAt: nextValues.updatedAt,
    })
  } else {
    const updatePayload =
      nextValues.apiKeyEncrypted !== undefined
        ? nextValues
        : {
            provider: nextValues.provider,
            baseUrlEncrypted: nextValues.baseUrlEncrypted,
            modelEncrypted: nextValues.modelEncrypted,
            updatedAt: nextValues.updatedAt,
          }

    await db
      .update(aiProviderSettings)
      .set(updatePayload)
      .where(eq(aiProviderSettings.userId, userId))
  }
}

export async function getUserAiSettingsForRuntime({ userId }: { userId: string }) {
  const [row] = await db
    .select()
    .from(aiProviderSettings)
    .where(eq(aiProviderSettings.userId, userId))
    .limit(1)

  if (!row) return null

  return {
    provider: row.provider,
    baseUrl: decryptSecret(row.baseUrlEncrypted),
    model: decryptSecret(row.modelEncrypted),
    apiKey: row.apiKeyEncrypted ? decryptSecret(row.apiKeyEncrypted) : null,
  }
}
