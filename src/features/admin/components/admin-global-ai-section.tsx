import { FormField } from '#/components/forms/form-field'
import { InlineError } from '#/components/feedback/inline-error'
import { AI_PROVIDER_OPTIONS } from '#/features/settings/constants/ai-providers'
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { toast } from 'sonner'

interface GlobalAiSettingsResponse {
  isEnabled: boolean
  provider: string
  baseUrl: string
  model: string
  hasApiKey: boolean
  apiKeyMasked: string | null
  updatedAt: string | null
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

/** Admin form for configuring the global AI provider offered to all users. */
export function AdminGlobalAiSection() {
  const [isEnabled, setIsEnabled] = useState(false)
  const [providerId, setProviderId] = useState('gemini')
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:11434')
  const [model, setModel] = useState('gemini-2.0-flash')
  const [apiKey, setApiKey] = useState('')
  const [savedApiKeyMask, setSavedApiKeyMask] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRemovingKey, setIsRemovingKey] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [urlProbe, setUrlProbe] = useState<UrlProbeState>(INITIAL_URL_PROBE)
  const probeRequestIdRef = useRef(0)

  const selectedProvider = useMemo(
    () => AI_PROVIDER_OPTIONS.find((provider) => provider.id === providerId) ?? AI_PROVIDER_OPTIONS[0],
    [providerId],
  )

  const isProviderEnabled = ENABLED_PROVIDERS.has(providerId)

  const probeConnection = useCallback(
    async (nextProviderId: string, nextBaseUrl: string, nextApiKey: string) => {
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
          setUrlProbe({ status: 'failed', message: 'Enter a valid URL.', statusCode: null })
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
      setUrlProbe({ status: 'checking', message: 'Checking connection...', statusCode: null })

      try {
        const response = await fetch('/api/admin/global-ai/test', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(
            nextProviderId === 'gemini'
              ? { provider: 'gemini', apiKey: nextApiKey.trim() }
              : nextProviderId === 'openrouter'
                ? {
                    provider: 'openrouter',
                    baseUrl: nextBaseUrl.trim() || 'https://openrouter.ai/api/v1',
                    apiKey: nextApiKey.trim(),
                  }
                : { provider: 'ollama', baseUrl: nextBaseUrl.trim(), apiKey: nextApiKey.trim() || undefined },
          ),
        })

        const payload = (await response.json().catch(() => null)) as {
          success?: boolean
          error?: string
          data?: { ok: boolean; statusCode: number | null; message: string }
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
    [savedApiKeyMask],
  )

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true)
      setErrorMessage(null)
      try {
        const response = await fetch('/api/admin/global-ai', { method: 'GET' })
        const payload = (await response.json().catch(() => null)) as {
          success?: boolean
          error?: string
          data?: GlobalAiSettingsResponse | null
        } | null

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error ?? 'Unable to load global AI settings')
        }

        if (payload.data) {
          setIsEnabled(payload.data.isEnabled)
          setProviderId(payload.data.provider)
          setBaseUrl(payload.data.baseUrl || 'http://127.0.0.1:11434')
          setModel(payload.data.model)
          setSavedApiKeyMask(payload.data.apiKeyMasked)
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load global AI settings')
      } finally {
        setIsLoading(false)
      }
    }

    void loadSettings()
  }, [])

  useEffect(() => {
    if (!isProviderEnabled || isLoading) return

    const timer = window.setTimeout(() => {
      void probeConnection(providerId, baseUrl, apiKey)
    }, 600)

    return () => window.clearTimeout(timer)
  }, [apiKey, baseUrl, isLoading, isProviderEnabled, probeConnection, providerId])

  function handleProviderChange(nextProviderId: string) {
    setProviderId(nextProviderId)
    setUrlProbe(INITIAL_URL_PROBE)
    setApiKey('')

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
    if (!isProviderEnabled) return

    setIsSubmitting(true)
    setErrorMessage(null)

    const requestBody =
      providerId === 'gemini'
        ? { isEnabled, provider: 'gemini' as const, model: model.trim(), apiKey: apiKey.trim() || undefined }
        : providerId === 'openrouter'
          ? {
              isEnabled,
              provider: 'openrouter' as const,
              baseUrl: baseUrl.trim(),
              model: model.trim(),
              apiKey: apiKey.trim() || undefined,
            }
          : {
              isEnabled,
              provider: 'ollama' as const,
              baseUrl: baseUrl.trim(),
              model: model.trim(),
              apiKey: apiKey.trim() || undefined,
            }

    try {
      const response = await fetch('/api/admin/global-ai', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const payload = (await response.json().catch(() => null)) as {
        success?: boolean
        error?: string
        data?: GlobalAiSettingsResponse | null
      } | null

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Unable to save global AI settings')
      }

      if (payload.data) {
        setIsEnabled(payload.data.isEnabled)
        setSavedApiKeyMask(payload.data.apiKeyMasked)
        setApiKey('')
      }

      toast.success('Global AI settings saved')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save global AI settings')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRemoveApiKey() {
    if (!savedApiKeyMask) return

    const confirmed = window.confirm('Remove the stored global API key?')
    if (!confirmed) return

    setIsRemovingKey(true)
    setErrorMessage(null)
    try {
      const response = await fetch('/api/admin/global-ai/key', { method: 'DELETE' })
      const payload = (await response.json().catch(() => null)) as {
        success?: boolean
        error?: string
        data?: GlobalAiSettingsResponse | null
      } | null

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Unable to remove API key')
      }

      setSavedApiKeyMask(payload.data?.apiKeyMasked ?? null)
      setApiKey('')
      setUrlProbe(INITIAL_URL_PROBE)
      toast.success('Global API key removed')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to remove API key')
    } finally {
      setIsRemovingKey(false)
    }
  }

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
            Global AI Provider
          </h2>
          <p className="mt-1 text-xs opacity-70">
            Configure the AI service users can use by default. API keys are encrypted and never shown to regular users.
          </p>
        </div>
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(event) => setIsEnabled(event.target.checked)}
            disabled={isLoading || isSubmitting}
            className="size-4 rounded border-border"
          />
          Offer AI as an app service to users
        </label>

        <div>
          <label htmlFor="admin-ai-provider" className="mb-1 block text-sm font-medium">
            Provider
          </label>
          <Select value={providerId} onValueChange={handleProviderChange}>
            <SelectTrigger id="admin-ai-provider" className="h-10 w-full">
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
              id="admin-ai-base-url"
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
                  urlProbe.status === 'ok' ? 'text-emerald-700' : urlProbe.status === 'failed' ? 'text-amber-700' : 'opacity-70'
                }`}
              >
                {urlProbe.message}
              </p>
            ) : null}
            <FormField
              id="admin-ai-model"
              label="Model"
              type="text"
              value={model}
              onChange={setModel}
              placeholder="qwen3.5:4b"
              isDisabled={isLoading || isSubmitting}
            />
            <FormField
              id="admin-ai-api-key"
              label="API key (optional)"
              type="password"
              value={apiKey}
              onChange={setApiKey}
              placeholder={savedApiKeyMask ? `Stored: ${savedApiKeyMask}` : 'Only for secured gateways'}
              isRequired={false}
              isDisabled={isLoading || isSubmitting}
            />
          </>
        ) : providerId === 'gemini' ? (
          <>
            <FormField
              id="admin-gemini-api-key"
              label="Gemini API key"
              type="password"
              value={apiKey}
              onChange={setApiKey}
              placeholder={savedApiKeyMask ? `Stored: ${savedApiKeyMask}` : 'AIza...'}
              isRequired={!savedApiKeyMask}
              isDisabled={isLoading || isSubmitting}
            />
            <FormField
              id="admin-gemini-model"
              label="Model"
              type="text"
              value={model}
              onChange={setModel}
              placeholder="gemini-2.0-flash"
              isDisabled={isLoading || isSubmitting}
            />
            {urlProbe.message ? (
              <p className={`-mt-2 text-xs ${urlProbe.status === 'ok' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {urlProbeIcon ? <span className="mr-1.5 inline-flex align-middle">{urlProbeIcon}</span> : null}
                {urlProbe.message}
              </p>
            ) : null}
          </>
        ) : providerId === 'openrouter' ? (
          <>
            <FormField
              id="admin-openrouter-api-key"
              label="OpenRouter API key"
              type="password"
              value={apiKey}
              onChange={setApiKey}
              placeholder={savedApiKeyMask ? `Stored: ${savedApiKeyMask}` : 'sk-or-...'}
              isRequired={!savedApiKeyMask}
              isDisabled={isLoading || isSubmitting}
            />
            <FormField
              id="admin-openrouter-base-url"
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
            <FormField
              id="admin-openrouter-model"
              label="Model"
              type="text"
              value={model}
              onChange={setModel}
              placeholder="anthropic/claude-3.5-sonnet"
              isDisabled={isLoading || isSubmitting}
            />
            {urlProbe.message ? (
              <p className={`-mt-2 text-xs ${urlProbe.status === 'ok' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {urlProbe.message}
              </p>
            ) : null}
          </>
        ) : (
          selectedProvider.fields.map((field) => (
            <FormField
              key={field.id}
              id={`admin-ai-${field.id}`}
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
            <button
              type="button"
              onClick={() => void handleRemoveApiKey()}
              disabled={isRemovingKey || isSubmitting || isLoading}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-destructive/40 px-3 text-xs font-medium text-destructive hover:bg-destructive/5 disabled:opacity-60"
            >
              {isRemovingKey ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Remove stored key
            </button>
          </div>
        ) : null}

        {errorMessage ? <InlineError message={errorMessage} /> : null}

        <button
          type="submit"
          disabled={isLoading || isSubmitting || !isProviderEnabled}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {isLoading || isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Save global AI settings
        </button>
      </form>
    </article>
  )
}
