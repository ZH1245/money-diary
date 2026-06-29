import { OPENROUTER_MAX_OUTPUT_TOKENS } from '#/features/settings/constants/openrouter-defaults'

/** Max chars for a normal single-line chat message. */
export const AI_CHAT_MESSAGE_LIMIT_DEFAULT = 1200

/** Max chars when the message looks like a pasted expense table. */
export const AI_CHAT_MESSAGE_LIMIT_BULK = 10_000

export const AI_TOOL_CHAIN_STEPS_DEFAULT = 5
export const AI_TOOL_CHAIN_STEPS_BULK_MIN = 8
export const AI_TOOL_CHAIN_STEPS_BULK_MAX = 20

export const AI_OPENROUTER_OUTPUT_BULK_MAX = 8192
export const AI_OLLAMA_PREDICT_DEFAULT = 4096
export const AI_OLLAMA_PREDICT_BULK_MAX = 8192

const AMOUNT_PATTERN = /\d[\d,]*(?:\.\d{1,2})?/g

export interface BulkChatRuntimeLimits {
  isBulkPaste: boolean
  messageCharLimit: number
  toolChainSteps: number
  maxOutputTokens: number
  ollamaNumPredict: number
  estimatedRows: number
}

/**
 * Returns true when the user message looks like a multi-row pasted ledger.
 */
export function isBulkPasteContent(content: string): boolean {
  const trimmed = content.trim()
  if (trimmed.length < 400) {
    return false
  }

  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length < 4) {
    return false
  }

  const amountMatches = trimmed.match(AMOUNT_PATTERN)
  return (amountMatches?.length ?? 0) >= 4
}

/**
 * Max allowed characters for a single user message (bulk vs normal).
 */
export function getMessageContentCharLimit(content: string): number {
  return isBulkPasteContent(content) ? AI_CHAT_MESSAGE_LIMIT_BULK : AI_CHAT_MESSAGE_LIMIT_DEFAULT
}

/**
 * Estimates how many ledger rows the paste likely contains.
 */
export function estimateBulkPasteRowCount(content: string): number {
  const lines = content.trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const withAmount = lines.filter((line) => AMOUNT_PATTERN.test(line))
  return Math.max(withAmount.length, lines.length)
}

/**
 * Resolves per-request limits when bulk paste is detected; keeps normal chat on tight budgets.
 */
export function resolveBulkChatRuntimeLimits(content: string): BulkChatRuntimeLimits {
  if (!isBulkPasteContent(content)) {
    return {
      isBulkPaste: false,
      messageCharLimit: AI_CHAT_MESSAGE_LIMIT_DEFAULT,
      toolChainSteps: AI_TOOL_CHAIN_STEPS_DEFAULT,
      maxOutputTokens: OPENROUTER_MAX_OUTPUT_TOKENS,
      ollamaNumPredict: AI_OLLAMA_PREDICT_DEFAULT,
      estimatedRows: 0,
    }
  }

  const estimatedRows = estimateBulkPasteRowCount(content)
  const toolChainSteps = Math.min(
    AI_TOOL_CHAIN_STEPS_BULK_MAX,
    Math.max(AI_TOOL_CHAIN_STEPS_BULK_MIN, Math.ceil(estimatedRows / 4)),
  )
  // ~200 tokens per tool call JSON; floor at 2048 so small pastes still have headroom.
  const maxOutputTokens = Math.min(
    AI_OPENROUTER_OUTPUT_BULK_MAX,
    Math.max(2048, estimatedRows * 200),
  )

  return {
    isBulkPaste: true,
    messageCharLimit: AI_CHAT_MESSAGE_LIMIT_BULK,
    toolChainSteps,
    maxOutputTokens,
    ollamaNumPredict: AI_OLLAMA_PREDICT_BULK_MAX,
    estimatedRows,
  }
}
