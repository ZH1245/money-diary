/** AI providers with full server + UI support in Money Diary. */
export const LIVE_AI_PROVIDER_IDS = ['ollama', 'gemini', 'openrouter'] as const

export type LiveAiProviderId = (typeof LIVE_AI_PROVIDER_IDS)[number]

/** Returns true when the provider id is implemented end-to-end. */
export function isLiveAiProviderId(value: string): value is LiveAiProviderId {
  return (LIVE_AI_PROVIDER_IDS as readonly string[]).includes(value)
}

/** Normalizes a stored provider slug to a live provider id. */
export function parseLiveAiProviderId(value: string): LiveAiProviderId {
  if (value === 'gemini' || value === 'openrouter') return value
  return 'ollama'
}
