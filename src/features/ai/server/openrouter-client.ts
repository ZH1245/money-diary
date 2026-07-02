import type { getAiToolsForProvider } from '#/features/ai/server/ai-tools'
import { formatAiProviderError } from '#/features/ai/server/format-ai-provider-error'
import { OpenRouter } from '@openrouter/sdk'
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
  id?: string
  choices?: Array<{
    message?: {
      content?: string | null
      toolCalls?: Array<{
        id?: string
        type?: string
        function?: { name?: string; arguments?: string }
      }>
      tool_calls?: Array<{
        id?: string
        type?: string
        function?: { name?: string; arguments?: string }
      }>
    }
    finishReason?: string | null
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
  usage?: {
    promptTokens?: number
    prompt_tokens?: number
    completionTokens?: number
    completion_tokens?: number
    totalTokens?: number
    total_tokens?: number
    cost?: number | null
    promptCost?: number | null
    prompt_cost?: number | null
    completionCost?: number | null
    completion_cost?: number | null
    promptTokensDetails?: {
      cachedTokens?: number
      cached_tokens?: number
    } | null
    prompt_tokens_details?: {
      cached_tokens?: number
    } | null
  }
}

interface OpenRouterSdkErrorPayload {
  error?: {
    message?: string
    metadata?: Record<string, unknown>
  }
}

export interface OpenRouterToolCall {
  id: string
  name: string
  arguments: unknown
}

export interface OpenRouterModelPricing {
  promptPricePerTokenUsd: number | null
  completionPricePerTokenUsd: number | null
}

export interface OpenRouterUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cachedTokens: number
  promptCostUsd: number
  completionCostUsd: number
  costUsd: number
  modelPromptPricePerTokenUsd: number | null
  modelCompletionPricePerTokenUsd: number | null
}

const OPENROUTER_CATALOG_CACHE_TTL_MS = 60 * 60 * 1000
const PRICING_MISMATCH_RELATIVE_TOLERANCE = 0.25
const openRouterCatalogCache = new Map<
  string,
  { pricingByModel: Map<string, OpenRouterModelPricing>; fetchedAt: number }
>()
const openRouterCatalogInflight = new Map<string, Promise<Map<string, OpenRouterModelPricing>>>()

function normalizeOpenRouterBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '')
}

function buildOpenRouterCatalogCacheKey(baseUrl: string, apiKey: string): string {
  return `${normalizeOpenRouterBaseUrl(baseUrl)}:${apiKey.trim()}`
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

/**
 * Drops cached catalog pricing so the next load fetches fresh rates from OpenRouter.
 */
function invalidateOpenRouterCatalogPricingCache(baseUrl: string, apiKey: string): void {
  const cacheKey = buildOpenRouterCatalogCacheKey(baseUrl, apiKey)
  openRouterCatalogCache.delete(cacheKey)
  openRouterCatalogInflight.delete(cacheKey)
}

/**
 * Loads the full OpenRouter models catalog once and caches per-token pricing by model id.
 * Refreshes automatically after OPENROUTER_CATALOG_CACHE_TTL_MS (1 hour).
 */
async function loadOpenRouterCatalogPricing({
  baseUrl,
  apiKey,
  forceRefresh = false,
}: {
  baseUrl: string
  apiKey: string
  forceRefresh?: boolean
}): Promise<Map<string, OpenRouterModelPricing>> {
  const trimmedKey = apiKey.trim()
  if (!trimmedKey) {
    return new Map()
  }

  const cacheKey = buildOpenRouterCatalogCacheKey(baseUrl, trimmedKey)

  if (forceRefresh) {
    invalidateOpenRouterCatalogPricingCache(baseUrl, trimmedKey)
  }

  const cached = openRouterCatalogCache.get(cacheKey)
  if (!forceRefresh && cached && Date.now() - cached.fetchedAt < OPENROUTER_CATALOG_CACHE_TTL_MS) {
    return cached.pricingByModel
  }

  const inflight = openRouterCatalogInflight.get(cacheKey)
  if (inflight) {
    return inflight
  }

  const request = (async () => {
    try {
      const client = createOpenRouterClient({ apiKey: trimmedKey, baseUrl })
      const response = (await client.models.list()) as OpenRouterModelsResponse
      const pricingByModel = new Map<string, OpenRouterModelPricing>()

      for (const entry of response.data ?? []) {
        if (typeof entry.id !== 'string') continue
        const modelId = entry.id.trim()
        if (!modelId) continue

        pricingByModel.set(modelId, {
          promptPricePerTokenUsd: pricingToPerToken(entry.pricing?.prompt),
          completionPricePerTokenUsd: pricingToPerToken(entry.pricing?.completion),
        })
      }

      openRouterCatalogCache.set(cacheKey, {
        pricingByModel,
        fetchedAt: Date.now(),
      })

      return pricingByModel
    } catch {
      return new Map<string, OpenRouterModelPricing>()
    } finally {
      openRouterCatalogInflight.delete(cacheKey)
    }
  })()

  openRouterCatalogInflight.set(cacheKey, request)
  return request
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function parseOpenRouterUsage(usage: OpenRouterChatCompletionResponse['usage']): OpenRouterUsage | null {
  if (!usage) return null

  const promptTokens = toFiniteNumber(usage.promptTokens ?? usage.prompt_tokens)
  const completionTokens = toFiniteNumber(usage.completionTokens ?? usage.completion_tokens)
  const totalTokensRaw = toFiniteNumber(usage.totalTokens ?? usage.total_tokens)

  if (promptTokens == null || completionTokens == null) return null

  const totalTokens = totalTokensRaw ?? promptTokens + completionTokens
  const cachedTokens = toFiniteNumber(
    usage.promptTokensDetails?.cachedTokens ??
      usage.promptTokensDetails?.cached_tokens ??
      usage.prompt_tokens_details?.cached_tokens,
  )

  const promptCostUsd = toFiniteNumber(usage.promptCost ?? usage.prompt_cost) ?? 0
  const completionCostUsd = toFiniteNumber(usage.completionCost ?? usage.completion_cost) ?? 0
  const combinedSplitCost = promptCostUsd + completionCostUsd
  const totalCostUsd = toFiniteNumber(usage.cost)

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    cachedTokens: cachedTokens ?? 0,
    promptCostUsd,
    completionCostUsd,
    costUsd: totalCostUsd ?? (combinedSplitCost > 0 ? combinedSplitCost : 0),
    modelPromptPricePerTokenUsd: null,
    modelCompletionPricePerTokenUsd: null,
  }
}

function pricingToPerToken(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Applies catalog per-token rates and fills missing split costs from token counts.
 */
export function enrichOpenRouterUsageWithPricing(
  usage: OpenRouterUsage,
  pricing: OpenRouterModelPricing,
): OpenRouterUsage {
  const promptCostUsd =
    usage.promptCostUsd > 0
      ? usage.promptCostUsd
      : pricing.promptPricePerTokenUsd != null
        ? usage.promptTokens * pricing.promptPricePerTokenUsd
        : 0

  const completionCostUsd =
    usage.completionCostUsd > 0
      ? usage.completionCostUsd
      : pricing.completionPricePerTokenUsd != null
        ? usage.completionTokens * pricing.completionPricePerTokenUsd
        : 0

  const costUsd = usage.costUsd > 0 ? usage.costUsd : promptCostUsd + completionCostUsd

  return {
    ...usage,
    promptCostUsd,
    completionCostUsd,
    costUsd,
    modelPromptPricePerTokenUsd: pricing.promptPricePerTokenUsd,
    modelCompletionPricePerTokenUsd: pricing.completionPricePerTokenUsd,
  }
}

/**
 * Estimates cost from catalog per-token rates (audit/fallback only).
 */
function estimateCostFromCatalogPricing(
  usage: Pick<OpenRouterUsage, 'promptTokens' | 'completionTokens'>,
  pricing: OpenRouterModelPricing,
): number | null {
  if (pricing.promptPricePerTokenUsd == null || pricing.completionPricePerTokenUsd == null) {
    return null
  }

  return (
    usage.promptTokens * pricing.promptPricePerTokenUsd +
    usage.completionTokens * pricing.completionPricePerTokenUsd
  )
}

/**
 * True when cached catalog rates look stale vs OpenRouter-reported usage.cost.
 * Skips cached-token rows because flat catalog rates do not include cache discounts.
 */
function shouldRefreshCatalogForPricingMismatch(
  usage: OpenRouterUsage,
  pricing: OpenRouterModelPricing,
): boolean {
  if (usage.costUsd <= 0) return false
  if (usage.cachedTokens > 0) return false

  const estimated = estimateCostFromCatalogPricing(usage, pricing)
  if (estimated == null || estimated <= 0) return false

  const reference = Math.max(usage.costUsd, estimated)
  const relativeDiff = Math.abs(estimated - usage.costUsd) / reference
  return relativeDiff > PRICING_MISMATCH_RELATIVE_TOLERANCE
}

/**
 * Enriches usage with catalog pricing. Refreshes catalog at most once per call when rates look stale.
 * Billable cost always prefers OpenRouter usage.cost when present.
 */
async function resolveOpenRouterUsageWithPricing({
  parsedUsage,
  baseUrl,
  apiKey,
  model,
}: {
  parsedUsage: OpenRouterUsage
  baseUrl: string
  apiKey: string
  model: string
}): Promise<OpenRouterUsage> {
  let pricing = await getOpenRouterModelPricing({ baseUrl, apiKey, model })

  if (shouldRefreshCatalogForPricingMismatch(parsedUsage, pricing)) {
    await loadOpenRouterCatalogPricing({ baseUrl, apiKey, forceRefresh: true })
    pricing = await getOpenRouterModelPricing({ baseUrl, apiKey, model })
  }

  return enrichOpenRouterUsageWithPricing(parsedUsage, pricing)
}

/**
 * Fetches OpenRouter model input/output per-token USD rates from cached catalog.
 */
export async function getOpenRouterModelPricing({
  baseUrl,
  apiKey,
  model,
}: {
  baseUrl: string
  apiKey: string
  model: string
}): Promise<OpenRouterModelPricing> {
  const catalog = await loadOpenRouterCatalogPricing({ baseUrl, apiKey })
  return (
    catalog.get(model) ?? {
      promptPricePerTokenUsd: null,
      completionPricePerTokenUsd: null,
    }
  )
}

function createOpenRouterClient({
  apiKey,
  baseUrl,
  timeoutMs,
}: {
  apiKey: string
  baseUrl: string
  timeoutMs?: number
}) {
  return new OpenRouter({
    apiKey,
    serverURL: baseUrl.replace(/\/$/, ''),
    timeoutMs,
    httpReferer: PRODUCTION_SITE_ORIGIN,
    appTitle: 'Money Diary',
  })
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

  const finishReason = choice?.finishReason ?? choice?.finish_reason
  if (finishReason === 'error') {
    return providerName
      ? `The upstream model provider returned an error (${providerName}).`
      : 'The upstream model provider returned an error.'
  }

  return null
}

function parseOpenRouterSdkError(error: unknown): {
  message: string
  status: number | null
  metadata?: Record<string, unknown>
} {
  if (typeof error !== 'object' || error == null) {
    return { message: 'Could not reach OpenRouter.', status: null }
  }

  const maybeError = error as {
    message?: unknown
    statusCode?: unknown
    body?: unknown
  }
  const statusCode = typeof maybeError.statusCode === 'number' ? maybeError.statusCode : null
  const fallbackMessage = typeof maybeError.message === 'string' ? maybeError.message : 'Could not reach OpenRouter.'

  let parsedBody: OpenRouterSdkErrorPayload | null = null
  if (typeof maybeError.body === 'string' && maybeError.body.trim()) {
    try {
      parsedBody = JSON.parse(maybeError.body) as OpenRouterSdkErrorPayload
    } catch {
      parsedBody = null
    }
  }

  const metadata = parsedBody?.error?.metadata
  const providerRaw = parseOpenRouterProviderRawError(metadata?.raw)
  const genericError = parsedBody?.error?.message?.trim()
  const message =
    providerRaw ??
    (genericError && genericError !== 'Provider returned error' ? genericError : null) ??
    fallbackMessage

  return {
    message,
    status: statusCode,
    metadata: metadata && typeof metadata === 'object' ? metadata : undefined,
  }
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
      parameters: normalizeOpenRouterJsonSchema(tool.function.parameters) as Record<string, unknown>,
    },
  }))
}

function toSdkChatMessages(messages: OpenRouterChatMessage[]) {
  return messages.map((message) => {
    if (message.role === 'assistant') {
      return {
        role: 'assistant' as const,
        content: message.content ?? null,
        toolCalls:
          message.tool_calls?.map((toolCall) => ({
            id: toolCall.id,
            type: 'function' as const,
            function: {
              name: toolCall.function.name,
              arguments: toolCall.function.arguments,
            },
          })) ?? [],
      }
    }

    if (message.role === 'tool') {
      return {
        role: 'tool' as const,
        content: message.content,
        toolCallId: message.tool_call_id,
      }
    }

    return {
      role: message.role,
      content: message.content,
    }
  })
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
  const client = createOpenRouterClient({
    apiKey: trimmedKey,
    baseUrl,
    timeoutMs,
  })

  try {
    await client.models.list(undefined, { timeoutMs })
    return {
      ok: true,
      statusCode: 200,
      message: 'OpenRouter API key is valid.',
    }
  } catch (error) {
    const parsed = parseOpenRouterSdkError(error)
    if (error instanceof Error && error.name === 'RequestTimeoutError') {
      return { ok: false, statusCode: null, message: 'Connection timed out. Check the URL and network.' }
    }

    return {
      ok: false,
      statusCode: parsed.status,
      message: formatAiProviderError(parsed.message, 'openrouter'),
    }
  }
}

export interface OpenRouterCatalogModel {
  id: string
  name: string
  inputPerMillion: number | null
  outputPerMillion: number | null
}

/** Returns true when a model slug is likely code-only and unsuitable for finance chat. */
function isCodingSpecializedModel(modelId: string): boolean {
  return /code|coder|codex|starcoder|deepseek-coder|embed|whisper|dall-e|image-preview|ocr|rerank/i.test(
    modelId,
  )
}

function pricingToPerMillion(value: string | undefined): number | null {
  const perToken = pricingToPerToken(value)
  return perToken == null ? null : perToken * 1_000_000
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
  const client = createOpenRouterClient({
    apiKey: trimmedKey,
    baseUrl,
  })

  let payload: OpenRouterModelsResponse | null = null
  try {
    const response = await client.models.list()
    payload = response as OpenRouterModelsResponse
  } catch (error) {
    const parsed = parseOpenRouterSdkError(error)
    return {
      ok: false,
      error: formatAiProviderError(parsed.message, 'openrouter'),
    }
  }

  const models =
    payload?.data
      ?.flatMap((entry) => {
        if (typeof entry.id !== 'string') return []
        const normalizedId = entry.id.trim()
        if (!normalizedId) return []
        if (isCodingSpecializedModel(normalizedId)) return []
        return [
          {
            id: normalizedId,
            name: entry.name?.trim() || normalizedId,
            inputPerMillion: pricingToPerMillion(entry.pricing?.prompt),
            outputPerMillion: pricingToPerMillion(entry.pricing?.completion),
          },
        ]
      })
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
  sessionId,
}: {
  baseUrl: string
  model: string
  apiKey: string
  messages: OpenRouterChatMessage[]
  tools: ReturnType<typeof getAiToolsForProvider>
  maxTokens?: number
  sessionId?: string
}): Promise<
  | {
      ok: true
      assistantText: string
      toolCalls: OpenRouterToolCall[]
      truncated: boolean
      generationId: string | null
      usage: OpenRouterUsage | null
    }
  | { ok: false; error: string; status?: number }
> {
  const trimmedKey = apiKey.trim()
  if (!trimmedKey) {
    return { ok: false, error: 'OpenRouter API key is required.' }
  }

  const client = createOpenRouterClient({
    apiKey: trimmedKey,
    baseUrl,
  })

  let data: OpenRouterChatCompletionResponse | null = null
  try {
    const response = await client.chat.send({
      xOpenRouterMetadata: 'enabled',
      chatRequest: {
        stream: false,
        model,
        messages: toSdkChatMessages(prepareOpenRouterMessages(model, messages)),
        tools: toOpenRouterTools(tools),
        toolChoice: 'auto',
        temperature: 0.3,
        maxTokens,
        sessionId,
        provider: {
          requireParameters: true,
          allowFallbacks: true,
        },
      },
    })
    data = response as OpenRouterChatCompletionResponse
  } catch (error) {
    const parsed = parseOpenRouterSdkError(error)
    const providerName =
      typeof parsed.metadata?.provider_name === 'string' ? parsed.metadata.provider_name : undefined
    const modelName = typeof parsed.metadata?.model === 'string' ? parsed.metadata.model : undefined
    const detailSuffix = [providerName, modelName].filter(Boolean).join(' · ')
    return {
      ok: false,
      error: formatAiProviderError(
        detailSuffix ? `${parsed.message} (${detailSuffix})` : parsed.message,
        'openrouter',
      ),
      status: parsed.status ?? undefined,
    }
  }

  const providerError = resolveOpenRouterErrorMessage(data)
  if (providerError) {
    return {
      ok: false,
      error: formatAiProviderError(providerError, 'openrouter'),
      status: 502,
    }
  }

  const choice = data.choices?.[0]
  const message = choice?.message
  const assistantText = typeof message?.content === 'string' ? message.content.trim() : ''
  const sdkToolCalls = message?.toolCalls ?? message?.tool_calls
  const toolCalls =
    sdkToolCalls?.map((toolCall, index) => ({
      id: toolCall.id ?? `tool_call_${index}`,
      name: toolCall.function?.name ?? '',
      arguments: parseToolArguments(toolCall.function?.arguments),
    })) ?? []

  const parsedUsage = parseOpenRouterUsage(data.usage)
  const usage = parsedUsage
    ? await resolveOpenRouterUsageWithPricing({
        parsedUsage,
        baseUrl,
        apiKey: trimmedKey,
        model,
      })
    : null

  return {
    ok: true,
    assistantText,
    toolCalls: toolCalls.filter((toolCall) => toolCall.name),
    truncated: (choice?.finishReason ?? choice?.finish_reason) === 'length',
    generationId: typeof data.id === 'string' ? data.id : null,
    usage,
  }
}
