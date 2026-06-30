/**
 * Serializes one or more model slugs for encrypted storage.
 * Single-model configs stay a plain string for backward compatibility.
 */
export function serializeAiModelConfig(models: string[]): string {
  const normalized = models.map((model) => model.trim()).filter(Boolean)
  if (normalized.length === 0) {
    return ''
  }
  if (normalized.length === 1) {
    return normalized[0]
  }
  return JSON.stringify(normalized)
}

/**
 * Parses encrypted model config into an ordered failover chain (primary first).
 */
export function parseAiModelConfig(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) {
    return []
  }

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (Array.isArray(parsed)) {
        return parsed
          .filter((entry): entry is string => typeof entry === 'string')
          .map((entry) => entry.trim())
          .filter(Boolean)
      }
    } catch {
      // Fall through to single-model string.
    }
  }

  return [trimmed]
}
