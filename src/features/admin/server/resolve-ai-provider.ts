import {
  getGlobalAiSettingsForRuntime,
  getGlobalAiPublicStatus,
} from '#/features/admin/server/global-ai-settings-repository'
import {
  getUserAiProviderPreference,
  getUserAiSettingsForRuntime,
  type AiProviderId,
} from '#/features/settings/server/settings-repository'

export interface ResolvedAiProviderSettings {
  source: 'global' | 'custom' | 'default'
  provider: AiProviderId
  baseUrl: string
  model: string
  apiKey: string | null
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
    return {
      source: 'global',
      provider: globalSettings.provider,
      baseUrl: globalSettings.baseUrl,
      model: globalSettings.model,
      apiKey: globalSettings.apiKey,
    }
  }

  if (userSettings?.useGlobalProvider === false && userSettings.baseUrl && userSettings.model) {
    return {
      source: 'custom',
      provider: userSettings.provider,
      baseUrl: userSettings.baseUrl,
      model: userSettings.model,
      apiKey: userSettings.apiKey,
    }
  }

  if (userSettings?.baseUrl && userSettings.model) {
    return {
      source: 'custom',
      provider: userSettings.provider,
      baseUrl: userSettings.baseUrl,
      model: userSettings.model,
      apiKey: userSettings.apiKey,
    }
  }

  if (globalReady && globalSettings) {
    return {
      source: 'global',
      provider: globalSettings.provider,
      baseUrl: globalSettings.baseUrl,
      model: globalSettings.model,
      apiKey: globalSettings.apiKey,
    }
  }

  return {
    source: 'default',
    provider: 'ollama',
    baseUrl: DEFAULT_OLLAMA_BASE_URL,
    model: DEFAULT_OLLAMA_MODEL,
    apiKey: null,
  }
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
