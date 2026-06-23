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
  baseUrl: string | null
  model: string | null
  apiKeyMasked: string | null
  hasApiKey: boolean
  useGlobalProvider: boolean
}

export interface UserAiProviderPreference {
  useGlobalProvider: boolean
  hasCustomSettings: boolean
  hasStoredApiKey: boolean
  provider: string | null
}

/**
 * Reads AI source preference without decrypting stored credentials.
 * Safe for legacy rows when ENV_SECRETS no longer matches old ciphertext.
 */
export async function getUserAiProviderPreference({
  userId,
}: {
  userId: string
}): Promise<UserAiProviderPreference> {
  const [row] = await db
    .select({
      useGlobalProvider: aiProviderSettings.useGlobalProvider,
      baseUrlEncrypted: aiProviderSettings.baseUrlEncrypted,
      modelEncrypted: aiProviderSettings.modelEncrypted,
      apiKeyEncrypted: aiProviderSettings.apiKeyEncrypted,
      provider: aiProviderSettings.provider,
    })
    .from(aiProviderSettings)
    .where(eq(aiProviderSettings.userId, userId))
    .limit(1)

  if (!row) {
    return {
      useGlobalProvider: true,
      hasCustomSettings: false,
      hasStoredApiKey: false,
      provider: null,
    }
  }

  return {
    useGlobalProvider: row.useGlobalProvider,
    hasCustomSettings: Boolean(row.baseUrlEncrypted && row.modelEncrypted),
    hasStoredApiKey: Boolean(row.apiKeyEncrypted),
    provider: row.provider,
  }
}

/**
 * Loads decrypted user AI settings, returning a user-facing decrypt warning instead of throwing.
 */
export async function tryGetUserAiSettings({ userId }: { userId: string }): Promise<{
  settings: AiSettingsRecord | null
  decryptError: string | null
}> {
  try {
    const settings = await getUserAiSettings({ userId })
    return { settings, decryptError: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load AI settings'

    if (message.includes('Invalid encrypted payload')) {
      return {
        settings: null,
        decryptError:
          'Saved AI settings could not be decrypted. ENV_SECRETS may have changed — re-save your provider settings.',
      }
    }

    throw error
  }
}

export async function getUserAiSettings({ userId }: { userId: string }): Promise<AiSettingsRecord | null> {
  const [row] = await db
    .select()
    .from(aiProviderSettings)
    .where(eq(aiProviderSettings.userId, userId))
    .limit(1)

  if (!row) return null

  const baseUrl = row.baseUrlEncrypted ? decryptSecret(row.baseUrlEncrypted) : null
  const model = row.modelEncrypted ? decryptSecret(row.modelEncrypted) : null
  const apiKey = row.apiKeyEncrypted ? decryptSecret(row.apiKeyEncrypted) : null

  return {
    provider: row.provider,
    baseUrl,
    model,
    apiKeyMasked: apiKey ? maskSecret(apiKey) : null,
    hasApiKey: Boolean(apiKey),
    useGlobalProvider: row.useGlobalProvider,
  }
}

import { parseLiveAiProviderId, type LiveAiProviderId } from '#/features/settings/constants/ai-provider-ids'

export type AiProviderId = LiveAiProviderId

export async function upsertUserAiSettings({
  userId,
  provider,
  baseUrl,
  model,
  apiKey,
  useGlobalProvider = false,
}: {
  userId: string
  provider: AiProviderId
  baseUrl: string
  model: string
  apiKey?: string | null
  useGlobalProvider?: boolean
}) {
  const [existing] = await db
    .select({ id: aiProviderSettings.id })
    .from(aiProviderSettings)
    .where(eq(aiProviderSettings.userId, userId))
    .limit(1)

  const nextValues: {
    provider: AiProviderId
    useGlobalProvider: boolean
    baseUrlEncrypted: string
    modelEncrypted: string
    apiKeyEncrypted?: string | null
    updatedAt: Date
  } = {
    provider,
    useGlobalProvider,
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
      useGlobalProvider: nextValues.useGlobalProvider,
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
            useGlobalProvider: nextValues.useGlobalProvider,
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

/**
 * Sets whether the user relies on the app-wide AI provider or their own credentials.
 */
export async function setUserAiProviderSource({
  userId,
  useGlobalProvider,
}: {
  userId: string
  useGlobalProvider: boolean
}) {
  const [existing] = await db
    .select({ id: aiProviderSettings.id })
    .from(aiProviderSettings)
    .where(eq(aiProviderSettings.userId, userId))
    .limit(1)

  if (!existing) {
    await db.insert(aiProviderSettings).values({
      userId,
      provider: 'gemini',
      useGlobalProvider,
      baseUrlEncrypted: null,
      modelEncrypted: null,
      apiKeyEncrypted: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    return
  }

  await db
    .update(aiProviderSettings)
    .set({
      useGlobalProvider,
      updatedAt: new Date(),
    })
    .where(eq(aiProviderSettings.userId, userId))
}

/**
 * Removes the stored AI provider API key for one user.
 */
export async function clearUserAiApiKey({ userId }: { userId: string }): Promise<boolean> {
  const result = await db
    .update(aiProviderSettings)
    .set({
      apiKeyEncrypted: null,
      updatedAt: new Date(),
    })
    .where(eq(aiProviderSettings.userId, userId))
    .returning({ id: aiProviderSettings.id })

  return result.length > 0
}

export async function getUserAiSettingsForRuntime({ userId }: { userId: string }) {
  const [row] = await db
    .select()
    .from(aiProviderSettings)
    .where(eq(aiProviderSettings.userId, userId))
    .limit(1)

  if (!row) return null

  const provider = parseLiveAiProviderId(row.provider)

  return {
    provider,
    useGlobalProvider: row.useGlobalProvider,
    baseUrl: row.baseUrlEncrypted ? decryptSecret(row.baseUrlEncrypted) : null,
    model: row.modelEncrypted ? decryptSecret(row.modelEncrypted) : null,
    apiKey: row.apiKeyEncrypted ? decryptSecret(row.apiKeyEncrypted) : null,
  }
}
