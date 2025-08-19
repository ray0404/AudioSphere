// Service Worker for SoundWave PWA
const CACHE_NAME = 'soundwave-v1';
const RUNTIME_CACHE = 'soundwave-runtime-v1';
const AUDIO_CACHE = 'soundwave-audio-v1';

// Essential files to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching static assets');
      return cache.addAll(STATIC_CACHE_URLS);
    }).then(() => {
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== RUNTIME_CACHE && 
              cacheName !== AUDIO_CACHE) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle audio blob URLs and data URLs
  if (url.protocol === 'blob:' || url.protocol === 'data:') {
    return; // Let browser handle blob/data URLs directly
  }

  // Special handling for audio files
  if (request.url.includes('/api/tracks/') || 
      request.url.includes('.mp3') || 
      request.url.includes('.wav') ||
      request.url.includes('.flac') ||
      request.url.includes('.m4a') ||
      request.url.includes('.aac')) {
    
    event.respondWith(
      caches.open(AUDIO_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[ServiceWorker] Serving audio from cache:', request.url);
            return cachedResponse;
          }

          // If online, fetch and cache the audio
          return fetch(request).then((networkResponse) => {
            // Clone the response before caching
            cache.put(request, networkResponse.clone());
            console.log('[ServiceWorker] Cached audio:', request.url);
            return networkResponse;
          }).catch(() => {
            // If offline and not cached, return a 503 Service Unavailable
            return new Response('Audio not available offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
        });
      })
    );
    return;
  }

  // Handle API requests
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If offline, try to serve from cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[ServiceWorker] Serving API from cache:', request.url);
              return cachedResponse;
            }
            // Return empty array for track lists when offline
            if (request.url.includes('/api/tracks')) {
              return new Response('[]', {
                headers: { 'Content-Type': 'application/json' }
              });
            }
            return new Response('Offline', { status: 503 });
          });
        })
    );
    return;
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Default strategy: Network first, fall back to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Try cache if network fails
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // For JavaScript/CSS files, try to match without query strings
          if (request.url.includes('.js') || request.url.includes('.css')) {
            const urlWithoutQuery = request.url.split('?')[0];
            return caches.match(urlWithoutQuery);
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Handle messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_AUDIO') {
    const { url, blob } = event.data;
    caches.open(AUDIO_CACHE).then((cache) => {
      const response = new Response(blob, {
        headers: { 'Content-Type': 'audio/mpeg' }
      });
      cache.put(url, response);
      console.log('[ServiceWorker] Cached audio from blob:', url);
    });
  }
});

// Background sync for uploading tracks when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tracks') {
    event.waitUntil(
      // Sync any pending track uploads
      console.log('[ServiceWorker] Background sync: syncing tracks')
    );
  }
});

console.log('[ServiceWorker] Service Worker loaded');