import { toast } from 'sonner'

/**
 * Registers the app service worker in production builds.
 * When a new SW takes control after a deploy, prompts the user to reload.
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
    toast.info('A new version is available.', {
      description: 'Refresh to get the latest updates.',
      duration: Infinity,
      action: {
        label: 'Refresh',
        onClick: () => window.location.reload(),
      },
    })
  })
}
