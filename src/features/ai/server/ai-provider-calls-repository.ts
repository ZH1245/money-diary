import { db } from '#/db/index'
import { aiProviderCalls } from '#/db/schema'
import type { AiProviderCallRecord } from '#/features/ai/server/ai-chat-service'

/**
 * Persists provider-level usage line items for one assistant response.
 */
export async function appendAiProviderCalls({
  userId,
  conversationId,
  assistantMessageId,
  calls,
}: {
  userId: string
  conversationId: number
  assistantMessageId: number
  calls: AiProviderCallRecord[]
}) {
  if (calls.length === 0) return

  await db.insert(aiProviderCalls).values(
    calls.map((call) => ({
      userId,
      conversationId,
      assistantMessageId,
      provider: call.provider,
      model: call.model,
      sessionId: call.sessionId,
      generationId: call.generationId,
      roundIndex: call.roundIndex,
      roundType: call.roundType,
      toolCallCount: call.toolCallCount,
      promptTokens: call.promptTokens,
      completionTokens: call.completionTokens,
      totalTokens: call.totalTokens,
      cachedTokens: call.cachedTokens,
      modelPromptPricePerToken:
        call.modelPromptPricePerTokenUsd != null
          ? call.modelPromptPricePerTokenUsd.toFixed(12)
          : null,
      modelCompletionPricePerToken:
        call.modelCompletionPricePerTokenUsd != null
          ? call.modelCompletionPricePerTokenUsd.toFixed(12)
          : null,
      promptCostUsd: call.promptCostUsd.toFixed(8),
      completionCostUsd: call.completionCostUsd.toFixed(8),
      costUsd: call.costUsd.toFixed(8),
    })),
  )
}
