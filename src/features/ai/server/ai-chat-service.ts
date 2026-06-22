import { buildLegalPolicyAnswer, isPrimarilyLegalQuestion } from '#/features/legal/utils/legal-knowledge'
import { getAiToolsForProvider } from '#/features/ai/server/ai-tools'
import {
  buildSecureSystemPrompt,
  evaluateAbuseState,
  detectPromptInjection,
  recordAbuseStrike,
  sanitizeAssistantUserFacingMessage,
  sanitizeChatMessages,
  validateChatMessages,
} from '#/features/ai/server/ai-security'
import { executeAiTool, loadUserAiContext } from '#/features/ai/server/ai-tool-executor'
import type { AiToolAction } from '#/features/ai/server/ai-tools'
import { getUserAiSettingsForRuntime } from '#/features/settings/server/settings-repository'
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
  isWeakAssistantReply,
  resolveFallbackToolInvocation,
} from '#/features/ai/server/ai-tool-fallback'
import { formatAiProviderError } from '#/features/ai/server/format-ai-provider-error'

const MAX_TOOL_CHAIN_STEPS = 5

export interface AiChatStep {
  action: AiToolAction
  success: boolean
  message: string
  entityId?: number
  navigateTo?: string
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
  name: string
  arguments: unknown
}

type AiProviderId = 'ollama' | 'gemini'

interface ProviderChatState {
  provider: AiProviderId
  ollamaMessages: OllamaChatMessage[]
  geminiMessages: GeminiChatMessage[]
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
}: {
  baseUrl: string
  model: string
  apiKey: string | null
  messages: OllamaChatMessage[]
  tools: ReturnType<typeof getAiToolsForProvider>
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
          num_predict: 4096,
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
}: {
  provider: AiProviderId
  systemPrompt: string
  state: ProviderChatState
  settings: {
    baseUrl: string
    model: string
    apiKey: string | null
  }
  tools: ReturnType<typeof getAiToolsForProvider>
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
    })
  }

  return callOllamaChat({
    baseUrl: settings.baseUrl,
    model: settings.model,
    apiKey: settings.apiKey,
    messages: state.ollamaMessages,
    tools,
  })
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
  provider: AiProviderId
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
    }
  }

  return {
    provider,
    ollamaMessages: [{ role: 'system', content: systemPrompt }, ...sanitized],
    geminiMessages: [],
  }
}

/**
 * Resolves runtime provider settings with sensible defaults.
 */
function resolveProviderRuntime(
  aiSettings: Awaited<ReturnType<typeof getUserAiSettingsForRuntime>>,
): {
  provider: AiProviderId
  baseUrl: string
  model: string
  apiKey: string | null
} {
  const provider: AiProviderId = aiSettings?.provider === 'gemini' ? 'gemini' : 'ollama'

  if (provider === 'gemini') {
    return {
      provider,
      baseUrl: aiSettings?.baseUrl || DEFAULT_GEMINI_BASE_URL,
      model: aiSettings?.model || 'gemini-2.0-flash',
      apiKey: aiSettings?.apiKey ?? null,
    }
  }

  return {
    provider,
    baseUrl: aiSettings?.baseUrl || 'http://127.0.0.1:11434',
    model: aiSettings?.model || 'qwen3.5:4b',
    apiKey: aiSettings?.apiKey ?? null,
  }
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
  const abuseState = evaluateAbuseState(userId)
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
      const strike = recordAbuseStrike(userId)
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

  if (lastUserMessage && isPrimarilyLegalQuestion(lastUserMessage.content)) {
    return {
      success: true,
      action: 'clarification',
      message: buildLegalPolicyAnswer(lastUserMessage.content),
    }
  }

  const aiSettings = await getUserAiSettingsForRuntime({ userId })
  const runtime = resolveProviderRuntime(aiSettings)
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
    includeExchangeRateTool: isOllamaProvider,
  })

  const sanitized = sanitizeChatMessages(messages)
  const chatState = buildProviderChatState({
    provider: runtime.provider,
    systemPrompt,
    sanitized,
  })

  const executedSteps: AiChatStep[] = []
  let truncationWarning: string | undefined

  for (let step = 0; step < MAX_TOOL_CHAIN_STEPS; step += 1) {
    const providerResult = await callProviderChat({
      provider: runtime.provider,
      systemPrompt,
      state: chatState,
      settings: runtime,
      tools: aiTools,
    })

    if (!providerResult.ok) {
      const providerLabel = runtime.provider === 'gemini' ? 'Gemini' : 'Ollama'
      const rawError = providerResult.error.includes(providerLabel)
        ? providerResult.error
        : `${providerLabel}: ${providerResult.error}`

      return {
        success: false,
        action: 'provider_error',
        error: formatAiProviderError(rawError, runtime.provider),
        steps: executedSteps.length > 0 ? executedSteps : undefined,
      }
    }

    if (providerResult.truncated) {
      truncationWarning = 'The model response was truncated. Try a shorter question or a larger model.'
    }

    const toolCalls = providerResult.toolCalls
    const reply = sanitizeAssistantUserFacingMessage(providerResult.assistantText)

    if (toolCalls.length === 0) {
      if (executedSteps.length > 0) {
        return {
          success: executedSteps.every((entry) => entry.success),
          action: executedSteps.length === 1 ? executedSteps[0].action : 'chained',
          message: reply || summarizeSteps(executedSteps),
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

      return {
        success: true,
        action: 'clarification',
        message: reply || fallbackMessage,
        warning: truncationWarning,
      }
    }

    const toolResults: Array<{ toolName: string; content: string }> = []

    for (const toolCall of toolCalls) {
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

      executedSteps.push(stepResult)

      toolResults.push({
        toolName: toolCall.name,
        content: JSON.stringify({
          success: stepResult.success,
          message: stepResult.message,
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

  return {
    success: executedSteps.some((entry) => entry.success),
    action: executedSteps.length === 1 ? executedSteps[0].action : 'chained',
    message: summarizeSteps(executedSteps),
    steps: executedSteps,
    navigateTo: pickNavigateTo(executedSteps),
    warning:
      truncationWarning ??
      'Stopped after maximum tool steps. Review results and continue if needed.',
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
function summarizeSteps(steps: AiChatStep[]): string {
  const lines = steps.map((step) => `${step.success ? '✓' : '✗'} ${step.message}`)
  return lines.join('\n')
}
