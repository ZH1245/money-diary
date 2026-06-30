import { buildProductKnowledgeAnswer, isPrimarilyProductQuestion } from '#/features/ai/utils/product-knowledge'
import { buildLegalPolicyAnswer, isPrimarilyLegalQuestion } from '#/features/legal/utils/legal-knowledge'
import { getAiToolsForProvider } from '#/features/ai/server/ai-tools'
import { resolveAiProviderForUser } from '#/features/admin/server/resolve-ai-provider'
import { buildSecureSystemPrompt } from '#/features/ai/server/ai-prompt-builder'
import { sanitizeChatMessages } from '#/features/ai/server/ai-history-window'
import {
  evaluateAbuseState,
  detectPromptInjection,
  recordAbuseStrike,
  sanitizeAssistantUserFacingMessage,
  validateChatMessages,
} from '#/features/ai/server/ai-security'
import { executeAiTool, loadUserAiContext } from '#/features/ai/server/ai-tool-executor'
import type { AiToolAction } from '#/features/ai/server/ai-tools'
import {
  buildOllamaRequestHeaders,
  extractOllamaAssistantText,
  formatOllamaHttpError,
} from '#/features/ai/server/ollama-client'
import {
  callGeminiChat,
  DEFAULT_GEMINI_BASE_URL,
  type GeminiChatMessage,
} from '#/features/ai/server/gemini-client'
import {
  callOpenRouterChat,
  DEFAULT_OPENROUTER_BASE_URL,
  type OpenRouterChatMessage,
} from '#/features/ai/server/openrouter-client'
import type { LiveAiProviderId } from '#/features/settings/constants/ai-provider-ids'
import {
  isWeakAssistantReply,
  resolveFallbackToolInvocation,
} from '#/features/ai/server/ai-tool-fallback'
import { formatAiProviderError } from '#/features/ai/server/format-ai-provider-error'
import { resolveBulkChatRuntimeLimits } from '#/features/ai/utils/ai-bulk-paste'
import { triggerPusher } from '#/lib/server/pusher'

interface ProviderGenerationLimits {
  maxOutputTokens: number
  ollamaNumPredict: number
}

export interface AiChatStep {
  action: AiToolAction
  success: boolean
  message: string
  entityId?: number
  navigateTo?: string
  duplicate?: boolean
}

export interface AiChatServiceResult {
  success: boolean
  action?: AiToolAction | 'clarification' | 'chained' | 'provider_error'
  message?: string
  steps?: AiChatStep[]
  navigateTo?: string
  blocked?: boolean
  closeChat?: boolean
  warning?: string
  error?: string
}

interface OllamaToolCall {
  function: {
    name: string
    arguments: unknown
  }
}

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  thinking?: string
  tool_calls?: OllamaToolCall[]
  tool_name?: string
}

interface OllamaResponse {
  message?: OllamaChatMessage
  done_reason?: string
}

interface ProviderToolCall {
  id?: string
  name: string
  arguments: unknown
}

interface ProviderChatState {
  provider: LiveAiProviderId
  ollamaMessages: OllamaChatMessage[]
  geminiMessages: GeminiChatMessage[]
  openrouterMessages: OpenRouterChatMessage[]
}

/**
 * Parses tool arguments when providers return JSON as a string.
 */
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
 * Normalizes tool calls from an Ollama assistant message.
 */
function extractOllamaToolCalls(message: OllamaChatMessage | undefined): ProviderToolCall[] {
  if (!message?.tool_calls?.length) return []
  return message.tool_calls.map((toolCall) => ({
    name: toolCall.function.name,
    arguments: parseToolArguments(toolCall.function.arguments),
  }))
}

/**
 * Calls Ollama chat API with the current message thread.
 */
async function callOllamaChat({
  baseUrl,
  model,
  apiKey,
  messages,
  tools,
  numPredict = 4096,
}: {
  baseUrl: string
  model: string
  apiKey: string | null
  messages: OllamaChatMessage[]
  tools: ReturnType<typeof getAiToolsForProvider>
  numPredict?: number
}): Promise<
  | { ok: true; assistantText: string; toolCalls: ProviderToolCall[]; truncated: boolean }
  | { ok: false; error: string; status?: number }
> {
  let response: Response
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: buildOllamaRequestHeaders({ baseUrl, apiKey }),
      body: JSON.stringify({
        model,
        stream: false,
        think: false,
        messages,
        tools,
        options: {
          num_predict: numPredict,
          temperature: 0.3,
        },
      }),
    })
  } catch {
    return { ok: false, error: `Could not reach Ollama at ${baseUrl}.` }
  }

  if (!response.ok) {
    return { ok: false, error: formatOllamaHttpError(response.status, baseUrl), status: response.status }
  }

  const data = (await response.json()) as OllamaResponse
  const assistantMessage = data.message

  return {
    ok: true,
    assistantText: extractOllamaAssistantText(assistantMessage),
    toolCalls: extractOllamaToolCalls(assistantMessage),
    truncated: data.done_reason === 'length',
  }
}

/**
 * Dispatches one provider chat turn and returns normalized assistant output.
 */
async function callProviderChat({
  provider,
  systemPrompt,
  state,
  settings,
  tools,
  generationLimits,
}: {
  provider: LiveAiProviderId
  systemPrompt: string
  state: ProviderChatState
  settings: {
    baseUrl: string
    model: string
    models?: string[]
    apiKey: string | null
  }
  tools: ReturnType<typeof getAiToolsForProvider>
  generationLimits: ProviderGenerationLimits
}): Promise<
  | { ok: true; assistantText: string; toolCalls: ProviderToolCall[]; truncated: boolean }
  | { ok: false; error: string; status?: number }
> {
  if (provider === 'gemini') {
    return callGeminiChat({
      baseUrl: settings.baseUrl || DEFAULT_GEMINI_BASE_URL,
      model: settings.model,
      apiKey: settings.apiKey ?? '',
      systemPrompt,
      messages: state.geminiMessages,
      tools,
      maxOutputTokens: generationLimits.maxOutputTokens,
    })
  }

  if (provider === 'openrouter') {
    const result = await callOpenRouterChat({
      baseUrl: settings.baseUrl || DEFAULT_OPENROUTER_BASE_URL,
      model: settings.model,
      apiKey: settings.apiKey ?? '',
      messages: state.openrouterMessages,
      tools,
      maxTokens: generationLimits.maxOutputTokens,
    })

    if (!result.ok) return result

    return {
      ok: true,
      assistantText: result.assistantText,
      toolCalls: result.toolCalls.map((toolCall) => ({
        id: toolCall.id,
        name: toolCall.name,
        arguments: toolCall.arguments,
      })),
      truncated: result.truncated,
    }
  }

  return callOllamaChat({
    baseUrl: settings.baseUrl,
    model: settings.model,
    apiKey: settings.apiKey,
    messages: state.ollamaMessages,
    tools,
    numPredict: generationLimits.ollamaNumPredict,
  })
}

/**
 * Returns true for errors that are worth retrying (transient model/network failures).
 * Auth failures, config errors, and permanent rejections are not retried.
 */
function isRetryableProviderError(error: string): boolean {
  if (/api key|invalid.*key|permission denied|unauthorized/i.test(error)) return false
  if (/insufficient credits|requires more credits|payment required/i.test(error)) return false
  if (/no endpoints found that support tool/i.test(error)) return false
  if (/developer instruction is not enabled|system instruction is not enabled/i.test(error)) return false
  return true
}

/**
 * Calls the provider with per-model retry, then cycles OpenRouter models on failure.
 */
async function callProviderChatWithRetry(
  params: Parameters<typeof callProviderChat>[0],
): ReturnType<typeof callProviderChat> {
  const models =
    params.provider === 'openrouter' && params.settings.models?.length
      ? params.settings.models
      : [params.settings.model]

  let lastError = 'Provider request failed.'

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = await callProviderChat({
        ...params,
        settings: { ...params.settings, model },
      })

      if (result.ok) {
        return result
      }

      lastError = result.error
      if (!isRetryableProviderError(result.error)) {
        break
      }

      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1500))
      }
    }
  }

  return { ok: false, error: lastError }
}

/**
 * Appends assistant and tool messages to the active provider thread.
 */
function appendProviderTurn({
  state,
  assistantText,
  toolCalls,
  toolResults,
}: {
  state: ProviderChatState
  assistantText: string
  toolCalls: ProviderToolCall[]
  toolResults: Array<{ toolName: string; content: string }>
}) {
  if (state.provider === 'gemini') {
    if (toolCalls.length === 0) {
      if (assistantText) {
        state.geminiMessages.push({
          role: 'model',
          parts: [{ text: assistantText }],
        })
      }
      return
    }

    state.geminiMessages.push({
      role: 'model',
      parts: toolCalls.map((toolCall) => ({
        functionCall: {
          name: toolCall.name,
          args:
            typeof toolCall.arguments === 'object' && toolCall.arguments != null
              ? (toolCall.arguments as Record<string, unknown>)
              : {},
        },
      })),
    })

    for (const result of toolResults) {
      state.geminiMessages.push({
        role: 'function',
        parts: [
          {
            functionResponse: {
              name: result.toolName,
              response: JSON.parse(result.content) as Record<string, unknown>,
            },
          },
        ],
      })
    }
    return
  }

  if (state.provider === 'openrouter') {
    state.openrouterMessages.push({
      role: 'assistant',
      content: assistantText || undefined,
      tool_calls: toolCalls.map((toolCall, index) => ({
        id: toolCall.id ?? `tool_call_${index}`,
        type: 'function' as const,
        function: {
          name: toolCall.name,
          arguments:
            typeof toolCall.arguments === 'string'
              ? toolCall.arguments
              : JSON.stringify(toolCall.arguments ?? {}),
        },
      })),
    })

    for (const result of toolResults) {
      const matchingCall = toolCalls.find((toolCall) => toolCall.name === result.toolName)
      state.openrouterMessages.push({
        role: 'tool',
        tool_call_id: matchingCall?.id ?? `tool_call_${toolResults.indexOf(result)}`,
        content: result.content,
      })
    }
    return
  }

  state.ollamaMessages.push({
    role: 'assistant',
    content: assistantText,
    tool_calls: toolCalls.map((toolCall) => ({
      function: {
        name: toolCall.name,
        arguments: toolCall.arguments,
      },
    })),
  })

  for (const result of toolResults) {
    state.ollamaMessages.push({
      role: 'tool',
      tool_name: result.toolName,
      content: result.content,
    })
  }
}

/**
 * Builds initial provider thread state from sanitized user/assistant history.
 */
function buildProviderChatState({
  provider,
  systemPrompt,
  sanitized,
}: {
  provider: LiveAiProviderId
  systemPrompt: string
  sanitized: Array<{ role: 'user' | 'assistant'; content: string }>
}): ProviderChatState {
  if (provider === 'gemini') {
    return {
      provider,
      ollamaMessages: [],
      geminiMessages: sanitized.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      })),
      openrouterMessages: [],
    }
  }

  if (provider === 'openrouter') {
    return {
      provider,
      ollamaMessages: [],
      geminiMessages: [],
      openrouterMessages: [
        { role: 'system', content: systemPrompt },
        ...sanitized.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    }
  }

  return {
    provider,
    ollamaMessages: [{ role: 'system', content: systemPrompt }, ...sanitized],
    geminiMessages: [],
    openrouterMessages: [],
  }
}

/**
 * Emits a minimal AI progress event to the user's private Pusher channel.
 * No-ops when Pusher is disabled. Errors are swallowed — progress is best-effort.
 */
async function emitAiProgress(
  userId: string,
  data:
    | { phase: 'thinking' }
    | { phase: 'step'; action: string; index: number; total: number }
    | { phase: 'done' },
): Promise<void> {
  await triggerPusher(`private-user-${userId}`, 'ai_progress', data).catch(() => undefined)
}

/**
 * Runs secure AI chat with multi-step tool chaining for one authenticated user.
 */
export async function runAiChat({
  userId,
  currency,
  messages,
}: {
  userId: string
  currency: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}): Promise<AiChatServiceResult> {
  const abuseState = await evaluateAbuseState(userId)
  if (!abuseState.allowed) {
    return {
      success: false,
      blocked: true,
      closeChat: abuseState.closeChat,
      error: abuseState.reason ?? 'Chat is temporarily unavailable.',
    }
  }

  const validation = validateChatMessages(messages)
  if (!validation.allowed) {
    const lastUser = messages.filter((message) => message.role === 'user').at(-1)
    if (lastUser && detectPromptInjection(lastUser.content)) {
      const strike = await recordAbuseStrike(userId)
      return {
        success: false,
        blocked: true,
        closeChat: strike.closeChat,
        error: strike.reason ?? validation.reason ?? 'Unsafe request blocked.',
        warning: strike.warning,
      }
    }

    return {
      success: false,
      error: validation.reason ?? 'Request not allowed.',
    }
  }

  const lastUserMessage = messages.filter((message) => message.role === 'user').at(-1)
  const today = new Date().toISOString().split('T')[0]
  const bulkRuntime = resolveBulkChatRuntimeLimits(lastUserMessage?.content ?? '')
  const generationLimits: ProviderGenerationLimits = {
    maxOutputTokens: bulkRuntime.maxOutputTokens,
    ollamaNumPredict: bulkRuntime.ollamaNumPredict,
  }
  const maxToolChainSteps = bulkRuntime.toolChainSteps

  if (lastUserMessage && isPrimarilyLegalQuestion(lastUserMessage.content)) {
    return {
      success: true,
      action: 'clarification',
      message: buildLegalPolicyAnswer(lastUserMessage.content),
    }
  }

  if (lastUserMessage && isPrimarilyProductQuestion(lastUserMessage.content)) {
    return {
      success: true,
      action: 'clarification',
      message: buildProductKnowledgeAnswer(lastUserMessage.content),
    }
  }

  const resolved = await resolveAiProviderForUser(userId).catch((error) => {
    const message = error instanceof Error ? error.message : 'Unable to load AI provider settings'
    return {
      error: formatAiProviderError(message),
    } as const
  })

  if ('error' in resolved) {
    return {
      success: false,
      action: 'provider_error',
      error: resolved.error,
    }
  }

  const runtime = {
    provider: resolved.provider,
    baseUrl: resolved.baseUrl,
    model: resolved.model,
    models: resolved.models,
    apiKey: resolved.apiKey,
  }
  const isOllamaProvider = runtime.provider === 'ollama'
  const aiTools = getAiToolsForProvider(runtime.provider)

  const userContext = await loadUserAiContext(userId)
  const systemPrompt = buildSecureSystemPrompt({
    today,
    ledgerCurrency: currency,
    categoryList: userContext.categoryList,
    accountList: userContext.accountList,
    goalList: userContext.goalList,
    wishlistList: userContext.wishlistList,
    recurringList: userContext.recurringList,
    includeExchangeRateTool: isOllamaProvider,
    bulkPasteMode: bulkRuntime.isBulkPaste,
  })

  const sanitized = sanitizeChatMessages(messages)
  const chatState = buildProviderChatState({
    provider: runtime.provider,
    systemPrompt,
    sanitized,
  })

  const executedSteps: AiChatStep[] = []
  let truncationWarning: string | undefined

  void emitAiProgress(userId, { phase: 'thinking' })

  for (let step = 0; step < maxToolChainSteps; step += 1) {
    const providerResult = await callProviderChatWithRetry({
      provider: runtime.provider,
      systemPrompt,
      state: chatState,
      settings: runtime,
      tools: aiTools,
      generationLimits,
    })

    if (!providerResult.ok) {
      const providerLabel =
        runtime.provider === 'gemini'
          ? 'Gemini'
          : runtime.provider === 'openrouter'
            ? 'OpenRouter'
            : 'Ollama'
      const rawError = providerResult.error.includes(providerLabel)
        ? providerResult.error
        : `${providerLabel}: ${providerResult.error}`

      void emitAiProgress(userId, { phase: 'done' })
      return {
        success: false,
        action: 'provider_error',
        error: formatAiProviderError(rawError, runtime.provider),
        steps: executedSteps.length > 0 ? executedSteps : undefined,
      }
    }

    if (providerResult.truncated) {
      truncationWarning = bulkRuntime.isBulkPaste
        ? 'The model response was truncated while processing your list. Say "continue" to log remaining rows.'
        : 'The model response was truncated. Try a shorter question or a larger model.'
    }

    const toolCalls = providerResult.toolCalls
    const reply = sanitizeAssistantUserFacingMessage(providerResult.assistantText)

    if (toolCalls.length === 0) {
      if (executedSteps.length > 0) {
        void emitAiProgress(userId, { phase: 'done' })
        return {
          success: executedSteps.every((entry) => entry.success),
          action: executedSteps.length === 1 ? executedSteps[0].action : 'chained',
          message: reply || summarizeSteps(executedSteps, { bulkPaste: bulkRuntime.isBulkPaste }),
          steps: executedSteps,
          navigateTo: pickNavigateTo(executedSteps),
          warning: truncationWarning,
        }
      }

      if (step === 0 && isWeakAssistantReply(reply)) {
        const fallback = resolveFallbackToolInvocation(messages, today)
        if (fallback) {
          const stepResult = await executeAiTool({
            toolName: fallback.toolName,
            toolArgs: fallback.toolArgs,
            context: {
              userId,
              currency,
              today,
              userGoals: userContext.userGoals,
            },
          })

          if (stepResult.success) {
            void emitAiProgress(userId, { phase: 'done' })
            return {
              success: true,
              action: stepResult.action,
              message: stepResult.message,
              steps: [stepResult],
              warning: truncationWarning,
            }
          }
        }
      }

      const fallbackMessage = resolveClarificationFallback(messages)

      void emitAiProgress(userId, { phase: 'done' })
      return {
        success: true,
        action: 'clarification',
        message: reply || fallbackMessage,
        warning: truncationWarning,
      }
    }

    const toolResults: Array<{ toolName: string; content: string }> = []
    const total = toolCalls.length

    for (let toolIndex = 0; toolIndex < toolCalls.length; toolIndex += 1) {
      const toolCall = toolCalls[toolIndex]!
      const stepResult = await executeAiTool({
        toolName: toolCall.name,
        toolArgs: toolCall.arguments,
        context: {
          userId,
          currency,
          today,
          userGoals: userContext.userGoals,
        },
      })

      executedSteps.push({
        action: stepResult.action,
        success: stepResult.success,
        message: stepResult.message,
        entityId: stepResult.entityId,
        navigateTo: stepResult.navigateTo,
        duplicate: stepResult.duplicate,
      })

      void emitAiProgress(userId, {
        phase: 'step',
        action: stepResult.action,
        index: executedSteps.length,
        total,
      })

      toolResults.push({
        toolName: toolCall.name,
        content: JSON.stringify({
          success: stepResult.success,
          message: stepResult.message,
          ...(stepResult.duplicate ? { duplicate: true } : {}),
          ...(stepResult.data ?? {}),
        }),
      })
    }

    appendProviderTurn({
      state: chatState,
      assistantText: providerResult.assistantText,
      toolCalls,
      toolResults,
    })
  }

  void emitAiProgress(userId, { phase: 'done' })
  return {
    success: executedSteps.some((entry) => entry.success),
    action: executedSteps.length === 1 ? executedSteps[0].action : 'chained',
    message: summarizeSteps(executedSteps, { bulkPaste: bulkRuntime.isBulkPaste, hitStepLimit: true }),
    steps: executedSteps,
    navigateTo: pickNavigateTo(executedSteps),
    warning:
      truncationWarning ??
      (bulkRuntime.isBulkPaste
        ? 'Logged what fit in this batch. Say "continue" to process remaining rows from your list.'
        : 'Stopped after maximum tool steps. Review results and continue if needed.'),
  }
}

/**
 * Builds a fallback clarification when the model returns an empty reply.
 */
function resolveClarificationFallback(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
): string {
  const lastUser = messages.filter((message) => message.role === 'user').at(-1)
  if (!lastUser) {
    return 'I did not understand. Please try again.'
  }

  if (isPrimarilyLegalQuestion(lastUser.content)) {
    return buildLegalPolicyAnswer(lastUser.content)
  }

  if (isPrimarilyProductQuestion(lastUser.content)) {
    return buildProductKnowledgeAnswer(lastUser.content)
  }

  return 'I did not understand. Please try again.'
}

/**
 * Picks the route for the last successful write in a tool chain.
 */
function pickNavigateTo(steps: AiChatStep[]): string | undefined {
  const successfulWrites = steps.filter((step) => step.success && step.navigateTo)
  return successfulWrites.at(-1)?.navigateTo
}

/**
 * Builds a short user-facing summary from chained tool results.
 */
function summarizeSteps(
  steps: AiChatStep[],
  options?: { bulkPaste?: boolean; hitStepLimit?: boolean },
): string {
  const successes = steps.filter((step) => step.success)
  const duplicates = steps.filter((step) => step.duplicate)
  const failures = steps.filter((step) => !step.success && !step.duplicate)

  if (options?.bulkPaste || steps.length > 3) {
    const lines = [`Logged ${successes.length} entr${successes.length === 1 ? 'y' : 'ies'}.`]

    if (duplicates.length > 0) {
      lines.push(`${duplicates.length} already on file (skipped):`)
      for (const step of duplicates) {
        lines.push(`↷ ${step.message}`)
      }
      lines.push('Reply to skip these, rename one with update_transaction, or say which rows to log anyway.')
    }

    if (failures.length > 0) {
      lines.push(`${failures.length} need attention:`)
      for (const step of failures) {
        lines.push(`✗ ${step.message}`)
      }
    }

    if (options?.hitStepLimit) {
      lines.push('Say "continue" if more rows from your paste are still pending.')
    }

    return lines.join('\n')
  }

  return steps
    .map((step) => {
      if (step.duplicate) {
        return `↷ ${step.message}`
      }
      return `${step.success ? '✓' : '✗'} ${step.message}`
    })
    .join('\n')
}
