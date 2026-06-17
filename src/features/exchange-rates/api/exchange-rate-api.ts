interface ExchangeRateResponse {
  success: boolean
  data?: {
    from: string
    to: string
    rate: number
    date: string
  }
  error?: string
}

/**
 * Loads the latest exchange rate between two supported currencies.
 */
export async function getExchangeRate(from: string, to: string): Promise<number> {
  const params = new URLSearchParams({ from: from.toUpperCase(), to: to.toUpperCase() })
  const response = await fetch(`/api/exchange-rate?${params.toString()}`)
  const json = (await response.json()) as ExchangeRateResponse

  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.error ?? 'Unable to fetch exchange rate')
  }

  return json.data.rate
}
