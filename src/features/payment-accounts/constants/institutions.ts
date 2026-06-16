/**
 * Built-in bank and wallet names users can pick when adding a card or account.
 */
export const PAYMENT_INSTITUTIONS = [
  { slug: 'hbl', name: 'Habib Bank Limited (HBL)' },
  { slug: 'ubl', name: 'United Bank Limited (UBL)' },
  { slug: 'mcb', name: 'MCB Bank' },
  { slug: 'meezan', name: 'Meezan Bank' },
  { slug: 'allied', name: 'Allied Bank' },
  { slug: 'alfalah', name: 'Bank Alfalah' },
  { slug: 'faysal', name: 'Faysal Bank' },
  { slug: 'scb', name: 'Standard Chartered Pakistan' },
  { slug: 'bop', name: 'Bank of Punjab' },
  { slug: 'askari', name: 'Askari Bank' },
  { slug: 'bank-islami', name: 'Bank Islami' },
  { slug: 'js-bank', name: 'JS Bank' },
  { slug: 'soneri', name: 'Soneri Bank' },
  { slug: 'silk-bank', name: 'Silkbank' },
  { slug: 'summit', name: 'Summit Bank' },
  { slug: 'jazzcash', name: 'JazzCash' },
  { slug: 'easypaisa', name: 'Easypaisa' },
  { slug: 'sadapay', name: 'SadaPay' },
  { slug: 'nayapay', name: 'NayaPay' },
  { slug: 'cash', name: 'Cash on hand' },
] as const

export type PaymentInstitutionSlug = (typeof PAYMENT_INSTITUTIONS)[number]['slug']

/**
 * Resolves a preset institution display name from its slug.
 */
export function getInstitutionName(slug: string | null | undefined): string | null {
  if (!slug) return null
  const institution = PAYMENT_INSTITUTIONS.find((entry) => entry.slug === slug)
  return institution?.name ?? null
}
