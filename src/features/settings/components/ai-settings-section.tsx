import { FormField } from '#/components/forms/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { AI_PROVIDER_OPTIONS } from '#/features/settings/constants/ai-providers'
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { InlineError } from '#/components/feedback/inline-error'
import { toast } from 'sonner'

interface AiSettingsResponse {
  user: {
    provider: string
    baseUrl: string | null
    model: string | null
    apiKeyMasked: string | null
    hasApiKey: boolean
    useGlobalProvider: boolean
  } | null
  global: {
    available: boolean
    enabled: boolean
    provider: string | null
    model: string | null
  }
  useGlobalProvider: boolean
  hasCustomSettings: boolean
}

type UrlProbeStatus = 'idle' | 'checking' | 'ok' | 'failed'

interface UrlProbeState {
  status: UrlProbeStatus
  message: string | null
  statusCode: number | null
}

const INITIAL_URL_PROBE: UrlProbeState = {
  status: 'idle',
  message: null,
  statusCode: null,
}

const ENABLED_PROVIDERS = new Set(['ollama', 'gemini', 'openrouter'])

/**
 * Stores user AI provider settings with Ollama and Gemini enabled.
 */
export function AiSettingsSection() {
  const [providerId, setProviderId] = useState('ollama')
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:11434')
  const [model, setModel] = useState('qwen3.5:4b')
  const [apiKey, setApiKey] = useState('')
  const [savedApiKeyMask, setSavedApiKeyMask] = useState<string | null>(null)
  const [useGlobalProvider, setUseGlobalProvider] = useState(true)
  const [globalAiStatus, setGlobalAiStatus] = useState<AiSettingsResponse['global'] | null>(null)
  const [isSavingSource, setIsSavingSource] = useState(false)
  const [revealedApiKey, setRevealedApiKey] = useState('')
  const [isRevealingKey, setIsRevealingKey] = useState(false)
  const [isRemovingKey, setIsRemovingKey] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [urlProbe, setUrlProbe] = useState<UrlProbeState>(INITIAL_URL_PROBE)
  const probeRequestIdRef = useRef(0)

  const selectedProvider = useMemo(
    () => AI_PROVIDER_OPTIONS.find((provider) => provider.id === providerId) ?? AI_PROVIDER_OPTIONS[0],
    [providerId],
  )

  const isProviderEnabled = ENABLED_PROVIDERS.has(providerId)
  const globalServiceReady = Boolean(globalAiStatus?.available && globalAiStatus.enabled)
  const showCustomSettings = !useGlobalProvider || !globalServiceReady

  const probeConnection = useCallback(
    async (nextProviderId: string, nextBaseUrl: string, nextApiKey: string) => {
      if (useGlobalProvider) {
        setUrlProbe(INITIAL_URL_PROBE)
        return
      }

      if (!ENABLED_PROVIDERS.has(nextProviderId)) {
        setUrlProbe(INITIAL_URL_PROBE)
        return
      }

      if (nextProviderId === 'ollama') {
        const trimmedUrl = nextBaseUrl.trim()
        if (!trimmedUrl) {
          setUrlProbe(INITIAL_URL_PROBE)
          return
        }

        try {
          new URL(trimmedUrl)
        } catch {
          setUrlProbe({
            status: 'failed',
            message: 'Enter a valid URL.',
            statusCode: null,
          })
          return
        }
      }

      if (nextProviderId === 'gemini' && !nextApiKey.trim() && !savedApiKeyMask) {
        setUrlProbe({
          status: 'failed',
          message: 'Enter a Gemini API key to test.',
          statusCode: null,
        })
        return
      }

      if (nextProviderId === 'openrouter' && !nextApiKey.trim() && !savedApiKeyMask) {
        setUrlProbe({
          status: 'failed',
          message: 'Enter an OpenRouter API key to test.',
          statusCode: null,
        })
        return
      }

      const requestId = probeRequestIdRef.current + 1
      probeRequestIdRef.current = requestId
      setUrlProbe({
        status: 'checking',
        message: 'Checking connection...',
        statusCode: null,
      })

      try {
        const response = await fetch('/api/settings/ai/test', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify(
            nextProviderId === 'gemini'
              ? {
                  provider: 'gemini',
                  apiKey: nextApiKey.trim() || revealedApiKey,
                }
              : nextProviderId === 'openrouter'
                ? {
                    provider: 'openrouter',
                    baseUrl: nextBaseUrl.trim() || 'https://openrouter.ai/api/v1',
                    apiKey: nextApiKey.trim() || revealedApiKey,
                  }
                : {
                  provider: 'ollama',
                  baseUrl: nextBaseUrl.trim(),
                  apiKey: nextApiKey.trim() || undefined,
                },
          ),
        })

        const payload = (await response.json().catch(() => null)) as {
          success?: boolean
          error?: string
          data?: {
            ok: boolean
            statusCode: number | null
            message: string
          }
        } | null

        if (probeRequestIdRef.current !== requestId) return

        if (!response.ok || !payload?.success || !payload.data) {
          throw new Error(payload?.error ?? 'Unable to test AI provider connection')
        }

        setUrlProbe({
          status: payload.data.ok ? 'ok' : 'failed',
          message: payload.data.message,
          statusCode: payload.data.statusCode,
        })
      } catch (error) {
        if (probeRequestIdRef.current !== requestId) return
        setUrlProbe({
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unable to test AI provider connection',
          statusCode: null,
        })
      }
    },
    [revealedApiKey, savedApiKeyMask, useGlobalProvider],
  )

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true)
      setErrorMessage(null)
      try {
        const response = await fetch('/api/settings/ai', { method: 'GET' })
        const payload = (await response.json().catch(() => null)) as {
          success?: boolean
          error?: string
          data?: AiSettingsResponse | null
        } | null
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error ?? 'Unable to load AI settings')
        }

        if (payload.data) {
          setUseGlobalProvider(payload.data.useGlobalProvider)
          setGlobalAiStatus(payload.data.global)

          const userSettings = payload.data.user
          if (userSettings) {
            setProviderId(userSettings.provider)
            setBaseUrl(userSettings.baseUrl ?? 'http://127.0.0.1:11434')
            setModel(userSettings.model ?? (userSettings.provider === 'gemini' ? 'gemini-2.0-flash' : userSettings.provider === 'openrouter' ? 'anthropic/claude-3.5-sonnet' : 'qwen3.5:4b'))
            setSavedApiKeyMask(userSettings.apiKeyMasked)
          } else {
            setSavedApiKeyMask(null)
          }
          setRevealedApiKey('')
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load AI settings')
      } finally {
        setIsLoading(false)
      }
    }

    void loadSettings()
  }, [])

  useEffect(() => {
    if (!isProviderEnabled || isLoading || useGlobalProvider) return

    const timer = window.setTimeout(() => {
      void probeConnection(providerId, baseUrl, apiKey)
    }, 600)

    return () => window.clearTimeout(timer)
  }, [apiKey, baseUrl, isLoading, isProviderEnabled, probeConnection, providerId, useGlobalProvider])

  async function handleAiSourceChange(nextUseGlobal: boolean) {
    setIsSavingSource(true)
    setErrorMessage(null)
    try {
      const response = await fetch('/api/settings/ai', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ useGlobalProvider: nextUseGlobal }),
      })
      const payload = (await response.json().catch(() => null)) as {
        success?: boolean
        error?: string
        data?: AiSettingsResponse
      } | null

      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(payload?.error ?? 'Unable to update AI source')
      }

      setUseGlobalProvider(payload.data.useGlobalProvider)
      setGlobalAiStatus(payload.data.global)
      setUrlProbe(INITIAL_URL_PROBE)
      toast.success(nextUseGlobal ? 'Using app AI service' : 'Using your own AI provider')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update AI source')
    } finally {
      setIsSavingSource(false)
    }
  }

  function handleProviderChange(nextProviderId: string) {
    setProviderId(nextProviderId)
    setUrlProbe(INITIAL_URL_PROBE)
    setApiKey('')
    setRevealedApiKey('')

    if (nextProviderId === 'gemini') {
      setModel('gemini-2.0-flash')
      return
    }

    if (nextProviderId === 'openrouter') {
      setBaseUrl('https://openrouter.ai/api/v1')
      setModel('anthropic/claude-3.5-sonnet')
      return
    }

    if (nextProviderId === 'ollama') {
      setBaseUrl('http://127.0.0.1:11434')
      setModel('qwen3.5:4b')
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isProviderEnabled || useGlobalProvider) return

    setIsSubmitting(true)
    setErrorMessage(null)

    const requestBody =
      providerId === 'gemini'
        ? {
            provider: 'gemini' as const,
            model: model.trim(),
            ...(apiKey.trim() || revealedApiKey
              ? { apiKey: apiKey.trim() || revealedApiKey }
              : {}),
          }
        : providerId === 'openrouter'
          ? {
              provider: 'openrouter' as const,
              baseUrl: baseUrl.trim(),
              model: model.trim(),
              ...(apiKey.trim() || revealedApiKey
                ? { apiKey: apiKey.trim() || revealedApiKey }
                : {}),
            }
          : {
            provider: 'ollama' as const,
            baseUrl: baseUrl.trim(),
            model: model.trim(),
            apiKey: apiKey.trim() || undefined,
          }

    const requestPromise = fetch('/api/settings/ai', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }).then(async (response) => {
      const payload = (await response.json().catch(() => null)) as {
        success?: boolean
        error?: string
        details?: {
          fieldErrors?: Record<string, string[]>
          formErrors?: string[]
        }
        data?: AiSettingsResponse | null
      } | null
      if (!response.ok || !payload?.success) {
        const fieldError = payload?.details?.fieldErrors
          ? Object.values(payload.details.fieldErrors).flat().at(0)
          : undefined
        throw new Error(
          fieldError ?? payload?.details?.formErrors?.at(0) ?? payload?.error ?? 'Unable to save AI settings',
        )
      }
      return payload
    })

    toast.promise(requestPromise, {
      loading: 'Saving AI settings...',
      success: 'AI settings saved',
      error: (error) => (error instanceof Error ? error.message : 'Unable to save AI settings'),
    })

    try {
      const payload = await requestPromise
      const userSettings = payload.data?.user
      setSavedApiKeyMask(userSettings?.apiKeyMasked ?? null)
      setUseGlobalProvider(payload.data?.useGlobalProvider ?? false)
      setGlobalAiStatus(payload.data?.global ?? null)
      setApiKey('')
      setRevealedApiKey('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save AI settings')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRemoveApiKey() {
    if (!savedApiKeyMask) return

    const confirmed = window.confirm('Remove the stored API key? You will need to enter it again before using providers that require one.')
    if (!confirmed) return

    setIsRemovingKey(true)
    setErrorMessage(null)
    try {
      const response = await fetch('/api/settings/ai/key', { method: 'DELETE' })
      const payload = (await response.json().catch(() => null)) as {
        success?: boolean
        error?: string
        data?: AiSettingsResponse | null
      } | null

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Unable to remove API key')
      }

      setSavedApiKeyMask(payload.data?.user?.apiKeyMasked ?? null)
      setApiKey('')
      setRevealedApiKey('')
      setUrlProbe(INITIAL_URL_PROBE)
      toast.success('API key removed')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to remove API key')
    } finally {
      setIsRemovingKey(false)
    }
  }

  async function handleRevealApiKey() {
    setIsRevealingKey(true)
    setErrorMessage(null)
    try {
      const response = await fetch('/api/settings/ai/reveal', {
        method: 'POST',
      })
      const payload = (await response.json().catch(() => null)) as {
        success?: boolean
        error?: string
        data?: {
          apiKey: string
        }
      } | null
      if (!response.ok || !payload?.success || !payload.data?.apiKey) {
        throw new Error(payload?.error ?? 'Unable to reveal API key')
      }
      setRevealedApiKey(payload.data.apiKey)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to reveal API key')
    } finally {
      setIsRevealingKey(false)
    }
  }

  const saveButtonLabel =
    urlProbe.status === 'failed' ? 'Save anyway' : 'Save AI settings'

  const urlProbeIcon =
    urlProbe.status === 'checking' ? (
      <Loader2 className="size-4 animate-spin text-muted-foreground" />
    ) : urlProbe.status === 'ok' ? (
      <CheckCircle2 className="size-4 text-emerald-600" />
    ) : urlProbe.status === 'failed' ? (
      <AlertTriangle className="size-4 text-amber-600" />
    ) : null

  return (
    <article className="feature-card rounded-xl border border-border p-5 xl:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="size-4 text-primary" />
            AI Provider
          </h2>
          <p className="mt-1 text-xs opacity-70">
            Ollama, Google Gemini, and OpenRouter are live. Other providers are listed for upcoming support.
          </p>
        </div>
        <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
          Live
        </span>
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        {globalServiceReady ? (
          <fieldset className="space-y-3 rounded-lg border border-border/70 p-4">
            <legend className="px-1 text-sm font-medium">AI source</legend>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="radio"
                name="ai-source"
                checked={useGlobalProvider}
                onChange={() => void handleAiSourceChange(true)}
                disabled={isLoading || isSavingSource || isSubmitting}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Use app AI service</span>
                <span className="mt-0.5 block text-xs opacity-70">
                  Provider: {globalAiStatus?.provider ?? '—'} · Model: {globalAiStatus?.model ?? '—'}
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="radio"
                name="ai-source"
                checked={!useGlobalProvider}
                onChange={() => void handleAiSourceChange(false)}
                disabled={isLoading || isSavingSource || isSubmitting}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Use my own provider</span>
                <span className="mt-0.5 block text-xs opacity-70">
                  Bring your own API key or Ollama endpoint.
                </span>
              </span>
            </label>
            {isSavingSource ? (
              <p className="flex items-center gap-2 text-xs opacity-70">
                <Loader2 className="size-3.5 animate-spin" />
                Updating AI source...
              </p>
            ) : null}
          </fieldset>
        ) : (
          <p className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-xs opacity-80">
            No app AI service is configured yet. Set up your own provider below.
          </p>
        )}

        {showCustomSettings ? (
          <>
        <div>
          <label htmlFor="ai-provider" className="mb-1 block text-sm font-medium">
            Provider
          </label>
          <Select value={providerId} onValueChange={handleProviderChange}>
            <SelectTrigger id="ai-provider" className="h-10 w-full">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {AI_PROVIDER_OPTIONS.map((provider) => (
                <SelectItem key={provider.id} value={provider.id} disabled={!provider.isEnabled}>
                  {provider.label}{!provider.isEnabled ? ' (Soon)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {providerId === 'ollama' ? (
          <>
            <FormField
              id="ai-base-url"
              label="Ollama base URL"
              type="url"
              value={baseUrl}
              onChange={setBaseUrl}
              placeholder="http://127.0.0.1:11434"
              isDisabled={isLoading || isSubmitting}
              rightElement={
                urlProbeIcon ? (
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    {urlProbeIcon}
                  </span>
                ) : undefined
              }
            />
            {urlProbe.message ? (
              <p
                className={`-mt-2 text-xs ${
                  urlProbe.status === 'ok'
                    ? 'text-emerald-700'
                    : urlProbe.status === 'failed'
                      ? 'text-amber-700'
                      : 'opacity-70'
                }`}
              >
                {urlProbe.message}
                {urlProbe.statusCode != null ? ` (HTTP ${urlProbe.statusCode})` : null}
              </p>
            ) : null}
            {urlProbe.status === 'failed' ? (
              <p className="-mt-2 text-xs opacity-70">
                The URL could not be reached. You can still save it if Ollama is offline right now or only reachable from another network.
              </p>
            ) : null}
            <FormField
              id="ai-model"
              label="Model"
              type="text"
              value={model}
              onChange={setModel}
              placeholder="qwen3.5:4b"
              isDisabled={isLoading || isSubmitting}
            />
            <FormField
              id="ai-api-key"
              label="API key (optional)"
              type="password"
              value={apiKey}
              onChange={setApiKey}
              placeholder={savedApiKeyMask ? `Stored: ${savedApiKeyMask}` : 'Only needed for secured Ollama gateways'}
              isRequired={false}
              isDisabled={isLoading || isSubmitting}
            />
          </>
        ) : providerId === 'gemini' ? (
          <>
            <FormField
              id="ai-gemini-api-key"
              label="Gemini API key"
              type="password"
              value={apiKey}
              onChange={setApiKey}
              placeholder={savedApiKeyMask ? `Stored: ${savedApiKeyMask}` : 'AIza...'}
              isRequired={!savedApiKeyMask}
              isDisabled={isLoading || isSubmitting}
            />
            <FormField
              id="ai-gemini-model"
              label="Model"
              type="text"
              value={model}
              onChange={setModel}
              placeholder="gemini-2.0-flash"
              isDisabled={isLoading || isSubmitting}
            />
            {urlProbe.message ? (
              <p
                className={`-mt-2 text-xs ${
                  urlProbe.status === 'ok'
                    ? 'text-emerald-700'
                    : urlProbe.status === 'failed'
                      ? 'text-amber-700'
                      : 'opacity-70'
                }`}
              >
                {urlProbeIcon ? <span className="mr-1.5 inline-flex align-middle">{urlProbeIcon}</span> : null}
                {urlProbe.message}
                {urlProbe.statusCode != null ? ` (HTTP ${urlProbe.statusCode})` : null}
              </p>
            ) : null}
          </>
        ) : providerId === 'openrouter' ? (
          <>
            <FormField
              id="ai-openrouter-api-key"
              label="OpenRouter API key"
              type="password"
              value={apiKey}
              onChange={setApiKey}
              placeholder={savedApiKeyMask ? `Stored: ${savedApiKeyMask}` : 'sk-or-...'}
              isRequired={!savedApiKeyMask}
              isDisabled={isLoading || isSubmitting}
            />
            <FormField
              id="ai-openrouter-base-url"
              label="Base URL"
              type="url"
              value={baseUrl}
              onChange={setBaseUrl}
              placeholder="https://openrouter.ai/api/v1"
              isDisabled={isLoading || isSubmitting}
              rightElement={
                urlProbeIcon ? (
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    {urlProbeIcon}
                  </span>
                ) : undefined
              }
            />
            {urlProbe.message ? (
              <p
                className={`-mt-2 text-xs ${
                  urlProbe.status === 'ok'
                    ? 'text-emerald-700'
                    : urlProbe.status === 'failed'
                      ? 'text-amber-700'
                      : 'opacity-70'
                }`}
              >
                {urlProbe.message}
                {urlProbe.statusCode != null ? ` (HTTP ${urlProbe.statusCode})` : null}
              </p>
            ) : null}
            <FormField
              id="ai-openrouter-model"
              label="Model"
              type="text"
              value={model}
              onChange={setModel}
              placeholder="anthropic/claude-3.5-sonnet"
              isDisabled={isLoading || isSubmitting}
            />
          </>
        ) : (
          selectedProvider.fields.map((field) => (
            <FormField
              key={field.id}
              id={`ai-${field.id}`}
              label={field.label}
              type={field.type === 'password' ? 'password' : 'text'}
              value=""
              onChange={() => undefined}
              placeholder={`${field.placeholder} (Coming soon)`}
              isDisabled
            />
          ))
        )}

        {savedApiKeyMask && isProviderEnabled ? (
          <div className="space-y-2 rounded-md border border-border/70 p-3">
            <p className="text-xs opacity-80">Stored API key: {savedApiKeyMask}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleRevealApiKey()}
                disabled={isRevealingKey || isRemovingKey || isSubmitting || isLoading}
                className="inline-flex h-8 items-center gap-2 rounded-md border border-border px-3 text-xs font-medium disabled:opacity-60"
              >
                {isRevealingKey ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Reveal full key
              </button>
              <button
                type="button"
                onClick={() => void handleRemoveApiKey()}
                disabled={isRevealingKey || isRemovingKey || isSubmitting || isLoading}
                className="inline-flex h-8 items-center gap-2 rounded-md border border-destructive/40 px-3 text-xs font-medium text-destructive hover:bg-destructive/5 disabled:opacity-60"
              >
                {isRemovingKey ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Remove stored key
              </button>
            </div>
            {revealedApiKey ? (
              <p className="break-all rounded-md bg-muted px-2 py-1 text-xs font-medium">{revealedApiKey}</p>
            ) : null}
          </div>
        ) : null}

        {isProviderEnabled ? (
          <p className="text-xs opacity-70">
            Sensitive values are encrypted with ENV_SECRETS before storage. Saved keys show in masked form.
          </p>
        ) : null}

        {errorMessage ? <InlineError message={errorMessage} /> : null}

        <button
          type="submit"
          disabled={isLoading || isSubmitting || !isProviderEnabled}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-primary-foreground disabled:opacity-60 ${
            urlProbe.status === 'failed' ? 'bg-amber-600 hover:bg-amber-600/90' : 'bg-primary'
          }`}
        >
          {isLoading || isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {saveButtonLabel}
        </button>
          </>
        ) : (
          <p className="text-xs opacity-70">
            You are using the app AI service. Switch to your own provider above if you want custom credentials.
          </p>
        )}

        {errorMessage && !showCustomSettings ? <InlineError message={errorMessage} /> : null}
      </form>
    </article>
  )
}
