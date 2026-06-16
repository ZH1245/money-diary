export const MAX_JSON_BODY_BYTES = 64 * 1024

/**
 * Parses JSON request bodies with a strict maximum payload size.
 */
export async function parseJsonBody(request: Request, maxBytes = MAX_JSON_BODY_BYTES): Promise<unknown | Response> {
  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return Response.json({ success: false, error: 'Payload too large' }, { status: 413 })
  }

  const rawBody = await request.text()
  if (rawBody.length > maxBytes) {
    return Response.json({ success: false, error: 'Payload too large' }, { status: 413 })
  }

  if (!rawBody.trim()) return null

  try {
    return JSON.parse(rawBody) as unknown
  } catch {
    return Response.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 })
  }
}
