const CACHE_NAME = 'fipe-monitor-v1';
const STATIC_CACHE = 'fipe-static-v1';
const DATA_CACHE = 'fipe-data-v1';

// Arquivos estáticos para cache
const STATIC_FILES = [
  '/',
  '/todos',
  '/resultado',
  '/manifest.json',
  '/offline.html'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static files');
      return cache.addAll(STATIC_FILES);
    })
  );
  self.skipWaiting();
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DATA_CACHE) {
            console.log('[SW] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estratégia de cache para requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não-GET
  if (request.method !== 'GET') {
    return;
  }

  // API requests - Network First, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone a resposta para guardar no cache
          const responseClone = response.clone();
          caches.open(DATA_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Se offline, tentar buscar do cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Retornar JSON vazio se não tiver cache
            return new Response(
              JSON.stringify({ 
                success: false, 
                offline: true, 
                message: 'Você está offline' 
              }),
              {
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }

  // Arquivos estáticos - Cache First
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|ico|woff|woff2)$/) ||
    url.pathname.startsWith('/_next/')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        });
      })
    );
    return;
  }

  // Páginas HTML - Network First
  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(STATIC_CACHE).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Se for navegação, mostrar página offline
          if (request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        });
      })
  );
});

// Sincronização em background quando voltar online
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  if (event.tag === 'sync-veiculos') {
    event.waitUntil(syncVeiculos());
  }
});

async function syncVeiculos() {
  // Aqui você pode implementar sincronização de dados pendentes
  console.log('[SW] Syncing veiculos data...');
}

// Receber mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
