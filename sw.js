/* ==========================================================================
   BEST FOOD PORTUGAL — PWA SERVICE WORKER (TOLERÂNCIA A FALHAS / OFFLINE)
   Ficheiro: sw.js
   ========================================================================== */

const CACHE_NAME = 'bfp-pwa-v3';

// Ficheiros essenciais pré-guardados para funcionamento 100% offline
const ASSETS_TO_CACHE = [
  './',
  './vendedor.html',
  './familia.html',
  './menu.html',
  './relatorio.html',
  './css/2styles.css',
  './css/3styles.css',
  './css/4styles.css',
  './js/db.js',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
];

// Instalação do Cache PWA
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] A guardar ficheiros essenciais em cache...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] A remover cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceção de pedidos com suporte total offline (Stale-While-Revalidate + Fallback)
self.addEventListener('fetch', (event) => {
  // Ignorar pedidos que não sejam HTTP/HTTPS (ex: extensões de browser) e requisições não-GET
  if (!event.request.url.startsWith('http') || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Se a rede falhar e o utilizador tentar navegar para uma página não guardada
        if (event.request.mode === 'navigate') {
          return caches.match('./vendedor.html') || caches.match('./familia.html');
        }
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});