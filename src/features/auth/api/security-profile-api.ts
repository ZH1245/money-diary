export interface SecurityProfileSummary {
  recoveryEmail: string
  recoveryEmailVerified: boolean
  questionOneKey: string
  questionOneLabel: string
  hasProfile: boolean
}

/** Loads the authenticated user's security profile, or null when not configured. */
export async function fetchSecurityProfile(): Promise<SecurityProfileSummary | null> {
  const response = await fetch('/api/auth/security-profile', { method: 'GET' })
  const payload = (await response.json().catch(() => null)) as {
    success?: boolean
    data?: SecurityProfileSummary | null
    error?: string
  } | null

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error ?? 'Unable to load security profile')
  }

  return payload.data ?? null
}

/** Creates the initial security profile for the signed-in user. */
export async function createSecurityProfileRequest(body: {
  recoveryEmail: string
  questionOneKey: string
  answerOne: string
}): Promise<SecurityProfileSummary> {
  const response = await fetch('/api/auth/security-profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  const payload = (await response.json().catch(() => null)) as {
    success?: boolean
    data?: SecurityProfileSummary
    error?: string
  } | null

  if (!response.ok || !payload?.success || !payload.data) {
    throw new Error(payload?.error ?? 'Unable to save security settings')
  }

  return payload.data
}
