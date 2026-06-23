import { useEffect } from 'react'
import { registerServiceWorker } from '#/lib/pwa/register-service-worker'

/** Boots production service worker registration on the client. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return null
}
