const CACHE_VERSION = 'v3';
const STATIC_CACHE = `soundwave-static-${CACHE_VERSION}`;
const DATA_CACHE = `soundwave-data-${CACHE_VERSION}`;
const AUDIO_CACHE = `soundwave-audio-${CACHE_VERSION}`;
const RUNTIME_CACHE = `soundwave-runtime-${CACHE_VERSION}`;

// Critical resources for offline functionality
const CRITICAL_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Extended resources to cache for better offline experience
const EXTENDED_RESOURCES = [
  '/library',
  '/search',
];

// Install event - cache critical assets for offline functionality
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing version', CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Cache critical resources
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[Service Worker] Caching critical resources');
        return cache.addAll(CRITICAL_RESOURCES);
      }),
      // Pre-cache extended resources for better UX
      caches.open(RUNTIME_CACHE).then((cache) => {
        console.log('[Service Worker] Pre-caching extended resources');
        return Promise.allSettled(
          EXTENDED_RESOURCES.map(url => 
            fetch(url).then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
            }).catch(err => console.log('Pre-cache failed for:', url))
          )
        );
      })
    ]).then(() => {
      console.log('[Service Worker] Installation complete');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating version', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('soundwave-') && !cacheName.includes(CACHE_VERSION)) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Activation complete');
      return self.clients.claim();
    })
  );
});

// Enhanced fetch event with cache-first strategy optimized for audio apps
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle GET requests
  if (request.method !== 'GET') return;
  
  // Handle different types of requests with optimized strategies
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  }
  // Handle static assets (JS, CSS, images) - Cache First
  else if (request.destination === 'script' || 
           request.destination === 'style' || 
           request.destination === 'image' ||
           url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff2?|ico)$/)) {
    event.respondWith(handleStaticAsset(request));
  }
  // Handle audio files - Cache First with special handling
  else if (url.protocol === 'blob:' || 
           request.destination === 'audio' ||
           url.pathname.match(/\.(mp3|wav|flac|m4a|aac|ogg|opus|webm)$/)) {
    event.respondWith(handleAudioRequest(request));
  }
  // Handle navigation requests - Network First with cache fallback
  else if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(handleNavigationRequest(request));
  }
  // Default handling for other requests
  else {
    event.respondWith(handleDefaultRequest(request));
  }
});

// Handle API requests with cache-first strategy for offline resilience
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Cache-first strategy for API requests
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[Service Worker] Serving API from cache:', url.pathname);
      
      // Attempt background sync if online
      if (navigator.onLine) {
        fetch(request.clone())
          .then(async (response) => {
            if (response.ok) {
              const cache = await caches.open(DATA_CACHE);
              await cache.put(request, response.clone());
              console.log('[Service Worker] Background updated cache for:', url.pathname);
            }
          })
          .catch(() => console.log('[Service Worker] Background sync failed for:', url.pathname));
      }
      
      return cachedResponse;
    }
    
    // Network fallback
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DATA_CACHE);
      await cache.put(request, networkResponse.clone());
      console.log('[Service Worker] Cached new API response:', url.pathname);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] API request failed, checking cache:', url.pathname);
    
    // Final cache check
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline tracks from IndexedDB for /api/tracks
    if (url.pathname === '/api/tracks') {
      try {
        const offlineTracks = await getOfflineTracksFromIDB();
        return new Response(JSON.stringify(offlineTracks), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (idbError) {
        console.log('[Service Worker] Failed to get offline tracks:', idbError);
      }
    }
    
    // Return appropriate offline response
    return new Response(JSON.stringify({ 
      error: 'Offline', 
      message: 'Content unavailable offline',
      timestamp: Date.now()
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
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

// Handle audio requests with cache-first strategy for offline playback
async function handleAudioRequest(request) {
  // For blob URLs, let them pass through (local files)
  if (request.url.startsWith('blob:')) {
    return fetch(request);
  }
  
  // Check audio cache first
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    console.log('[Service Worker] Serving audio from cache:', request.url);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache audio files for offline playback
    if (networkResponse.ok && request.url.match(/\.(mp3|wav|flac|m4a|aac|ogg|opus)$/)) {
      const cache = await caches.open(AUDIO_CACHE);
      cache.put(request, networkResponse.clone());
      console.log('[Service Worker] Cached audio file for offline playback');
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Failed to fetch audio:', request.url);
    
    // Try to get audio blob from IndexedDB as fallback
    try {
      const audioBlob = await getAudioBlobFromIDB(request.url);
      if (audioBlob) {
        return new Response(audioBlob, {
          headers: { 'Content-Type': 'audio/mpeg' }
        });
      }
    } catch (idbError) {
      console.log('[Service Worker] No offline audio available');
    }
    
    return new Response('Audio unavailable offline', { status: 503 });
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
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

// Get offline tracks from IndexedDB
async function getOfflineTracksFromIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SoundWaveDB', 2);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      
      if (!db.objectStoreNames.contains('tracks')) {
        resolve([]);
        return;
      }
      
      const transaction = db.transaction(['tracks'], 'readonly');
      const store = transaction.objectStore('tracks');
      const getAllRequest = store.getAll();
      
      getAllRequest.onerror = () => reject(getAllRequest.error);
      getAllRequest.onsuccess = () => {
        const tracks = getAllRequest.result || [];
        console.log('[Service Worker] Retrieved', tracks.length, 'offline tracks from IndexedDB');
        resolve(tracks);
      };
    };
  });
}

// Get audio blob from IndexedDB for offline playback
async function getAudioBlobFromIDB(trackUrl) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SoundWaveDB', 2);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      
      if (!db.objectStoreNames.contains('audioBlobs')) {
        resolve(null);
        return;
      }
      
      const transaction = db.transaction(['audioBlobs'], 'readonly');
      const store = transaction.objectStore('audioBlobs');
      
      // Try to find by track URL or ID
      const getAllRequest = store.getAll();
      
      getAllRequest.onerror = () => reject(getAllRequest.error);
      getAllRequest.onsuccess = () => {
        const audioBlobs = getAllRequest.result || [];
        const matchingBlob = audioBlobs.find(blob => 
          blob.trackUrl === trackUrl || trackUrl.includes(blob.trackId)
        );
        
        resolve(matchingBlob ? matchingBlob.audioData : null);
      };
    };
  });
}

// Cache audio blob data for offline playback
async function cacheAudioBlob(trackId, audioBlob, trackUrl) {
  try {
    const request = indexedDB.open('SoundWaveDB', 2);
    
    return new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        
        if (!db.objectStoreNames.contains('audioBlobs')) {
          resolve(false);
          return;
        }
        
        const transaction = db.transaction(['audioBlobs'], 'readwrite');
        const store = transaction.objectStore('audioBlobs');
        
        const putRequest = store.put({
          trackId: trackId,
          trackUrl: trackUrl,
          audioData: audioBlob,
          timestamp: Date.now()
        });
        
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => {
          console.log('[Service Worker] Cached audio blob for track:', trackId);
          resolve(true);
        };
      };
    });
  } catch (error) {
    console.error('[Service Worker] Failed to cache audio blob:', error);
    return false;
  }
}

// Message handler for communication with main thread
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'CACHE_AUDIO_BLOB':
      try {
        await cacheAudioBlob(data.trackId, data.audioBlob, data.trackUrl);
        event.ports[0]?.postMessage({ success: true });
      } catch (error) {
        event.ports[0]?.postMessage({ success: false, error: error.message });
      }
      break;
      
    case 'CACHE_ESSENTIAL_RESOURCES':
      try {
        const cache = await caches.open(STATIC_CACHE);
        await cache.addAll(CRITICAL_RESOURCES);
        console.log('[Service Worker] Essential resources cached');
        event.ports[0]?.postMessage({ success: true });
      } catch (error) {
        console.error('[Service Worker] Failed to cache essential resources:', error);
        event.ports[0]?.postMessage({ success: false, error: error.message });
      }
      break;
      
    case 'GET_CACHE_STATUS':
      try {
        const cacheNames = await caches.keys();
        const hasCache = cacheNames.some(name => name.includes('soundwave'));
        event.ports[0]?.postMessage({ 
          success: true, 
          hasCache,
          cacheNames: cacheNames.filter(name => name.includes('soundwave'))
        });
      } catch (error) {
        event.ports[0]?.postMessage({ success: false, error: error.message });
      }
      break;
  }
});

// Background sync for offline data (when supported)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

// Sync offline data when back online
async function syncOfflineData() {
  try {
    console.log('[Service Worker] Syncing offline data...');
    
    // Sync cached API responses with server
    const dataCache = await caches.open(DATA_CACHE);
    const requests = await dataCache.keys();
    
    for (const request of requests) {
      if (request.url.includes('/api/')) {
        try {
          const response = await fetch(request);
          if (response.ok) {
            await dataCache.put(request, response);
          }
        } catch (error) {
          console.log('[Service Worker] Failed to sync:', request.url);
        }
      }
    }
    
    console.log('[Service Worker] Background sync completed');
  } catch (error) {
    console.error('[Service Worker] Background sync failed:', error);
  }
}