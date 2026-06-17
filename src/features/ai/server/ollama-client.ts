/**
 * Headers required for Ollama HTTP API calls, including ngrok tunnel bypass.
 */
export function buildOllamaRequestHeaders({
  baseUrl,
  apiKey,
}: {
  baseUrl: string
  apiKey: string | null
}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  if (isNgrokBaseUrl(baseUrl)) {
    // ngrok free tier returns 403 without this header (browser + server requests).
    headers['ngrok-skip-browser-warning'] = 'true'
  }

  return headers
}

/**
 * Returns true when the Ollama base URL points at an ngrok tunnel.
 */
export function isNgrokBaseUrl(baseUrl: string): boolean {
  try {
    const hostname = new URL(baseUrl).hostname.toLowerCase()
    return hostname.includes('ngrok')
  } catch {
    return baseUrl.toLowerCase().includes('ngrok')
  }
}

/**
 * User-facing hint when Ollama responds with 403 through ngrok.
 */
export function formatOllamaHttpError(status: number, baseUrl: string): string {
  if (status === 403 && isNgrokBaseUrl(baseUrl)) {
    return 'Ollama/ngrok returned 403. Use your ngrok HTTPS URL in settings (no trailing path). If opening the link in a browser, ngrok blocks it — test with: curl -H "ngrok-skip-browser-warning: true" YOUR_URL/api/tags'
  }

  return `Ollama error: ${status}`
}
