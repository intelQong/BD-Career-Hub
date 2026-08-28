/* ==========================================================
   BD Career Hub - Service Worker (sw.js)
   Fast caching, offline fallback, and PWA lifecycle manager
   ========================================================== */

const CACHE_NAME = 'bd-career-hub-v1.0.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './css/app.css',
  './css/passkey.css',
  './css/icons.css',
  './js/app.js',
  './js/passkey.js',
  './js/auth-bridge.js',
  './js/pwa.js',
  './icons/favicon.svg',
  './icons/passkey-icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png',
  './icons/apple-touch-icon.png'
];

// Install Event - Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-while-revalidate for local assets, Network-first for navigation
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests and same-origin or local requests
  if (request.method !== 'GET') return;

  // Handle external bdjobs links / iframes (pass-through to network)
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return caches.match('./offline.html');
          });
        })
    );
    return;
  }

  // Static Assets - Cache First with Network Revalidation
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // If image fails, fallback to favicon if possible
        if (request.destination === 'image') {
          return caches.match('./icons/favicon.svg');
        }
      });
    })
  );
});
