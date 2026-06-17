/**
 * Parses a positive numeric string and returns null for invalid values.
 */
function parsePositiveNumber(value: string): number | null {
  const parsedValue = Number(value)
  if (!Number.isFinite(parsedValue)) {
    return null
  }
  if (parsedValue <= 0) {
    return null
  }
  return parsedValue
}

interface NormalizeTransactionAmountInput {
  amount: string
  currency: string
  userCurrency: string
  exchangeRate?: string
}

interface NormalizeTransactionAmountSuccess {
  normalizedAmount: string
  sourceAmount: string | null
  sourceCurrency: string
  exchangeRate: string
}

/**
 * Converts entered amount + currency into stored ledger values.
 */
export function normalizeTransactionAmount(
  input: NormalizeTransactionAmountInput,
): { ok: true; data: NormalizeTransactionAmountSuccess } | { ok: false; error: string } {
  const enteredAmount = parsePositiveNumber(input.amount)
  if (enteredAmount === null) {
    return { ok: false, error: 'Amount must be a positive number' }
  }

  const enteredCurrency = input.currency.toUpperCase()
  const userCurrency = input.userCurrency.toUpperCase()
  const isForeignCurrency = enteredCurrency !== userCurrency
  const parsedExchangeRate = isForeignCurrency ? parsePositiveNumber(input.exchangeRate ?? '') : 1

  if (parsedExchangeRate === null) {
    return { ok: false, error: 'Exchange rate is required for foreign currency entries' }
  }

  return {
    ok: true,
    data: {
      normalizedAmount: (enteredAmount * parsedExchangeRate).toString(),
      sourceAmount: isForeignCurrency ? enteredAmount.toString() : null,
      sourceCurrency: enteredCurrency,
      exchangeRate: parsedExchangeRate.toString(),
    },
  }
}
