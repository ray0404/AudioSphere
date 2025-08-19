const CACHE_NAME = 'soundwave-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap',
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
      .catch(() => {
        // Return offline page or cached content
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync for offline uploads
self.addEventListener('sync', (event) => {
  if (event.tag === 'upload-tracks') {
    event.waitUntil(syncTracks());
  }
});

async function syncTracks() {
  try {
    // Handle background sync for track uploads
    const pendingUploads = await getStoredUploads();
    
    for (const upload of pendingUploads) {
      try {
        const response = await fetch('/api/tracks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(upload),
        });
        
        if (response.ok) {
          await removePendingUpload(upload.id);
        }
      } catch (error) {
        console.error('Failed to sync upload:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function getStoredUploads() {
  // Get pending uploads from IndexedDB or localStorage
  try {
    const stored = localStorage.getItem('pendingUploads');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

async function removePendingUpload(uploadId) {
  try {
    const stored = localStorage.getItem('pendingUploads');
    const uploads = stored ? JSON.parse(stored) : [];
    const filtered = uploads.filter(upload => upload.id !== uploadId);
    localStorage.setItem('pendingUploads', JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove pending upload:', error);
  }
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
