import { privacyModeStore } from '#/features/privacy/store/privacy-mode-store'
import { useStore } from '@tanstack/react-store'

export const MASKED_AMOUNT = '••••••'
export const MASKED_TEXT = '••••••••'

/**
 * Returns whether privacy mode is currently enabled.
 */
export function isPrivacyModeEnabled(): boolean {
  return privacyModeStore.state.isEnabled
}

/**
 * Subscribes to privacy mode changes in React components.
 */
export function usePrivacyModeEnabled(): boolean {
  return useStore(privacyModeStore, (state) => state.isEnabled)
}

/**
 * Masks plain text when privacy mode is active.
 */
export function formatSensitiveText(text: string, isPrivacyMode = isPrivacyModeEnabled()): string {
  if (!isPrivacyMode) {
    return text
  }

  return MASKED_TEXT
}

/**
 * Formats currency values and masks them when privacy mode is active.
 */
export function formatSensitiveCurrency(
  amount: string | number,
  currency: string,
  isPrivacyMode = isPrivacyModeEnabled(),
): string {
  if (isPrivacyMode) {
    return MASKED_AMOUNT
  }

  const parsedAmount = typeof amount === 'string' ? Number(amount) : amount
  if (!Number.isFinite(parsedAmount)) {
    return String(amount)
  }

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(parsedAmount)
}

/**
 * Compact currency labels for charts when privacy mode is active.
 */
export function formatSensitiveCompactAmount(
  amount: number,
  currency: string,
  isPrivacyMode = isPrivacyModeEnabled(),
): string {
  if (isPrivacyMode) {
    return MASKED_AMOUNT
  }

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)
}
