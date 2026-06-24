const CACHE_VERSION = 'money-diary-v2'
const PRECACHE_URLS = ['/offline.html', '/manifest.json', '/favicon.ico', '/favicon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: 'window' }).then((clients) =>
          clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' })),
        ),
      ),
  )
})

function isStaticAssetRequest(url) {
  return /\.(?:css|js|ico|png|svg|webp|woff2?)$/i.test(url.pathname)
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/')
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return
  }

  const url = new URL(event.request.url)

  if (url.origin !== self.location.origin) {
    return
  }

  if (isApiRequest(url)) {
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const offlinePage = await caches.match('/offline.html')
        return offlinePage ?? Response.error()
      }),
    )
    return
  }

  if (isStaticAssetRequest(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          return cached
        }

        return fetch(event.request).then((response) => {
          if (!response.ok) {
            return response
          }

          const responseClone = response.clone()
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, responseClone))
          return response
        })
      }),
    )
  }
})
