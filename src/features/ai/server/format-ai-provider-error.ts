/**
 * Turns raw provider API errors into short, user-facing chat messages.
 */
export function formatAiProviderError(raw: string, provider?: string): string {
  const normalized = raw.trim()
  if (!normalized) return 'The AI provider returned an error. Try again shortly.'

  const providerName =
    provider === 'gemini' || /gemini/i.test(normalized)
      ? 'Gemini'
      : provider === 'openrouter' || /openrouter/i.test(normalized)
        ? 'OpenRouter'
        : provider === 'ollama' || /ollama/i.test(normalized)
          ? 'Ollama'
          : 'AI provider'

  if (/high demand|overloaded|temporarily unavailable|service unavailable/i.test(normalized)) {
    return `${providerName} is busy right now — too many requests for this model. Wait a minute and try again, or switch to another model in Settings → AI Provider (e.g. gemini-2.0-flash-lite).`
  }

  if (/insufficient credits|requires more credits|can only afford|payment required|\b402\b/i.test(normalized)) {
    if (providerName === 'OpenRouter') {
      return 'Your OpenRouter credits are used up. Add credits at openrouter.ai/settings/credits or switch to a free model in Settings → AI Provider.'
    }
    return `Your ${providerName} credits are used up. Check billing or switch models in Settings → AI Provider.`
  }

  if (/quota|rate limit|resource exhausted|too many requests/i.test(normalized)) {
    const retryMatch = normalized.match(/retry in ([\d.]+)s/i)
    const retrySeconds = retryMatch ? Math.ceil(Number.parseFloat(retryMatch[1])) : null
    const modelMatch = normalized.match(/model:\s*([^\s,*]+)/i)
    const model = modelMatch?.[1]

    let message = `Your ${providerName} quota is used up for now.`
    if (providerName === 'Gemini') {
      message += ' Check usage in Google AI Studio or switch to another model in Settings.'
    }
    if (retrySeconds != null && Number.isFinite(retrySeconds)) {
      message += ` Try again in about ${retrySeconds} second${retrySeconds === 1 ? '' : 's'}.`
    }
    if (model) {
      message += ` (${model})`
    }
    return message
  }

  if (/api key|invalid.*key|permission denied|unauthorized/i.test(normalized)) {
    return `Your ${providerName} API key looks invalid or expired. Update it in Settings → AI Provider.`
  }

  if (/could not reach|connection timed out|econnrefused|network|httperror|fetch failed/i.test(normalized)) {
    return `${providerName} could not be reached. Check your connection settings and try again.`
  }

  if (/no endpoints found that support tool/i.test(normalized)) {
    return `${providerName}: this model does not support tool calling, which Money Diary needs to read and update your finances. Use google/gemini-2.0-flash-exp:free or another model with tool support (openrouter.ai/models?supported_parameters=tools).`
  }

  if (/developer instruction is not enabled|system instruction is not enabled/i.test(normalized)) {
    return `${providerName}: this model does not support system instructions. Switch to google/gemini-2.0-flash-exp:free instead of Gemma free models.`
  }

  if (
    /provider returned error/i.test(normalized) &&
    (/\/gemma|gemma-/i.test(normalized) || /openinference/i.test(normalized))
  ) {
    return `${providerName} could not run this Gemma model for Money Diary — free Gemma endpoints often reject tools and system prompts. In Settings → AI Provider, set the model to google/gemini-2.0-flash-exp:free.`
  }

  const withoutPrefix = normalized.replace(/^(Gemini|Ollama|OpenRouter):\s*/i, '')

  if (
    withoutPrefix.length > 220 ||
    /generativelanguage\.googleapis\.com|google\.rpc|help\.googleapis\.com/i.test(withoutPrefix)
  ) {
    return `Something went wrong with ${providerName}. Check your provider settings or try again shortly.`
  }

  return withoutPrefix
}

/**
 * Maps thrown server errors (DB, network) into user-facing chat text.
 */
export function resolveUnexpectedChatError(error: unknown): string {
  const raw = error instanceof Error ? error.message : 'AI chat request failed'
  const cause =
    error instanceof Error && error.cause instanceof Error ? error.cause.message : ''
  const combined = `${raw} ${cause}`

  if (/rate_limit_buckets|42P01/i.test(combined)) {
    return 'AI chat is temporarily unavailable because a server database update is pending. Try again after the app is migrated, or contact the admin.'
  }

  if (/HTTPError|fetch failed|Failed query|ECONNREFUSED|ECONNRESET/i.test(combined)) {
    return 'Something went wrong on the server while handling your message. Try again in a moment.'
  }

  return formatAiProviderError(raw)
}
