import { APP_UPDATE_EVENT } from '#/lib/app-version'

const SW_UPDATE_CHECK_MS = 60 * 60 * 1000

function notifyAppUpdate() {
  window.dispatchEvent(new CustomEvent(APP_UPDATE_EVENT))
}

function watchInstallingWorker(worker: ServiceWorker) {
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
      notifyAppUpdate()
    }
  })
}

/**
 * Registers the app service worker in production builds.
 * When a new SW takes control after a deploy, notifies the update modal.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  async function register() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })

      if (registration.waiting) {
        notifyAppUpdate()
      }

      registration.addEventListener('updatefound', () => {
        const nextWorker = registration.installing
        if (nextWorker) {
          watchInstallingWorker(nextWorker)
        }
      })

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void registration.update()
        }
      })

      window.setInterval(() => {
        void registration.update()
      }, SW_UPDATE_CHECK_MS)
    } catch {
      // Service worker registration can fail on unsupported browsers or HTTP origins.
    }
  }

  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type !== 'SW_UPDATED') return
    notifyAppUpdate()
  })

  if (document.readyState === 'complete') {
    void register()
    return
  }

  window.addEventListener('load', () => void register(), { once: true })
}
