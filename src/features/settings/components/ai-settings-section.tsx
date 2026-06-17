import { FormField } from '#/components/forms/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { AI_PROVIDER_OPTIONS } from '#/features/settings/constants/ai-providers'
import { Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'

/**
 * Preview of upcoming AI provider configuration. All inputs are disabled for now.
 */
export function AiSettingsSection() {
  const [providerId, setProviderId] = useState(AI_PROVIDER_OPTIONS[0]?.id ?? 'openai')

  const selectedProvider = useMemo(
    () => AI_PROVIDER_OPTIONS.find((provider) => provider.id === providerId) ?? AI_PROVIDER_OPTIONS[0],
    [providerId],
  )

  return (
    <article className="feature-card rounded-xl border border-border p-5 xl:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="size-4 text-primary" />
            AI Provider
          </h2>
          <p className="mt-1 text-xs opacity-70">
            Preview provider-specific fields below. Credentials stay disabled until this feature launches.
          </p>
        </div>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
          Soon
        </span>
      </div>

      <div className="mt-4 rounded-lg border border-dashed border-amber-300/80 bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
        AI assistant settings are coming soon. Provider choice and required fields below are a preview only.
      </div>

      <form className="mt-4 space-y-4" onSubmit={(event) => event.preventDefault()}>
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
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedProvider.fields.map((field) => (
          <FormField
            key={field.id}
            id={`ai-${field.id}`}
            label={field.label}
            type={field.type === 'password' ? 'password' : 'text'}
            value=""
            onChange={() => undefined}
            placeholder={field.placeholder}
            isDisabled
          />
        ))}

        <button
          type="submit"
          disabled
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground opacity-60"
        >
          Save AI settings
        </button>
      </form>
    </article>
  )
}
