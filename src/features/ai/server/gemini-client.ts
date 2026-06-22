import type { getAiToolsForProvider } from '#/features/ai/server/ai-tools'
import { formatAiProviderError } from '#/features/ai/server/format-ai-provider-error'

const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

export interface GeminiChatMessage {
  role: 'user' | 'model' | 'function'
  parts: Array<
    | { text: string }
    | { functionCall: { name: string; args: Record<string, unknown> } }
    | { functionResponse: { name: string; response: Record<string, unknown> } }
  >
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<
        | { text?: string }
        | { functionCall?: { name?: string; args?: Record<string, unknown> } }
      >
    }
    finishReason?: string
  }>
  error?: {
    message?: string
  }
}

export interface GeminiProbeResult {
  ok: boolean
  statusCode: number | null
  message: string
}

/**
 * Converts Ollama-style tool definitions into Gemini function declarations.
 */
export function toGeminiFunctionDeclarations(tools: ReturnType<typeof getAiToolsForProvider>) {
  return tools.map((tool) => ({
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters,
  }))
}

/**
 * Probes a Gemini API key with a lightweight models list request.
 */
export async function probeGeminiApiKey({
  apiKey,
  baseUrl = DEFAULT_GEMINI_BASE_URL,
  timeoutMs = 8000,
}: {
  apiKey: string
  baseUrl?: string
  timeoutMs?: number
}): Promise<GeminiProbeResult> {
  const trimmedKey = apiKey.trim()
  if (!trimmedKey) {
    return { ok: false, statusCode: null, message: 'Enter a Gemini API key.' }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
      method: 'GET',
      headers: {
        'x-goog-api-key': trimmedKey,
      },
      signal: controller.signal,
    })

    if (response.ok) {
      return {
        ok: true,
        statusCode: response.status,
        message: 'Gemini API key is valid.',
      }
    }

    const payload = (await response.json().catch(() => null)) as GeminiGenerateResponse | null
    return {
      ok: false,
      statusCode: response.status,
      message: formatAiProviderError(payload?.error?.message ?? `Gemini error: ${response.status}`, 'gemini'),
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        ok: false,
        statusCode: null,
        message: 'Connection timed out. Check your network.',
      }
    }

    return {
      ok: false,
      statusCode: null,
      message: 'Could not reach Gemini API.',
    }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Calls Gemini generateContent with tool declarations and conversation history.
 */
export async function callGeminiChat({
  baseUrl = DEFAULT_GEMINI_BASE_URL,
  model,
  apiKey,
  systemPrompt,
  messages,
  tools,
}: {
  baseUrl?: string
  model: string
  apiKey: string
  systemPrompt: string
  messages: GeminiChatMessage[]
  tools: ReturnType<typeof getAiToolsForProvider>
}): Promise<
  | {
      ok: true
      assistantText: string
      toolCalls: Array<{ name: string; arguments: unknown }>
      truncated: boolean
    }
  | { ok: false; error: string; status?: number }
> {
  const trimmedKey = apiKey.trim()
  if (!trimmedKey) {
    return { ok: false, error: 'Gemini API key is missing. Add it in Settings → AI Provider.' }
  }

  let response: Response
  try {
    response = await fetch(
      `${baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': trimmedKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: messages,
          tools: [{ functionDeclarations: toGeminiFunctionDeclarations(tools) }],
          toolConfig: {
            functionCallingConfig: {
              mode: 'AUTO',
            },
          },
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
          },
        }),
      },
    )
  } catch {
    return { ok: false, error: 'Could not reach Gemini API.' }
  }

  const payload = (await response.json().catch(() => null)) as GeminiGenerateResponse | null

  if (!response.ok) {
    return {
      ok: false,
      error: formatAiProviderError(payload?.error?.message ?? `Gemini error: ${response.status}`, 'gemini'),
      status: response.status,
    }
  }

  const candidate = payload?.candidates?.[0]
  const parts = candidate?.content?.parts ?? []
  const textParts: string[] = []
  const toolCalls: Array<{ name: string; arguments: unknown }> = []

  for (const part of parts) {
    if ('text' in part && part.text?.trim()) {
      textParts.push(part.text.trim())
    }
    if ('functionCall' in part && part.functionCall?.name) {
      toolCalls.push({
        name: part.functionCall.name,
        arguments: part.functionCall.args ?? {},
      })
    }
  }

  return {
    ok: true,
    assistantText: textParts.join('\n').trim(),
    toolCalls,
    truncated: candidate?.finishReason === 'MAX_TOKENS',
  }
}

export { DEFAULT_GEMINI_BASE_URL }
