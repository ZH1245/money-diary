import { PAYMENT_INSTITUTIONS } from '#/features/payment-accounts/constants/institutions'

/**
 * Resolves a preset institution slug from AI tool args, or null for custom accounts.
 */
export function resolvePaymentAccountInstitutionSlug({
  institutionSlug,
  institutionName,
}: {
  institutionSlug?: string
  institutionName?: string
}): { slug: string | null; error?: string } {
  if (institutionSlug?.trim()) {
    const slug = institutionSlug.trim().toLowerCase()
    const found = PAYMENT_INSTITUTIONS.find((entry) => entry.slug === slug)
    if (!found) {
      return { slug: null, error: `Unknown institution: ${institutionSlug}` }
    }
    return { slug: found.slug }
  }

  if (institutionName?.trim()) {
    const query = institutionName.trim().toLowerCase()
    const found = PAYMENT_INSTITUTIONS.find((entry) => {
      const name = entry.name.toLowerCase()
      return entry.slug === query || name === query || name.includes(query) || query.includes(name)
    })
    if (found) {
      return { slug: found.slug }
    }
    return { slug: null }
  }

  return { slug: null }
}

/**
 * Returns true when the user already has the default cash account.
 */
export function userHasCashPaymentAccount(
  accounts: Array<{ institutionSlug: string | null }>,
): boolean {
  return accounts.some((account) => account.institutionSlug === 'cash')
}
