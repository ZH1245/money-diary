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
import { buildOllamaRequestHeaders, formatOllamaHttpError } from '#/features/ai/server/ollama-client'
import {
  isWeakAssistantReply,
  resolveFallbackToolInvocation,
} from '#/features/ai/server/ai-tool-fallback'

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
  action?: AiToolAction | 'clarification' | 'chained'
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
}

/**
 * Parses tool arguments when Ollama returns JSON as a string.
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
function extractToolCalls(message: OllamaChatMessage | undefined): OllamaToolCall[] {
  if (!message?.tool_calls?.length) return []
  return message.tool_calls
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
}): Promise<{ ok: true; data: OllamaResponse } | { ok: false; error: string; status?: number }> {
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
      }),
    })
  } catch {
    return { ok: false, error: `Could not reach Ollama at ${baseUrl}.` }
  }

  if (!response.ok) {
    return { ok: false, error: formatOllamaHttpError(response.status, baseUrl), status: response.status }
  }

  const data = (await response.json()) as OllamaResponse
  return { ok: true, data }
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
  const isOllamaProvider = aiSettings?.provider == null || aiSettings.provider === 'ollama'
  const aiTools = getAiToolsForProvider(aiSettings?.provider)

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
  const ollamaMessages: OllamaChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...sanitized,
  ]

  const ollamaBaseUrl = isOllamaProvider && aiSettings?.baseUrl ? aiSettings.baseUrl : 'http://127.0.0.1:11434'
  const ollamaModel = isOllamaProvider && aiSettings?.model ? aiSettings.model : 'qwen3.5:4b'
  const ollamaApiKey = isOllamaProvider ? (aiSettings?.apiKey ?? null) : null

  const executedSteps: AiChatStep[] = []

  for (let step = 0; step < MAX_TOOL_CHAIN_STEPS; step += 1) {
    const ollamaResult = await callOllamaChat({
      baseUrl: ollamaBaseUrl,
      model: ollamaModel,
      apiKey: ollamaApiKey,
      messages: ollamaMessages,
      tools: aiTools,
    })

    if (!ollamaResult.ok) {
      return {
        success: false,
        error: ollamaResult.error,
        steps: executedSteps.length > 0 ? executedSteps : undefined,
      }
    }

    const assistantMessage = ollamaResult.data.message
    const toolCalls = extractToolCalls(assistantMessage)

    if (toolCalls.length === 0) {
      const reply = sanitizeAssistantUserFacingMessage(assistantMessage?.content?.trim() ?? '')
      if (executedSteps.length > 0) {
        return {
          success: executedSteps.every((entry) => entry.success),
          action: executedSteps.length === 1 ? executedSteps[0].action : 'chained',
          message: reply || summarizeSteps(executedSteps),
          steps: executedSteps,
          navigateTo: pickNavigateTo(executedSteps),
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
            }
          }
        }
      }

      const fallbackMessage = resolveClarificationFallback(messages)

      return {
        success: true,
        action: 'clarification',
        message: reply || fallbackMessage,
      }
    }

    ollamaMessages.push({
      role: 'assistant',
      content: assistantMessage?.content ?? '',
      tool_calls: toolCalls,
    })

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name
      const toolArgs = parseToolArguments(toolCall.function.arguments)

      const stepResult = await executeAiTool({
        toolName,
        toolArgs,
        context: {
          userId,
          currency,
          today,
          userGoals: userContext.userGoals,
        },
      })

      executedSteps.push(stepResult)

      ollamaMessages.push({
        role: 'tool',
        tool_name: toolName,
        content: JSON.stringify({
          success: stepResult.success,
          message: stepResult.message,
          ...(stepResult.data ?? {}),
        }),
      })
    }
  }

  return {
    success: executedSteps.some((entry) => entry.success),
    action: executedSteps.length === 1 ? executedSteps[0].action : 'chained',
    message: summarizeSteps(executedSteps),
    steps: executedSteps,
    navigateTo: pickNavigateTo(executedSteps),
    warning: 'Stopped after maximum tool steps. Review results and continue if needed.',
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
