import { Store } from '@tanstack/react-store'

const PRIVACY_MODE_STORAGE_KEY = 'money-diary-privacy-mode'

interface PrivacyModeState {
  isEnabled: boolean
}

/**
 * Reads persisted privacy mode preference. Defaults to hidden amounts/titles.
 */
function readStoredPrivacyMode(): boolean {
  if (typeof window === 'undefined') {
    return true
  }

  const storedValue = window.localStorage.getItem(PRIVACY_MODE_STORAGE_KEY)
  if (storedValue === null) {
    return true
  }

  return storedValue === 'true'
}

/**
 * Shared privacy mode state for masking money and titles across the app.
 */
export const privacyModeStore = new Store<PrivacyModeState>({
  isEnabled: readStoredPrivacyMode(),
})

privacyModeStore.subscribe(() => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(PRIVACY_MODE_STORAGE_KEY, String(privacyModeStore.state.isEnabled))
})

/**
 * Flips privacy mode on or off.
 */
export function togglePrivacyMode() {
  privacyModeStore.setState((state) => ({
    isEnabled: !state.isEnabled,
  }))
}

/**
 * Sets privacy mode explicitly.
 */
export function setPrivacyMode(isEnabled: boolean) {
  privacyModeStore.setState(() => ({ isEnabled }))
}
