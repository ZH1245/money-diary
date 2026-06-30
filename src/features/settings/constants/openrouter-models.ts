/** Curated OpenRouter models for daily finance chat (tools + general reasoning, not code-specialized). */
export interface OpenRouterModelRecommendation {
  id: string
  label: string
  /** USD per 1M input tokens (approximate). */
  inputPerMillion: number | null
  /** USD per 1M output tokens (approximate). */
  outputPerMillion: number | null
  notes: string
}

/**
 * Default failover chain: paid, low-cost general models with tool-call support.
 * Paid-only by design — free OpenRouter tiers may log/train on prompts, which is
 * unacceptable for users' financial data. All slugs verified against the live catalog.
 */
export const OPENROUTER_DAILY_LIFE_MODEL_CHAIN = [
  'deepseek/deepseek-v4-flash',
  'qwen/qwen3-235b-a22b-2507',
  'google/gemini-2.5-flash',
] as const

export const OPENROUTER_RECOMMENDED_MODELS: OpenRouterModelRecommendation[] = [
  {
    id: 'deepseek/deepseek-v4-flash',
    label: 'DeepSeek V4 Flash',
    inputPerMillion: 0.09,
    outputPerMillion: 0.18,
    notes: 'Recommended default — fast, low cost, strong general chat + tool calls.',
  },
  {
    id: 'qwen/qwen3-235b-a22b-2507',
    label: 'Qwen3 235B A22B',
    inputPerMillion: 0.09,
    outputPerMillion: 0.1,
    notes: 'Cheap, strong general + math reasoning with tool support — primary fallback.',
  },
  {
    id: 'google/gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    inputPerMillion: 0.3,
    outputPerMillion: 2.5,
    notes: 'Higher-quality paid fallback when cheaper models fail.',
  },
  {
    id: 'google/gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    inputPerMillion: 0.1,
    outputPerMillion: 0.4,
    notes: 'Cheaper Google option with tools for everyday queries.',
  },
  {
    id: 'mistralai/mistral-small-3.2-24b-instruct',
    label: 'Mistral Small 3.2 24B',
    inputPerMillion: 0.075,
    outputPerMillion: 0.2,
    notes: 'Cheap, capable general model with tool support.',
  },
  {
    id: 'qwen/qwen-2.5-7b-instruct',
    label: 'Qwen 2.5 7B Instruct',
    inputPerMillion: 0.04,
    outputPerMillion: 0.1,
    notes: 'Ultra-cheap paid option for simple queries.',
  },
]

const recommendationById = new Map(
  OPENROUTER_RECOMMENDED_MODELS.map((entry) => [entry.id, entry]),
)

/** Returns curated metadata for a model slug when known. */
export function getOpenRouterModelRecommendation(modelId: string): OpenRouterModelRecommendation | null {
  return recommendationById.get(modelId) ?? null
}

/** Formats per-million token pricing for admin UI labels. */
export function formatOpenRouterModelPricing(
  inputPerMillion: number | null,
  outputPerMillion: number | null,
): string {
  if (inputPerMillion === 0 && outputPerMillion === 0) {
    return 'Free'
  }
  if (inputPerMillion == null || outputPerMillion == null) {
    return 'Pricing varies'
  }
  return `$${inputPerMillion.toFixed(2)} in / $${outputPerMillion.toFixed(2)} out per 1M`
}
