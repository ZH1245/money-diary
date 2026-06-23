/** OpenRouter API base URL (see https://openrouter.ai/docs/api/reference/overview). */
export const OPENROUTER_DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1'

/**
 * Default routed model slug — must include provider prefix per OpenRouter.
 * Must support tools + system messages (Gemma free models do not).
 */
export const OPENROUTER_DEFAULT_MODEL = 'google/gemini-2.0-flash-exp:free'

/** Caps assistant output per OpenRouter request; tool JSON stays well under this. */
export const OPENROUTER_MAX_OUTPUT_TOKENS = 1024
