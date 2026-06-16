const SAME_ORIGIN_ERROR = {
  success: false,
  error: 'Cross-origin request blocked by same-origin policy',
}

/**
 * Parses optional trusted origins from environment configuration.
 */
function parseAllowedOrigins() {
  const envValue = process.env.ALLOWED_ORIGINS
  if (!envValue) return new Set<string>()

  return new Set(
    envValue
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )
}

/**
 * Enforces strict same-origin request checks for API handlers.
 */
export function enforceSameOrigin(request: Request): Response | null {
  const requestOrigin = new URL(request.url).origin
  const originHeader = request.headers.get('origin')
  const allowedOrigins = parseAllowedOrigins()

  if (originHeader && originHeader !== requestOrigin && !allowedOrigins.has(originHeader)) {
    return Response.json(SAME_ORIGIN_ERROR, {
      status: 403,
      headers: {
        'vary': 'origin',
      },
    })
  }

  if (request.method === 'OPTIONS') {
    const accessControlOrigin = originHeader && allowedOrigins.has(originHeader)
      ? originHeader
      : requestOrigin

    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': accessControlOrigin,
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'access-control-allow-headers': 'content-type,authorization',
        'vary': 'origin',
      },
    })
  }

  return null
}
