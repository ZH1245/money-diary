export interface AiProviderField {
  id: 'apiKey' | 'apiSecret' | 'baseUrl' | 'model'
  label: string
  placeholder: string
  type: 'password' | 'url' | 'text'
}

export interface AiProviderOption {
  id: string
  label: string
  fields: AiProviderField[]
  isEnabled?: boolean
}

/**
 * Provider presets for the AI settings screen.
 */
export const AI_PROVIDER_OPTIONS: AiProviderOption[] = [
  {
    id: 'ollama',
    label: 'Ollama',
    isEnabled: true,
    fields: [
      {
        id: 'baseUrl',
        label: 'Ollama base URL',
        placeholder: 'http://127.0.0.1:11434',
        type: 'url',
      },
      {
        id: 'model',
        label: 'Model',
        placeholder: 'qwen3.5:4b',
        type: 'text',
      },
      {
        id: 'apiKey',
        label: 'API key (optional)',
        placeholder: 'Only if your Ollama gateway requires auth',
        type: 'password',
      },
    ],
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    isEnabled: true,
    fields: [
      {
        id: 'apiKey',
        label: 'API key',
        placeholder: 'AIza...',
        type: 'password',
      },
      {
        id: 'model',
        label: 'Model',
        placeholder: 'gemini-2.0-flash',
        type: 'text',
      },
    ],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    isEnabled: false,
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
      {
        id: 'model',
        label: 'Model',
        placeholder: 'anthropic/claude-3.5-sonnet',
        type: 'text',
      },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    isEnabled: false,
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
    isEnabled: false,
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
    id: 'custom',
    label: 'Custom endpoint',
    isEnabled: false,
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
