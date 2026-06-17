interface FrankfurterResponse {
  amount: number
  base: string
  date: string
  rates: Record<string, number>
}

/**
 * Fetches the latest exchange rate from Frankfurter (ECB-based, no API key).
 */
export async function fetchExchangeRate(fromCurrency: string, toCurrency: string) {
  const from = fromCurrency.toUpperCase()
  const to = toCurrency.toUpperCase()

  if (from === to) {
    return { rate: 1, date: new Date().toISOString().slice(0, 10) }
  }

  const response = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`)

  if (!response.ok) {
    throw new Error(`Exchange rate provider returned ${response.status}`)
  }

  const json = (await response.json()) as FrankfurterResponse
  const rate = json.rates[to]

  if (!rate || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(`No exchange rate available for ${from} → ${to}`)
  }

  return { rate, date: json.date }
}
