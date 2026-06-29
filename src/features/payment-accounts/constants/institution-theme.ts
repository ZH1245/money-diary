/**
 * Brand-ish gradient per institution slug, used to colour account cards.
 * Full Tailwind class strings are kept literal here so the JIT generates them.
 * Custom / unknown accounts fall back to a rotating palette by card index.
 */
const INSTITUTION_GRADIENTS: Record<string, string> = {
  hbl: 'from-[#0a7d3f] to-[#064d27]',
  ubl: 'from-[#0a8a8a] to-[#054f4f]',
  mcb: 'from-[#1f9d57] to-[#0d5e33]',
  meezan: 'from-[#1f7a4d] to-[#0c3d27]',
  allied: 'from-[#0a9b8e] to-[#055048]',
  alfalah: 'from-[#c23b34] to-[#6f211d]',
  faysal: 'from-[#0a6e4f] to-[#06402e]',
  scb: 'from-[#1f6fd6] to-[#123c75]',
  bop: 'from-[#3a9b3f] to-[#1f5e22]',
  askari: 'from-[#9b3a4f] to-[#5e1f2e]',
  'bank-islami': 'from-[#1f9b7a] to-[#0c4d3d]',
  'js-bank': 'from-[#4f46e5] to-[#2e2a8c]',
  soneri: 'from-[#d65a2f] to-[#75301a]',
  'silk-bank': 'from-[#7a3aa0] to-[#3d1f50]',
  summit: 'from-[#1f7a7a] to-[#0c3d3d]',
  jazzcash: 'from-[#e23b3b] to-[#7a1f1f]',
  easypaisa: 'from-[#3a9b2f] to-[#1f5e1a]',
  sadapay: 'from-[#3a4250] to-[#1a1f28]',
  nayapay: 'from-[#f08a2e] to-[#9b5012]',
  cash: 'from-[#3a9b6f] to-[#1f6b4a]',
}

/** Rotating palette for custom accounts with no preset brand colour. */
const FALLBACK_GRADIENTS = [
  'from-[#4f46e5] to-[#2e2a8c]',
  'from-[#b0473d] to-[#6f2a24]',
  'from-[#1f6b4a] to-[#15402f]',
  'from-[#6c63ff] to-[#3a3499]',
  'from-[#3a9b6f] to-[#1f6b4a]',
] as const

/** Resolves the gradient classes for an account card. */
export function getInstitutionGradient(
  slug: string | null | undefined,
  fallbackIndex: number,
): string {
  if (slug && INSTITUTION_GRADIENTS[slug]) {
    return INSTITUTION_GRADIENTS[slug]
  }
  return FALLBACK_GRADIENTS[fallbackIndex % FALLBACK_GRADIENTS.length]
}
