import { z } from 'zod'
import { getGlobalAiSettingsForRuntime } from '#/features/admin/server/global-ai-settings-repository'
import { probeGeminiApiKey } from '#/features/ai/server/gemini-client'
import { probeOllamaBaseUrl } from '#/features/ai/server/ollama-client'
import { probeOpenRouterApiKey } from '#/features/ai/server/openrouter-client'
import { getUserAiSettingsForRuntime } from '#/features/settings/server/settings-repository'

const storedKeyFlag = z.literal(true)

const testOllamaWithStoredKeySchema = z.object({
  provider: z.literal('ollama'),
  useStoredKey: storedKeyFlag,
  baseUrl: z.string().trim().url('Enter a valid URL'),
})

const testOllamaWithKeySchema = z.object({
  provider: z.literal('ollama'),
  baseUrl: z.string().trim().url('Enter a valid URL'),
  apiKey: z.string().trim().optional(),
})

const testGeminiWithStoredKeySchema = z.object({
  provider: z.literal('gemini'),
  useStoredKey: storedKeyFlag,
})

const testGeminiWithKeySchema = z.object({
  provider: z.literal('gemini'),
  apiKey: z.string().trim().min(1, 'Gemini API key is required'),
})

const testOpenRouterWithStoredKeySchema = z.object({
  provider: z.literal('openrouter'),
  useStoredKey: storedKeyFlag,
  baseUrl: z.string().trim().url('Enter a valid URL'),
})

const testOpenRouterWithKeySchema = z.object({
  provider: z.literal('openrouter'),
  baseUrl: z.string().trim().url('Enter a valid URL'),
  apiKey: z.string().trim().min(1, 'OpenRouter API key is required'),
})

export const testUserAiSettingsSchema = z.union([
  testOllamaWithStoredKeySchema,
  testOllamaWithKeySchema,
  testGeminiWithStoredKeySchema,
  testGeminiWithKeySchema,
  testOpenRouterWithStoredKeySchema,
  testOpenRouterWithKeySchema,
])

export const testGlobalAiSettingsSchema = testUserAiSettingsSchema

/**
 * Probes a user AI provider using typed credentials or the user's stored encrypted key.
 */
export async function probeUserAiConnection({
  userId,
  payload,
}: {
  userId: string
  payload: z.infer<typeof testUserAiSettingsSchema>
}) {
  if ('useStoredKey' in payload) {
    const stored = await getUserAiSettingsForRuntime({ userId })
    if (!stored?.apiKey && payload.provider !== 'ollama') {
      throw new Error('No stored API key found. Enter a key to test.')
    }

    if (payload.provider === 'gemini') {
      if (!stored?.apiKey) throw new Error('No stored API key found. Enter a key to test.')
      return probeGeminiApiKey({ apiKey: stored.apiKey })
    }

    if (payload.provider === 'openrouter') {
      if (!stored?.apiKey) throw new Error('No stored API key found. Enter a key to test.')
      return probeOpenRouterApiKey({
        apiKey: stored.apiKey,
        baseUrl: payload.baseUrl,
      })
    }

    return probeOllamaBaseUrl({
      baseUrl: payload.baseUrl,
      apiKey: stored?.apiKey ?? undefined,
    })
  }

  if (payload.provider === 'gemini') {
    return probeGeminiApiKey({ apiKey: payload.apiKey })
  }

  if (payload.provider === 'openrouter') {
    return probeOpenRouterApiKey({
      apiKey: payload.apiKey,
      baseUrl: payload.baseUrl,
    })
  }

  return probeOllamaBaseUrl({
    baseUrl: payload.baseUrl,
    apiKey: payload.apiKey,
  })
}

/**
 * Probes global AI credentials using typed values or the stored encrypted admin key.
 */
export async function probeGlobalAiConnection(payload: z.infer<typeof testGlobalAiSettingsSchema>) {
  if ('useStoredKey' in payload) {
    const stored = await getGlobalAiSettingsForRuntime()
    if (!stored?.apiKey && payload.provider !== 'ollama') {
      throw new Error('No stored API key found. Enter a key to test.')
    }

    if (payload.provider === 'gemini') {
      if (!stored?.apiKey) throw new Error('No stored API key found. Enter a key to test.')
      return probeGeminiApiKey({ apiKey: stored.apiKey })
    }

    if (payload.provider === 'openrouter') {
      if (!stored?.apiKey) throw new Error('No stored API key found. Enter a key to test.')
      return probeOpenRouterApiKey({
        apiKey: stored.apiKey,
        baseUrl: payload.baseUrl,
      })
    }

    return probeOllamaBaseUrl({
      baseUrl: payload.baseUrl,
      apiKey: stored?.apiKey ?? undefined,
    })
  }

  if (payload.provider === 'gemini') {
    return probeGeminiApiKey({ apiKey: payload.apiKey })
  }

  if (payload.provider === 'openrouter') {
    return probeOpenRouterApiKey({
      apiKey: payload.apiKey,
      baseUrl: payload.baseUrl,
    })
  }

  return probeOllamaBaseUrl({
    baseUrl: payload.baseUrl,
    apiKey: payload.apiKey,
  })
}
