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

export interface OllamaProbeResult {
  ok: boolean
  statusCode: number | null
  message: string
}

/**
 * Probes an Ollama base URL by calling GET /api/tags.
 */
export async function probeOllamaBaseUrl({
  baseUrl,
  apiKey,
  timeoutMs = 8000,
}: {
  baseUrl: string
  apiKey?: string | null
  timeoutMs?: number
}): Promise<OllamaProbeResult> {
  const trimmed = baseUrl.trim()
  if (!trimmed) {
    return { ok: false, statusCode: null, message: 'Enter a URL.' }
  }

  let normalizedUrl: string
  try {
    normalizedUrl = new URL(trimmed).origin
  } catch {
    return { ok: false, statusCode: null, message: 'Enter a valid URL.' }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${normalizedUrl.replace(/\/$/, '')}/api/tags`, {
      method: 'GET',
      headers: buildOllamaRequestHeaders({ baseUrl: normalizedUrl, apiKey: apiKey ?? null }),
      signal: controller.signal,
    })

    if (response.ok) {
      return {
        ok: true,
        statusCode: response.status,
        message: 'Ollama is reachable.',
      }
    }

    return {
      ok: false,
      statusCode: response.status,
      message: formatOllamaHttpError(response.status, normalizedUrl),
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        ok: false,
        statusCode: null,
        message: 'Connection timed out. Check the URL and network.',
      }
    }

    return {
      ok: false,
      statusCode: null,
      message: `Could not reach Ollama at ${normalizedUrl}.`,
    }
  } finally {
    clearTimeout(timeout)
  }
}
