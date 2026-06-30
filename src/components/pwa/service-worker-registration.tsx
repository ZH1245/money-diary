import { useEffect } from 'react'
import { registerServiceWorker } from '#/lib/pwa/register-service-worker'

/** Injects the web app manifest after first paint so it stays off the LCP critical path. */
function useDeferredWebManifest() {
  useEffect(() => {
    if (document.querySelector('link[rel="manifest"]')) {
      return
    }

    const link = document.createElement('link')
    link.rel = 'manifest'
    link.href = '/manifest.json'
    document.head.appendChild(link)
  }, [])
}

/** Boots production service worker registration on the client. */
export function ServiceWorkerRegistration() {
  useDeferredWebManifest()

  useEffect(() => {
    registerServiceWorker()
  }, [])

  return null
}
