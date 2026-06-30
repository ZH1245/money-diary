import {
  getGlobalAiSettingsForRuntime,
  getGlobalAiPublicStatus,
} from '#/features/admin/server/global-ai-settings-repository'
import {
  getUserAiProviderPreference,
  getUserAiSettingsForRuntime,
  type AiProviderId,
} from '#/features/settings/server/settings-repository'
import { parseAiModelConfig } from '#/features/settings/utils/ai-model-config'

export interface ResolvedAiProviderSettings {
  source: 'global' | 'custom' | 'default'
  provider: AiProviderId
  baseUrl: string
  model: string
  models: string[]
  apiKey: string | null
}

function toResolvedSettings({
  source,
  provider,
  baseUrl,
  modelRaw,
  models,
  apiKey,
}: {
  source: ResolvedAiProviderSettings['source']
  provider: AiProviderId
  baseUrl: string
  modelRaw: string
  models?: string[]
  apiKey: string | null
}): ResolvedAiProviderSettings {
  const chain = models?.length ? models : parseAiModelConfig(modelRaw)
  return {
    source,
    provider,
    baseUrl,
    model: chain[0] ?? modelRaw,
    models: chain.length > 0 ? chain : [modelRaw],
    apiKey,
  }
}

const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434'
const DEFAULT_OLLAMA_MODEL = 'qwen3.5:4b'

/**
 * Resolves which AI provider credentials to use: user custom, global app service, or defaults.
 */
export async function resolveAiProviderForUser(userId: string): Promise<ResolvedAiProviderSettings> {
  const [userSettings, globalSettings] = await Promise.all([
    getUserAiSettingsForRuntime({ userId }),
    getGlobalAiSettingsForRuntime(),
  ])

  const globalReady = Boolean(globalSettings?.isEnabled && globalSettings.baseUrl && globalSettings.model)
  const userPrefersGlobal = userSettings?.useGlobalProvider !== false

  if (userPrefersGlobal && globalReady && globalSettings) {
    return toResolvedSettings({
      source: 'global',
      provider: globalSettings.provider,
      baseUrl: globalSettings.baseUrl,
      modelRaw: globalSettings.model,
      models: globalSettings.models,
      apiKey: globalSettings.apiKey,
    })
  }

  if (userSettings?.useGlobalProvider === false && userSettings.baseUrl && userSettings.model) {
    return toResolvedSettings({
      source: 'custom',
      provider: userSettings.provider,
      baseUrl: userSettings.baseUrl,
      modelRaw: userSettings.model,
      apiKey: userSettings.apiKey,
    })
  }

  if (userSettings?.baseUrl && userSettings.model) {
    return toResolvedSettings({
      source: 'custom',
      provider: userSettings.provider,
      baseUrl: userSettings.baseUrl,
      modelRaw: userSettings.model,
      apiKey: userSettings.apiKey,
    })
  }

  if (globalReady && globalSettings) {
    return toResolvedSettings({
      source: 'global',
      provider: globalSettings.provider,
      baseUrl: globalSettings.baseUrl,
      modelRaw: globalSettings.model,
      models: globalSettings.models,
      apiKey: globalSettings.apiKey,
    })
  }

  return toResolvedSettings({
    source: 'default',
    provider: 'ollama',
    baseUrl: DEFAULT_OLLAMA_BASE_URL,
    modelRaw: DEFAULT_OLLAMA_MODEL,
    apiKey: null,
  })
}

/**
 * Returns user-facing global AI status without secrets.
 */
export async function getAiProviderStatusForUser(userId: string) {
  const [globalStatus, preference] = await Promise.all([
    getGlobalAiPublicStatus(),
    getUserAiProviderPreference({ userId }),
  ])

  return {
    global: globalStatus,
    useGlobalProvider: preference.useGlobalProvider,
    hasCustomSettings: preference.hasCustomSettings,
  }
}
