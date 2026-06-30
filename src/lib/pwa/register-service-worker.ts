import { APP_UPDATE_EVENT } from '#/lib/app-version'

/**
 * Registers the app service worker in production builds.
 * When a new SW takes control after a deploy, notifies the update modal.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Service worker registration can fail on unsupported browsers or HTTP origins.
    })
  })

  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type !== 'SW_UPDATED') return
    window.dispatchEvent(new CustomEvent(APP_UPDATE_EVENT))
  })
}
