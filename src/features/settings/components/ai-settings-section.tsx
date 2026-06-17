import { FormField } from '#/components/forms/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { AI_PROVIDER_OPTIONS } from '#/features/settings/constants/ai-providers'
import { Sparkles, Loader2 } from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'
import { InlineError } from '#/components/feedback/inline-error'
import { toast } from 'sonner'

interface AiSettingsResponse {
  provider: string
  baseUrl: string
  model: string
  apiKeyMasked: string | null
  hasApiKey: boolean
}

/**
 * Stores user AI provider settings with Ollama enabled and others marked as coming soon.
 */
export function AiSettingsSection() {
  const [providerId, setProviderId] = useState('ollama')
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:11434')
  const [model, setModel] = useState('gemma4:latest')
  const [apiKey, setApiKey] = useState('')
  const [savedApiKeyMask, setSavedApiKeyMask] = useState<string | null>(null)
  const [revealedApiKey, setRevealedApiKey] = useState('')
  const [isRevealingKey, setIsRevealingKey] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const selectedProvider = useMemo(
    () => AI_PROVIDER_OPTIONS.find((provider) => provider.id === providerId) ?? AI_PROVIDER_OPTIONS[0],
    [providerId],
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
          setProviderId(payload.data.provider)
          setBaseUrl(payload.data.baseUrl)
          setModel(payload.data.model)
          setSavedApiKeyMask(payload.data.apiKeyMasked)
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (providerId !== 'ollama') return

    setIsSubmitting(true)
    setErrorMessage(null)

    const requestPromise = fetch('/api/settings/ai', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'ollama',
        baseUrl: baseUrl.trim(),
        model: model.trim(),
        apiKey: apiKey.trim() || undefined,
      }),
    }).then(async (response) => {
      const payload = (await response.json().catch(() => null)) as {
        success?: boolean
        error?: string
        data?: AiSettingsResponse | null
      } | null
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Unable to save AI settings')
      }
      return payload
    })

    toast.promise(requestPromise, {
      loading: 'Saving AI settings...',
      success: 'AI settings saved',
      error: 'Unable to save AI settings',
    })

    try {
      const payload = await requestPromise
      setSavedApiKeyMask(payload.data?.apiKeyMasked ?? null)
      setApiKey('')
      setRevealedApiKey('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save AI settings')
    } finally {
      setIsSubmitting(false)
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

  return (
    <article className="feature-card rounded-xl border border-border p-5 xl:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="size-4 text-primary" />
            AI Provider
          </h2>
          <p className="mt-1 text-xs opacity-70">
            Ollama is enabled now. Other providers stay visible as coming soon.
          </p>
        </div>
        <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
          Live
        </span>
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="ai-provider" className="mb-1 block text-sm font-medium">
            Provider
          </label>
          <Select value={providerId} onValueChange={setProviderId}>
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
            />
            <FormField
              id="ai-model"
              label="Model"
              type="text"
              value={model}
              onChange={setModel}
              placeholder="gemma4:latest"
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
            {savedApiKeyMask ? (
              <div className="space-y-2 rounded-md border border-border/70 p-3">
                <p className="text-xs opacity-80">Stored API key: {savedApiKeyMask}</p>
                <button
                  type="button"
                  onClick={() => void handleRevealApiKey()}
                  disabled={isRevealingKey || isSubmitting || isLoading}
                  className="inline-flex h-8 items-center gap-2 rounded-md border border-border px-3 text-xs font-medium disabled:opacity-60"
                >
                  {isRevealingKey ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Reveal full key
                </button>
                {revealedApiKey ? (
                  <p className="break-all rounded-md bg-muted px-2 py-1 text-xs font-medium">{revealedApiKey}</p>
                ) : null}
              </div>
            ) : null}
            <p className="text-xs opacity-70">
              Sensitive values are encrypted before storage. Saved key shows in masked form.
            </p>
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

        {errorMessage ? <InlineError message={errorMessage} /> : null}

        <button
          type="submit"
          disabled={isLoading || isSubmitting || providerId !== 'ollama'}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {isLoading || isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Save AI settings
        </button>
      </form>
    </article>
  )
}
