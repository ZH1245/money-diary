export interface SecurityProfileSummary {
  recoveryEmail: string
  recoveryEmailVerified: boolean
  questionOneKey: string
  questionOneLabel: string
  hasProfile: boolean
}

interface SecurityProfileApiPayload {
  success?: boolean
  data?: SecurityProfileSummary | null
  error?: string
  details?: {
    fieldErrors?: Record<string, string[]>
  }
}

/** API error that may include field-level validation messages. */
export class SecurityProfileRequestError extends Error {
  fieldErrors?: Record<string, string>

  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'SecurityProfileRequestError'
    this.fieldErrors = fieldErrors
  }
}

/** Maps API field errors into a single message per form field. */
function parseSecurityProfileFieldErrors(
  details?: SecurityProfileApiPayload['details'],
): Record<string, string> | undefined {
  if (!details?.fieldErrors) {
    return undefined
  }

  const next: Record<string, string> = {}
  for (const [key, messages] of Object.entries(details.fieldErrors)) {
    const firstMessage = messages?.[0]
    if (firstMessage) {
      next[key] = firstMessage
    }
  }

  return Object.keys(next).length > 0 ? next : undefined
}

/** Throws a typed error when a security profile API request fails. */
function throwSecurityProfileRequestError(
  payload: SecurityProfileApiPayload | null,
  fallbackMessage: string,
): never {
  const fieldErrors = parseSecurityProfileFieldErrors(payload?.details)
  throw new SecurityProfileRequestError(payload?.error ?? fallbackMessage, fieldErrors)
}

/** Loads the authenticated user's security profile, or null when not configured. */
export async function fetchSecurityProfile(): Promise<SecurityProfileSummary | null> {
  const response = await fetch('/api/auth/security-profile', { method: 'GET' })
  const payload = (await response.json().catch(() => null)) as SecurityProfileApiPayload | null

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error ?? 'Unable to load security profile')
  }

  return payload.data ?? null
}

/** Creates the initial security profile for the signed-in user. */
export async function createSecurityProfileRequest(body: {
  questionOneKey: string
  answerOne: string
}): Promise<SecurityProfileSummary> {
  const response = await fetch('/api/auth/security-profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  const payload = (await response.json().catch(() => null)) as SecurityProfileApiPayload | null

  if (!response.ok || !payload?.success || !payload.data) {
    throwSecurityProfileRequestError(payload, 'Unable to save security settings')
  }

  return payload.data
}

/** Updates recovery settings for an existing security profile. */
export async function updateSecurityProfileRequest(body: {
  currentPassword: string
  questionOneKey?: string
  answerOne?: string
}): Promise<SecurityProfileSummary> {
  const response = await fetch('/api/auth/security-profile', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  const payload = (await response.json().catch(() => null)) as SecurityProfileApiPayload | null

  if (!response.ok || !payload?.success || !payload.data) {
    throwSecurityProfileRequestError(payload, 'Unable to update security settings')
  }

  return payload.data
}
