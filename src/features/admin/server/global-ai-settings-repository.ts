import { isNull } from 'drizzle-orm'
import { db } from '#/db/index'
import { aiProviderSettings } from '#/db/schema'
import { decryptSecret, encryptSecret, maskSecret } from '#/lib/server/encryption'

import { parseLiveAiProviderId, type LiveAiProviderId } from '#/features/settings/constants/ai-provider-ids'
import { parseAiModelConfig, serializeAiModelConfig } from '#/features/settings/utils/ai-model-config'

export type GlobalAiProviderId = LiveAiProviderId

export interface GlobalAiSettingsRecord {
  isEnabled: boolean
  provider: string
  baseUrl: string
  model: string
  models: string[]
  hasApiKey: boolean
  apiKeyMasked: string | null
  updatedAt: string | null
}

export interface GlobalAiRuntimeSettings {
  isEnabled: boolean
  provider: GlobalAiProviderId
  baseUrl: string
  model: string
  models: string[]
  apiKey: string | null
}

/** Global AI config is the single row in ai_provider_settings where user_id IS NULL. */
function globalAiSettingsWhere() {
  return isNull(aiProviderSettings.userId)
}

/**
 * Returns public global AI settings for admin UI (includes masked key only).
 */
export async function getGlobalAiSettings(): Promise<GlobalAiSettingsRecord | null> {
  const [row] = await db
    .select()
    .from(aiProviderSettings)
    .where(globalAiSettingsWhere())
    .limit(1)

  if (!row?.baseUrlEncrypted || !row.modelEncrypted) return null

  const apiKey = row.apiKeyEncrypted ? decryptSecret(row.apiKeyEncrypted) : null
  const models = parseAiModelConfig(decryptSecret(row.modelEncrypted))

  return {
    isEnabled: row.isEnabled,
    provider: row.provider,
    baseUrl: decryptSecret(row.baseUrlEncrypted),
    model: models[0] ?? '',
    models,
    hasApiKey: Boolean(apiKey),
    apiKeyMasked: apiKey ? maskSecret(apiKey) : null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  }
}

/**
 * Returns decrypted global AI settings for server runtime use only.
 */
export async function getGlobalAiSettingsForRuntime(): Promise<GlobalAiRuntimeSettings | null> {
  const [row] = await db
    .select()
    .from(aiProviderSettings)
    .where(globalAiSettingsWhere())
    .limit(1)

  if (!row?.baseUrlEncrypted || !row.modelEncrypted) return null

  const models = parseAiModelConfig(decryptSecret(row.modelEncrypted))

  return {
    isEnabled: row.isEnabled,
    provider: parseLiveAiProviderId(row.provider),
    baseUrl: decryptSecret(row.baseUrlEncrypted),
    model: models[0] ?? '',
    models,
    apiKey: row.apiKeyEncrypted ? decryptSecret(row.apiKeyEncrypted) : null,
  }
}

/**
 * Returns whether a global AI provider is configured and enabled for users.
 */
export async function getGlobalAiPublicStatus(): Promise<{
  available: boolean
  enabled: boolean
  provider: string | null
  model: string | null
  models: string[] | null
}> {
  const settings = await getGlobalAiSettings()
  if (!settings) {
    return { available: false, enabled: false, provider: null, model: null, models: null }
  }

  return {
    available: true,
    enabled: settings.isEnabled,
    provider: settings.provider,
    model: settings.model,
    models: settings.models,
  }
}

/**
 * Creates or updates the singleton global AI provider settings row.
 */
export async function upsertGlobalAiSettings({
  adminUserId,
  isEnabled,
  provider,
  baseUrl,
  model,
  models,
  apiKey,
}: {
  adminUserId: string
  isEnabled: boolean
  provider: GlobalAiProviderId
  baseUrl: string
  model?: string
  models?: string[]
  apiKey?: string | null
}) {
  const modelChain = (models?.length ? models : model ? [model] : []).map((entry) => entry.trim()).filter(Boolean)
  if (modelChain.length === 0) {
    throw new Error('At least one model is required')
  }

  const [existing] = await db
    .select({ id: aiProviderSettings.id, apiKeyEncrypted: aiProviderSettings.apiKeyEncrypted })
    .from(aiProviderSettings)
    .where(globalAiSettingsWhere())
    .limit(1)

  const nextValues = {
    isEnabled,
    provider,
    baseUrlEncrypted: encryptSecret(baseUrl),
    modelEncrypted: encryptSecret(serializeAiModelConfig(modelChain)),
    updatedBy: adminUserId,
    updatedAt: new Date(),
    useGlobalProvider: false,
  }

  let apiKeyEncrypted: string | null | undefined
  if (apiKey?.trim()) {
    apiKeyEncrypted = encryptSecret(apiKey.trim())
  } else if (!existing) {
    apiKeyEncrypted = null
  }

  if (!existing) {
    await db.insert(aiProviderSettings).values({
      userId: null,
      ...nextValues,
      apiKeyEncrypted: apiKeyEncrypted ?? null,
      createdAt: new Date(),
    })
    return
  }

  const updatePayload =
    apiKeyEncrypted !== undefined
      ? { ...nextValues, apiKeyEncrypted }
      : nextValues

  await db
    .update(aiProviderSettings)
    .set(updatePayload)
    .where(globalAiSettingsWhere())
}

/**
 * Removes the stored global AI API key.
 */
export async function clearGlobalAiApiKey(): Promise<boolean> {
  const result = await db
    .update(aiProviderSettings)
    .set({
      apiKeyEncrypted: null,
      updatedAt: new Date(),
    })
    .where(globalAiSettingsWhere())
    .returning({ id: aiProviderSettings.id })

  return result.length > 0
}
