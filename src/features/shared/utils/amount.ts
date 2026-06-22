/**
 * Parses API amount strings into numbers.
 */
export function parseLedgerAmount(amount: string): number {
  const parsedAmount = Number(amount)
  if (!Number.isFinite(parsedAmount)) return 0
  return parsedAmount
}
