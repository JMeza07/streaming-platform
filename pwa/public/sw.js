const CACHE_NAME = 'mezastreaming-pwa-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icons.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Pass through API calls to network with fallback
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'Sin conexión de red al servidor' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Network first, cache fallback for navigation and static assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
