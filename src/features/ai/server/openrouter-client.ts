import type { getAiToolsForProvider } from '#/features/ai/server/ai-tools'
import { formatAiProviderError } from '#/features/ai/server/format-ai-provider-error'
import {
  OPENROUTER_DEFAULT_BASE_URL,
  OPENROUTER_DEFAULT_MODEL,
  OPENROUTER_MAX_OUTPUT_TOKENS,
} from '#/features/settings/constants/openrouter-defaults'
import { PRODUCTION_SITE_ORIGIN } from '#/lib/seo/site-url'

export const DEFAULT_OPENROUTER_BASE_URL = OPENROUTER_DEFAULT_BASE_URL
export const DEFAULT_OPENROUTER_MODEL = OPENROUTER_DEFAULT_MODEL

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
    finish_reason?: string | null
    error?: {
      code?: number
      message?: string
      metadata?: Record<string, unknown>
    }
  }>
  error?: {
    message?: string
    code?: number
    metadata?: Record<string, unknown>
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
    'HTTP-Referer': PRODUCTION_SITE_ORIGIN,
    'X-OpenRouter-Title': 'Money Diary',
  }
}

/**
 * Extracts a detailed upstream message from OpenRouter provider metadata.
 */
function parseOpenRouterProviderRawError(raw: unknown): string | null {
  if (raw == null) return null

  let parsed: unknown = raw
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return null
    try {
      parsed = JSON.parse(trimmed) as unknown
    } catch {
      return trimmed
    }
  }

  if (typeof parsed !== 'object' || parsed == null) return null

  const record = parsed as Record<string, unknown>
  const nestedError = record.error
  if (nestedError && typeof nestedError === 'object') {
    const nestedMessage = (nestedError as { message?: unknown }).message
    if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
      return nestedMessage.trim()
    }
  }

  const message = record.message
  if (typeof message === 'string' && message.trim()) {
    return message.trim()
  }

  return null
}

/**
 * Gemma models on OpenRouter reject native system roles; fold them into user content.
 */
export function prepareOpenRouterMessages(
  model: string,
  messages: OpenRouterChatMessage[],
): OpenRouterChatMessage[] {
  const needsSystemFold = /\/gemma/i.test(model)
  if (!needsSystemFold) return messages

  const systemMessage = messages.find((message) => message.role === 'system')
  if (!systemMessage || typeof systemMessage.content !== 'string') return messages

  const conversationMessages = messages.filter((message) => message.role !== 'system')
  if (conversationMessages.length === 0) {
    return [{ role: 'user', content: systemMessage.content }]
  }

  const [firstMessage, ...rest] = conversationMessages
  if (firstMessage.role === 'user') {
    return [
      {
        role: 'user',
        content: `${systemMessage.content}\n\n---\n\n${firstMessage.content}`,
      },
      ...rest,
    ]
  }

  return [{ role: 'user', content: systemMessage.content }, ...conversationMessages]
}

/**
 * Builds a user-facing message from OpenRouter top-level or per-choice errors.
 */
function resolveOpenRouterErrorMessage(data: OpenRouterChatCompletionResponse | null): string | null {
  const choice = data?.choices?.[0]
  const metadata = data?.error?.metadata ?? choice?.error?.metadata
  const rawDetail = parseOpenRouterProviderRawError(metadata?.raw)
  const providerName =
    typeof metadata?.provider_name === 'string' ? metadata.provider_name : undefined

  const topLevel = data?.error?.message?.trim()
  const choiceError = choice?.error?.message?.trim()
  const genericMessage = topLevel ?? choiceError

  if (genericMessage && genericMessage !== 'Provider returned error') {
    return genericMessage
  }

  if (rawDetail) {
    return rawDetail
  }

  if (genericMessage) {
    return providerName ? `${genericMessage} (${providerName})` : genericMessage
  }

  if (choice?.finish_reason === 'error') {
    return providerName
      ? `The upstream model provider returned an error (${providerName}).`
      : 'The upstream model provider returned an error.'
  }

  return null
}

/**
 * Normalizes JSON Schema for OpenRouter tool definitions.
 * Some providers reject `integer`; OpenAI-compatible APIs expect `number`.
 */
function normalizeOpenRouterJsonSchema(schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') return schema

  const record = schema as Record<string, unknown>
  const next: Record<string, unknown> = { ...record }

  if (next.type === 'integer') {
    next.type = 'number'
  }

  if (next.properties && typeof next.properties === 'object') {
    const properties: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(next.properties as Record<string, unknown>)) {
      properties[key] = normalizeOpenRouterJsonSchema(value)
    }
    next.properties = properties
  }

  if (Array.isArray(next.items)) {
    next.items = next.items.map((item) => normalizeOpenRouterJsonSchema(item))
  } else if (next.items && typeof next.items === 'object') {
    next.items = normalizeOpenRouterJsonSchema(next.items)
  }

  return next
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
      parameters: normalizeOpenRouterJsonSchema(tool.function.parameters),
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

export interface OpenRouterCatalogModel {
  id: string
  name: string
  inputPerMillion: number | null
  outputPerMillion: number | null
}

interface OpenRouterModelsResponse {
  data?: Array<{
    id?: string
    name?: string
    pricing?: {
      prompt?: string
      completion?: string
    }
  }>
}

/** Returns true when a model slug is likely code-only and unsuitable for finance chat. */
function isCodingSpecializedModel(modelId: string): boolean {
  return /code|coder|codex|starcoder|deepseek-coder|embed|whisper|dall-e|image-preview|ocr|rerank/i.test(
    modelId,
  )
}

function pricingToPerMillion(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return null
  return parsed * 1_000_000
}

/**
 * Fetches OpenRouter model catalog for admin model picker (general chat models only).
 */
export async function fetchOpenRouterModels({
  baseUrl,
  apiKey,
}: {
  baseUrl: string
  apiKey: string
}): Promise<
  | { ok: true; models: OpenRouterCatalogModel[] }
  | { ok: false; error: string }
> {
  const trimmedKey = apiKey.trim()
  if (!trimmedKey) {
    return { ok: false, error: 'OpenRouter API key is required.' }
  }

  let response: Response
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
      method: 'GET',
      headers: buildOpenRouterHeaders(trimmedKey),
    })
  } catch {
    return { ok: false, error: 'Could not reach OpenRouter.' }
  }

  const payload = (await response.json().catch(() => null)) as OpenRouterModelsResponse | null
  if (!response.ok) {
    return {
      ok: false,
      error: formatAiProviderError(`OpenRouter error: ${response.status}`, 'openrouter'),
    }
  }

  const models =
    payload?.data
      ?.filter((entry) => typeof entry.id === 'string' && entry.id.trim())
      .filter((entry) => !isCodingSpecializedModel(entry.id!))
      .map((entry) => ({
        id: entry.id!.trim(),
        name: entry.name?.trim() || entry.id!.trim(),
        inputPerMillion: pricingToPerMillion(entry.pricing?.prompt),
        outputPerMillion: pricingToPerMillion(entry.pricing?.completion),
      }))
      .sort((left, right) => {
        const leftCost = left.outputPerMillion ?? Number.POSITIVE_INFINITY
        const rightCost = right.outputPerMillion ?? Number.POSITIVE_INFINITY
        return leftCost - rightCost
      }) ?? []

  return { ok: true, models }
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
  maxTokens = OPENROUTER_MAX_OUTPUT_TOKENS,
}: {
  baseUrl: string
  model: string
  apiKey: string
  messages: OpenRouterChatMessage[]
  tools: ReturnType<typeof getAiToolsForProvider>
  maxTokens?: number
}): Promise<
  | { ok: true; assistantText: string; toolCalls: OpenRouterToolCall[]; truncated: boolean }
  | { ok: false; error: string; status?: number }
> {
  const trimmedKey = apiKey.trim()
  if (!trimmedKey) {
    return { ok: false, error: 'OpenRouter API key is required.' }
  }

  const requestBody = {
    model,
    messages: prepareOpenRouterMessages(model, messages),
    tools: toOpenRouterTools(tools),
    tool_choice: 'auto' as const,
    temperature: 0.3,
    max_tokens: maxTokens,
    provider: {
      require_parameters: true,
      allow_fallbacks: true,
    },
  }

  let response: Response
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: buildOpenRouterHeaders(trimmedKey),
      body: JSON.stringify(requestBody),
    })
  } catch {
    return { ok: false, error: 'Could not reach OpenRouter.' }
  }

  const data = (await response.json().catch(() => null)) as OpenRouterChatCompletionResponse | null
  const providerError = resolveOpenRouterErrorMessage(data)

  if (!response.ok || providerError) {
    const rawMessage = providerError ?? `OpenRouter error: ${response.status}`
    const metadata = data?.error?.metadata ?? data?.choices?.[0]?.error?.metadata
    const providerName =
      typeof metadata?.provider_name === 'string' ? metadata.provider_name : undefined
    const modelName = typeof metadata?.model === 'string' ? metadata.model : undefined
    const detailSuffix = [providerName, modelName].filter(Boolean).join(' · ')

    return {
      ok: false,
      error: formatAiProviderError(
        detailSuffix ? `${rawMessage} (${detailSuffix})` : rawMessage,
        'openrouter',
      ),
      status: response.status,
    }
  }

  const choice = data?.choices?.[0]
  const message = choice?.message
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
    truncated: choice?.finish_reason === 'length',
  }
}
