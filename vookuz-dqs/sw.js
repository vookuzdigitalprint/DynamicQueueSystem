const CACHE_NAME = 'vookuz-dqs-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Just cache the manifest and icon to pass PWA criteria
      return cache.addAll([
        './',
        './manifest.json',
        './icon-512.png',
        './src/css/main.css'
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Simple network-first strategy for a dynamic app
  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request);
    })
  );
});
