import type { getAiToolsForProvider } from '#/features/ai/server/ai-tools'
import { formatAiProviderError } from '#/features/ai/server/format-ai-provider-error'

export const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
export const DEFAULT_OPENROUTER_MODEL = 'anthropic/claude-3.5-sonnet'

export type OpenRouterChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | {
      role: 'assistant'
      content?: string
      tool_calls?: Array<{
        id: string
        type: 'function'
        function: { name: string; arguments: string }
      }>
    }
  | { role: 'tool'; tool_call_id: string; content: string }

export interface OpenRouterProbeResult {
  ok: boolean
  statusCode: number | null
  message: string
}

interface OpenRouterChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null
      tool_calls?: Array<{
        id?: string
        type?: string
        function?: { name?: string; arguments?: string }
      }>
    }
    finish_reason?: string
  }>
  error?: {
    message?: string
  }
}

export interface OpenRouterToolCall {
  id: string
  name: string
  arguments: unknown
}

function buildOpenRouterHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'HTTP-Referer': 'https://money-diary.app',
    'X-Title': 'Money Diary',
  }
}

/**
 * Converts internal tool definitions into OpenRouter/OpenAI function tools.
 */
export function toOpenRouterTools(tools: ReturnType<typeof getAiToolsForProvider>) {
  return tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters,
    },
  }))
}

/**
 * Probes an OpenRouter API key with a lightweight models request.
 */
export async function probeOpenRouterApiKey({
  apiKey,
  baseUrl = DEFAULT_OPENROUTER_BASE_URL,
  timeoutMs = 8000,
}: {
  apiKey: string
  baseUrl?: string
  timeoutMs?: number
}): Promise<OpenRouterProbeResult> {
  const trimmedKey = apiKey.trim()
  if (!trimmedKey) {
    return { ok: false, statusCode: null, message: 'Enter an OpenRouter API key.' }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
      method: 'GET',
      headers: buildOpenRouterHeaders(trimmedKey),
      signal: controller.signal,
    })

    if (response.ok) {
      return {
        ok: true,
        statusCode: response.status,
        message: 'OpenRouter API key is valid.',
      }
    }

    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
    return {
      ok: false,
      statusCode: response.status,
      message: formatAiProviderError(payload?.error?.message ?? `OpenRouter error: ${response.status}`, 'openrouter'),
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, statusCode: null, message: 'Connection timed out. Check the URL and network.' }
    }

    return { ok: false, statusCode: null, message: 'Could not reach OpenRouter.' }
  } finally {
    clearTimeout(timeout)
  }
}

function parseToolArguments(raw: unknown): unknown {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as unknown
    } catch {
      return raw
    }
  }
  return raw
}

/**
 * Calls OpenRouter chat completions with tool support.
 */
export async function callOpenRouterChat({
  baseUrl,
  model,
  apiKey,
  messages,
  tools,
}: {
  baseUrl: string
  model: string
  apiKey: string
  messages: OpenRouterChatMessage[]
  tools: ReturnType<typeof getAiToolsForProvider>
}): Promise<
  | { ok: true; assistantText: string; toolCalls: OpenRouterToolCall[]; truncated: boolean }
  | { ok: false; error: string; status?: number }
> {
  const trimmedKey = apiKey.trim()
  if (!trimmedKey) {
    return { ok: false, error: 'OpenRouter API key is required.' }
  }

  let response: Response
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: buildOpenRouterHeaders(trimmedKey),
      body: JSON.stringify({
        model,
        messages,
        tools: toOpenRouterTools(tools),
        tool_choice: 'auto',
        temperature: 0.3,
        max_tokens: 4096,
      }),
    })
  } catch {
    return { ok: false, error: 'Could not reach OpenRouter.' }
  }

  const data = (await response.json().catch(() => null)) as OpenRouterChatCompletionResponse | null

  if (!response.ok) {
    return {
      ok: false,
      error: formatAiProviderError(data?.error?.message ?? `OpenRouter error: ${response.status}`, 'openrouter'),
      status: response.status,
    }
  }

  const message = data?.choices?.[0]?.message
  const assistantText = message?.content?.trim() ?? ''
  const toolCalls =
    message?.tool_calls?.map((toolCall, index) => ({
      id: toolCall.id ?? `tool_call_${index}`,
      name: toolCall.function?.name ?? '',
      arguments: parseToolArguments(toolCall.function?.arguments),
    })) ?? []

  return {
    ok: true,
    assistantText,
    toolCalls: toolCalls.filter((toolCall) => toolCall.name),
    truncated: data?.choices?.[0]?.finish_reason === 'length',
  }
}
