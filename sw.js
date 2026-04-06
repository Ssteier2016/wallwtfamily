const CACHE_NAME = 'wallet-family-v1';
const urlsToCache = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js'
];

// Instalación: cachear recursos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activación: limpiar caches antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia: Network First con fallback a cache para HTML y recursos, y cache first para CDNs
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  
  // Para las peticiones a Firebase Auth (no cachear por seguridad)
  if (requestUrl.hostname.includes('googleapis.com') || requestUrl.hostname.includes('firebase')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Para recursos de CDN y el HTML: intentar red, si falla, usar cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clonar la respuesta y guardarla en cache
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
