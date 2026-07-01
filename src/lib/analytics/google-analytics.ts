/** Google Analytics 4 measurement ID from Vite env (public). */
export function getGaMeasurementId(): string | null {
  const raw = import.meta.env.VITE_GA_MEASUREMENT_ID
  if (typeof raw !== 'string' || !raw.trim()) {
    return null
  }

  return raw.trim()
}

/** Loads gtag in production when a measurement ID is configured. */
export function isGoogleAnalyticsEnabled(): boolean {
  if (!getGaMeasurementId()) {
    return false
  }

  if (import.meta.env.PROD) {
    return true
  }

  return import.meta.env.VITE_GA_DEBUG === 'true'
}

/** Sends a SPA page view to GA4 when gtag is available. */
export function trackGoogleAnalyticsPageView(pagePath: string): void {
  const measurementId = getGaMeasurementId()
  if (!measurementId || !isGoogleAnalyticsEnabled() || typeof window.gtag !== 'function') {
    return
  }

  window.gtag('config', measurementId, {
    page_path: pagePath,
  })
}
