/** Thrown when a recovery email is already linked to a different account. */
export class RecoveryEmailInUseError extends Error {
  constructor() {
    super('This recovery email is already linked to another account.')
    this.name = 'RecoveryEmailInUseError'
  }
}

/** Normalizes recovery emails for storage and uniqueness checks. */
export function normalizeRecoveryEmail(email: string): string {
  return email.trim().toLowerCase()
}
