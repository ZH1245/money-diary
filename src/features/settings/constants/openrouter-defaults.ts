import { OPENROUTER_DAILY_LIFE_MODEL_CHAIN } from '#/features/settings/constants/openrouter-models'

/** OpenRouter API base URL (see https://openrouter.ai/docs/api/reference/overview). */
export const OPENROUTER_DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1'

/**
 * Default primary model — cheap general chat with tool support.
 * Must include provider prefix per OpenRouter.
 */
export const OPENROUTER_DEFAULT_MODEL = OPENROUTER_DAILY_LIFE_MODEL_CHAIN[0]

/** Default ordered failover chain for new OpenRouter admin setups. */
export const OPENROUTER_DEFAULT_MODEL_CHAIN = [...OPENROUTER_DAILY_LIFE_MODEL_CHAIN]

/** Caps assistant output per OpenRouter request; must be large enough for normal tool calls. */
export const OPENROUTER_MAX_OUTPUT_TOKENS = 2048
