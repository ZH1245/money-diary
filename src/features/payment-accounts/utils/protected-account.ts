/**
 * Returns true for system default accounts that must not be deleted (e.g. Cash on hand).
 */
export function isProtectedPaymentAccount(account: { institutionSlug: string | null }): boolean {
  return account.institutionSlug === 'cash'
}

/**
 * Returns true when a payment account row may be removed by the user.
 */
export function canDeletePaymentAccount(account: { institutionSlug: string | null }): boolean {
  return !isProtectedPaymentAccount(account)
}
