export interface AiProviderField {
  id: 'apiKey' | 'apiSecret' | 'baseUrl'
  label: string
  placeholder: string
  type: 'password' | 'url' | 'text'
}

export interface AiProviderOption {
  id: string
  label: string
  fields: AiProviderField[]
}

/**
 * Provider presets for the upcoming bring-your-own-key AI settings screen.
 */
export const AI_PROVIDER_OPTIONS: AiProviderOption[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    fields: [
      {
        id: 'apiKey',
        label: 'API key',
        placeholder: 'sk-...',
        type: 'password',
      },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    fields: [
      {
        id: 'apiKey',
        label: 'API key',
        placeholder: 'sk-ant-...',
        type: 'password',
      },
    ],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    fields: [
      {
        id: 'apiKey',
        label: 'API key',
        placeholder: 'sk-or-...',
        type: 'password',
      },
      {
        id: 'baseUrl',
        label: 'Base URL',
        placeholder: 'https://openrouter.ai/api/v1',
        type: 'url',
      },
    ],
  },
  {
    id: 'custom',
    label: 'Custom endpoint',
    fields: [
      {
        id: 'baseUrl',
        label: 'Base URL',
        placeholder: 'https://your-provider.example/v1',
        type: 'url',
      },
      {
        id: 'apiKey',
        label: 'API key',
        placeholder: 'Provider API key',
        type: 'password',
      },
      {
        id: 'apiSecret',
        label: 'API secret',
        placeholder: 'Optional provider secret',
        type: 'password',
      },
    ],
  },
]
