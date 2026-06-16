/**
 * Currency options supported in onboarding and display formatting.
 */
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'PKR', label: 'Pakistani Rupee (PKR)' },
  { code: 'INR', label: 'Indian Rupee (INR)' },
  { code: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)' },
  { code: 'AUD', label: 'Australian Dollar (AUD)' },
] as const

/**
 * Fallback currency used when user preference is missing.
 */
export const DEFAULT_CURRENCY = 'PKR'
