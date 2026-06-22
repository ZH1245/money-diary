export const SECURITY_QUESTIONS = [
  { key: 'childhood_nickname', label: 'Childhood nickname' },
  { key: 'birth_city', label: 'City where you were born' },
  { key: 'first_pet', label: 'Name of your first pet' },
  { key: 'favorite_teacher', label: 'Favorite teacher name' },
] as const

export type SecurityQuestionKey = (typeof SECURITY_QUESTIONS)[number]['key']

const SECURITY_QUESTION_KEYS = new Set<string>(SECURITY_QUESTIONS.map((question) => question.key))

/** Returns true when the key matches a predefined security question. */
export function isSecurityQuestionKey(value: string): value is SecurityQuestionKey {
  return SECURITY_QUESTION_KEYS.has(value)
}

/** Resolves the display label for a stored security question key. */
export function getSecurityQuestionLabel(key: string): string {
  return SECURITY_QUESTIONS.find((question) => question.key === key)?.label ?? key
}
