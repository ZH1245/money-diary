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

  if (/could not reach|connection timed out|econnrefused|network/i.test(normalized)) {
    return `${providerName} could not be reached. Check your connection settings and try again.`
  }

  const withoutPrefix = normalized.replace(/^(Gemini|Ollama):\s*/i, '')

  if (
    withoutPrefix.length > 220 ||
    /generativelanguage\.googleapis\.com|google\.rpc|help\.googleapis\.com/i.test(withoutPrefix)
  ) {
    return `Something went wrong with ${providerName}. Check your provider settings or try again shortly.`
  }

  return withoutPrefix
}
