import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'
import {
  getUserAiSettingsForRuntime,
  setUserAiProviderSource,
  tryGetUserAiSettings,
  upsertUserAiSettings,
} from '#/features/settings/server/settings-repository'
import { getAiProviderStatusForUser } from '#/features/admin/server/resolve-ai-provider'
import { getGlobalAiPublicStatus } from '#/features/admin/server/global-ai-settings-repository'
import { DEFAULT_GEMINI_BASE_URL } from '#/features/ai/server/gemini-client'

const saveOllamaSettingsSchema = z.object({
  provider: z.literal('ollama'),
  baseUrl: z.string().trim().url('Enter a valid URL'),
  model: z.string().trim().min(1, 'Model is required'),
  apiKey: z.string().trim().optional(),
})

const saveGeminiSettingsSchema = z.object({
  provider: z.literal('gemini'),
  model: z.string().trim().min(1, 'Model is required'),
  apiKey: z.string().trim().optional(),
})

const saveOpenRouterSettingsSchema = z.object({
  provider: z.literal('openrouter'),
  baseUrl: z.string().trim().url('Enter a valid URL'),
  model: z.string().trim().min(1, 'Model is required'),
  apiKey: z.string().trim().optional(),
})

const setAiSourceSchema = z.object({
  useGlobalProvider: z.boolean(),
})

const saveAiSettingsSchema = z.discriminatedUnion('provider', [
  saveOllamaSettingsSchema,
  saveGeminiSettingsSchema,
  saveOpenRouterSettingsSchema,
])

const patchAiSettingsSchema = z.union([setAiSourceSchema, saveAiSettingsSchema])

export const Route = createFileRoute('/api/settings/ai')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        try {
          const [userLoad, providerStatus] = await Promise.all([
            tryGetUserAiSettings({ userId: userContext.id }),
            getAiProviderStatusForUser(userContext.id),
          ])

          return Response.json({
            success: true,
            data: {
              user: userLoad.settings,
              global: providerStatus.global,
              useGlobalProvider: providerStatus.useGlobalProvider,
              hasCustomSettings: providerStatus.hasCustomSettings,
              settingsWarning: userLoad.decryptError,
            },
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : ''

          if (message.includes('ai_provider_settings') || message.includes('does not exist')) {
            return Response.json(
              {
                success: false,
                error: 'Database table ai_provider_settings is missing. Run migrations: pnpm db:migrate (or pnpm db:migrate:prod).',
              },
              { status: 500 },
            )
          }

          console.error('[settings/ai GET]', error)
          return Response.json({ success: false, error: 'Unable to load AI settings.' }, { status: 500 })
        }
      },
      PATCH: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const body = await request.json().catch(() => null)
        const bodyUserIdRejected = rejectClientSuppliedUserId(
          request,
          body && typeof body === 'object' ? (body as Record<string, unknown>) : null,
        )
        if (bodyUserIdRejected) return bodyUserIdRejected

        const parsed = patchAiSettingsSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid AI settings payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        try {
          if ('useGlobalProvider' in parsed.data) {
            if (parsed.data.useGlobalProvider) {
              const globalStatus = await getGlobalAiPublicStatus()
              if (!globalStatus.available || !globalStatus.enabled) {
                return Response.json(
                  { success: false, error: 'App AI service is not available yet. Ask an admin to enable it.' },
                  { status: 400 },
                )
              }
            }

            await setUserAiProviderSource({
              userId: userContext.id,
              useGlobalProvider: parsed.data.useGlobalProvider,
            })
          } else if (parsed.data.provider === 'ollama') {
            await upsertUserAiSettings({
              userId: userContext.id,
              provider: 'ollama',
              baseUrl: parsed.data.baseUrl,
              model: parsed.data.model,
              apiKey: parsed.data.apiKey,
              useGlobalProvider: false,
            })
          } else if (parsed.data.provider === 'openrouter') {
            const existing = await getUserAiSettingsForRuntime({ userId: userContext.id })
            const nextApiKey = parsed.data.apiKey?.trim() || existing?.apiKey

            if (!nextApiKey) {
              return Response.json(
                { success: false, error: 'OpenRouter API key is required' },
                { status: 400 },
              )
            }

            await upsertUserAiSettings({
              userId: userContext.id,
              provider: 'openrouter',
              baseUrl: parsed.data.baseUrl,
              model: parsed.data.model,
              apiKey: nextApiKey,
              useGlobalProvider: false,
            })
          } else {
            const existing = await getUserAiSettingsForRuntime({ userId: userContext.id })
            const nextApiKey = parsed.data.apiKey?.trim() || existing?.apiKey

            if (!nextApiKey) {
              return Response.json(
                { success: false, error: 'Gemini API key is required' },
                { status: 400 },
              )
            }

            await upsertUserAiSettings({
              userId: userContext.id,
              provider: 'gemini',
              baseUrl: DEFAULT_GEMINI_BASE_URL,
              model: parsed.data.model,
              apiKey: nextApiKey,
              useGlobalProvider: false,
            })
          }

          const [userLoad, providerStatus] = await Promise.all([
            tryGetUserAiSettings({ userId: userContext.id }),
            getAiProviderStatusForUser(userContext.id),
          ])

          return Response.json({
            success: true,
            data: {
              user: userLoad.settings,
              global: providerStatus.global,
              useGlobalProvider: providerStatus.useGlobalProvider,
              hasCustomSettings: providerStatus.hasCustomSettings,
              settingsWarning: userLoad.decryptError,
            },
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : ''

          if (message.includes('ENV_SECRETS') || message.includes('ENCRYPTION_KEY') || message.includes('BETTER_AUTH_SECRET')) {
            return Response.json(
              {
                success: false,
                error: 'Server encryption is not configured. Set ENV_SECRETS in your environment and restart the app.',
              },
              { status: 500 },
            )
          }

          if (message.includes('ai_provider_settings') || message.includes('does not exist')) {
            return Response.json(
              {
                success: false,
                error: 'Database table ai_provider_settings is missing. Run migrations: pnpm db:migrate (or pnpm db:migrate:prod).',
              },
              { status: 500 },
            )
          }

          console.error('[settings/ai PATCH]', error)
          return Response.json({ success: false, error: 'Unable to save AI settings.' }, { status: 500 })
        }
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})
