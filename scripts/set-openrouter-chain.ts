/**
 * Writes the OpenRouter failover chain to the global AI settings row, in priority order.
 *
 * Usage:
 *   pnpm ai:chain          # local DB (.env.local / .env)
 *   pnpm ai:chain:prod     # production DB (.env.prod)
 *
 * Preserves the stored API key. If no OpenRouter key is set yet, provide one via
 * OPENROUTER_API_KEY in the env file before running.
 */
import { config } from 'dotenv'

const isProd = process.env.DRIZZLE_ENV === 'prod'
config({ path: isProd ? '.env.prod' : ['.env.local', '.env'], override: isProd })

async function main() {
  const { db } = await import('#/db/index')
  const { aiProviderSettings } = await import('#/db/schema')
  const { isNull } = await import('drizzle-orm')
  const {
    getGlobalAiSettings,
    upsertGlobalAiSettings,
  } = await import('#/features/admin/server/global-ai-settings-repository')
  const { OPENROUTER_DAILY_LIFE_MODEL_CHAIN } = await import(
    '#/features/settings/constants/openrouter-models'
  )
  const { OPENROUTER_DEFAULT_BASE_URL } = await import(
    '#/features/settings/constants/openrouter-defaults'
  )

  const chain = [...OPENROUTER_DAILY_LIFE_MODEL_CHAIN]
  const existing = await getGlobalAiSettings()

  const [globalRow] = await db
    .select({ updatedBy: aiProviderSettings.updatedBy })
    .from(aiProviderSettings)
    .where(isNull(aiProviderSettings.userId))
    .limit(1)

  const adminUserId = globalRow?.updatedBy ?? process.env.ADMIN_USER_ID?.trim()
  if (!adminUserId) {
    throw new Error(
      'No existing global settings to attribute the change to. Set ADMIN_USER_ID before running.',
    )
  }

  const hasStoredKey = existing?.provider === 'openrouter' && existing.hasApiKey
  const apiKey = process.env.OPENROUTER_API_KEY?.trim() || undefined
  if (!hasStoredKey && !apiKey) {
    throw new Error(
      'No OpenRouter API key stored and OPENROUTER_API_KEY is unset. Set it before running.',
    )
  }

  await upsertGlobalAiSettings({
    adminUserId,
    isEnabled: true,
    provider: 'openrouter',
    baseUrl: existing?.baseUrl || OPENROUTER_DEFAULT_BASE_URL,
    models: chain,
    apiKey,
  })

  const updated = await getGlobalAiSettings()
  console.log(`Updated global AI chain (${isProd ? 'prod' : 'local'}):`)
  console.log(JSON.stringify({ models: updated?.models, hasApiKey: updated?.hasApiKey }, null, 2))
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
