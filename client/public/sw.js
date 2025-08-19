const CACHE_NAME = 'soundwave-v2';
const STATIC_CACHE = 'soundwave-static-v2';
const DATA_CACHE = 'soundwave-data-v2';
const AUDIO_CACHE = 'soundwave-audio-v2';

// Critical resources needed for offline functionality
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[Service Worker] Caching critical assets');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Enhanced fetch event with offline-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle different types of requests
  if (request.method === 'GET') {
    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(handleApiRequest(request));
    }
    // Handle static assets (JS, CSS, images)
    else if (request.destination === 'script' || 
             request.destination === 'style' || 
             request.destination === 'image' ||
             url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff2?)$/)) {
      event.respondWith(handleStaticAsset(request));
    }
    // Handle audio files and blob URLs
    else if (url.protocol === 'blob:' || 
             request.destination === 'audio' ||
             url.pathname.match(/\.(mp3|wav|flac|m4a|aac|ogg|opus)$/)) {
      event.respondWith(handleAudioRequest(request));
    }
    // Handle navigation requests
    else if (request.mode === 'navigate' || request.destination === 'document') {
      event.respondWith(handleNavigationRequest(request));
    }
    // Default handling
    else {
      event.respondWith(handleDefaultRequest(request));
    }
  } else if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
    // Handle data mutations with background sync
    event.respondWith(handleDataMutation(request));
  }
});

// Handle API requests with cache-first strategy
async function handleApiRequest(request) {
  try {
    // Try network first for API calls
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DATA_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[Service Worker] Serving API from cache:', request.url);
      return cachedResponse;
    }
    
    // Return offline data for tracks endpoint
    if (request.url.includes('/api/tracks')) {
      return new Response(
        JSON.stringify(await getOfflineTracks()),
        { 
          headers: { 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }
    
    // Return error response
    return new Response(
      JSON.stringify({ error: 'Offline mode - data unavailable' }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 503
      }
    );
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Failed to fetch static asset:', request.url);
    return new Response('Offline - Asset unavailable', { status: 503 });
  }
}

// Handle audio requests
async function handleAudioRequest(request) {
  // For blob URLs, let them pass through
  if (request.url.startsWith('blob:')) {
    return fetch(request);
  }
  
  // Check audio cache first
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache audio files for offline playback
    if (networkResponse.ok && request.url.match(/\.(mp3|wav|flac|m4a|aac|ogg|opus)$/)) {
      const cache = await caches.open(AUDIO_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Failed to fetch audio:', request.url);
    return new Response('Audio unavailable offline', { status: 503 });
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return cached index.html for offline navigation
    const cachedResponse = await caches.match('/') || 
                          await caches.match('/index.html');
    
    if (cachedResponse) {
      console.log('[Service Worker] Serving app shell from cache');
      return cachedResponse;
    }
    
    return new Response('Offline - Please check your connection', { status: 503 });
  }
}

// Handle default requests
async function handleDefaultRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

// Handle data mutations with background sync
async function handleDataMutation(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Queue for background sync when online
    if ('sync' in self.registration) {
      const requestData = await request.clone().json();
      await queueOfflineRequest(request.url, request.method, requestData);
      
      await self.registration.sync.register('sync-data');
      
      return new Response(
        JSON.stringify({ 
          message: 'Request queued for sync',
          offline: true 
        }),
        { 
          headers: { 'Content-Type': 'application/json' },
          status: 202
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Offline - request failed' }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 503
      }
    );
  }
}

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  const cacheWhitelist = [STATIC_CACHE, DATA_CACHE, AUDIO_CACHE];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
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

// Background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncOfflineData());
  }
});

// Sync offline data when back online
async function syncOfflineData() {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(['offlineQueue'], 'readonly');
    const store = tx.objectStore('offlineQueue');
    const requests = await store.getAll();
    
    for (const request of requests) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request.data),
        });
        
        if (response.ok) {
          // Remove from queue
          const deleteTx = db.transaction(['offlineQueue'], 'readwrite');
          await deleteTx.objectStore('offlineQueue').delete(request.id);
        }
      } catch (error) {
        console.error('[Service Worker] Failed to sync request:', error);
      }
    }
    
    console.log('[Service Worker] Background sync completed');
  } catch (error) {
    console.error('[Service Worker] Background sync failed:', error);
  }
}

// Queue offline requests for later sync
async function queueOfflineRequest(url, method, data) {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(['offlineQueue'], 'readwrite');
    const store = tx.objectStore('offlineQueue');
    
    await store.add({
      id: Date.now() + Math.random(),
      url,
      method,
      data,
      timestamp: Date.now()
    });
    
    console.log('[Service Worker] Request queued for offline sync');
  } catch (error) {
    console.error('[Service Worker] Failed to queue request:', error);
  }
}

// Get offline tracks from IndexedDB
async function getOfflineTracks() {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(['tracks'], 'readonly');
    const store = tx.objectStore('tracks');
    const tracks = await store.getAll();
    
    return tracks || [];
  } catch (error) {
    console.error('[Service Worker] Failed to get offline tracks:', error);
    return [];
  }
}

// Open IndexedDB
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SoundWaveDB', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('tracks')) {
        db.createObjectStore('tracks', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('audioBlobs')) {
        db.createObjectStore('audioBlobs', { keyPath: 'trackId' });
      }
      
      if (!db.objectStoreNames.contains('offlineQueue')) {
        const queueStore = db.createObjectStore('offlineQueue', { keyPath: 'id' });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('playlists')) {
        db.createObjectStore('playlists', { keyPath: 'id' });
      }
    };
  });
}

// Handle push notifications (if needed in the future)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    },
    actions: [
      {
        action: 'explore',
        title: 'Open SoundWave',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('SoundWave', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
