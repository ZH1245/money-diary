interface FrankfurterResponse {
  amount: number
  base: string
  date: string
  rates: Record<string, number>
}

interface OpenExchangeRatesResponse {
  base_code: string
  time_last_update_utc: string
  rates: Record<string, number>
}

interface ExchangeRateHostResponse {
  base: string
  date: string
  rates: Record<string, number>
}

/**
 * Validates provider output and returns a normalized response.
 */
function buildExchangeRateResult(rate: number | undefined, date: string | undefined, from: string, to: string) {
  if (!rate || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(`No exchange rate available for ${from} -> ${to}`)
  }

  return {
    rate,
    date: date ?? new Date().toISOString().slice(0, 10),
  }
}

/**
 * Attempts to load the latest exchange rate from Frankfurter.
 */
async function fetchFromFrankfurter(from: string, to: string) {
  const response = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`)
  if (!response.ok) {
    throw new Error(`Frankfurter returned ${response.status}`)
  }

  const json = (await response.json()) as FrankfurterResponse
  return buildExchangeRateResult(json.rates[to], json.date, from, to)
}

/**
 * Attempts to load the latest exchange rate from open.er-api.
 */
async function fetchFromOpenErApi(from: string, to: string) {
  const response = await fetch(`https://open.er-api.com/v6/latest/${from}`)
  if (!response.ok) {
    throw new Error(`open.er-api returned ${response.status}`)
  }

  const json = (await response.json()) as OpenExchangeRatesResponse
  return buildExchangeRateResult(json.rates[to], json.time_last_update_utc, from, to)
}

/**
 * Attempts to load the latest exchange rate from exchangerate.host.
 */
async function fetchFromExchangeRateHost(from: string, to: string) {
  const response = await fetch(`https://api.exchangerate.host/latest?base=${from}&symbols=${to}`)
  if (!response.ok) {
    throw new Error(`exchangerate.host returned ${response.status}`)
  }

  const json = (await response.json()) as ExchangeRateHostResponse
  return buildExchangeRateResult(json.rates[to], json.date, from, to)
}

/**
 * Fetches exchange rates with provider fallbacks.
 */
export async function fetchExchangeRate(fromCurrency: string, toCurrency: string) {
  const from = fromCurrency.toUpperCase()
  const to = toCurrency.toUpperCase()

  if (from === to) {
    return { rate: 1, date: new Date().toISOString().slice(0, 10) }
  }

  const providers = [fetchFromFrankfurter, fetchFromOpenErApi, fetchFromExchangeRateHost]
  const providerErrors: string[] = []

  for (const provider of providers) {
    try {
      return await provider(from, to)
    } catch (error) {
      providerErrors.push(error instanceof Error ? error.message : 'Unknown provider error')
    }
  }

  throw new Error(
    `Unable to fetch exchange rate for ${from} -> ${to}. Tried: ${providerErrors.join(' | ')}`,
  )
}
