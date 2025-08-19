// Offline storage manager for PWA functionality
import { Track } from '@shared/schema';

const DB_NAME = 'SoundWaveOffline';
const DB_VERSION = 1;
const TRACKS_STORE = 'tracks';
const AUDIO_STORE = 'audio';
const PLAYLISTS_STORE = 'playlists';

export class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create tracks store
        if (!db.objectStoreNames.contains(TRACKS_STORE)) {
          const tracksStore = db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
          tracksStore.createIndex('title', 'title', { unique: false });
          tracksStore.createIndex('artist', 'artist', { unique: false });
          tracksStore.createIndex('album', 'album', { unique: false });
        }

        // Create audio blob store
        if (!db.objectStoreNames.contains(AUDIO_STORE)) {
          db.createObjectStore(AUDIO_STORE, { keyPath: 'trackId' });
        }

        // Create playlists store
        if (!db.objectStoreNames.contains(PLAYLISTS_STORE)) {
          const playlistsStore = db.createObjectStore(PLAYLISTS_STORE, { keyPath: 'id' });
          playlistsStore.createIndex('name', 'name', { unique: false });
        }
      };
    });
  }

  async saveTracks(tracks: Track[]): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction([TRACKS_STORE], 'readwrite');
    const store = transaction.objectStore(TRACKS_STORE);

    for (const track of tracks) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put(track);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    console.log(`Saved ${tracks.length} tracks offline`);
  }

  async getTracks(): Promise<Track[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TRACKS_STORE], 'readonly');
      const store = transaction.objectStore(TRACKS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('Failed to get tracks from IndexedDB');
        reject(request.error);
      };
    });
  }

  async saveAudioBlob(trackId: string, blob: Blob): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([AUDIO_STORE], 'readwrite');
      const store = transaction.objectStore(AUDIO_STORE);
      const request = store.put({ trackId, blob, timestamp: Date.now() });

      request.onsuccess = () => {
        console.log(`Saved audio blob for track ${trackId}`);
        
        // Also cache in service worker if available
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CACHE_AUDIO',
            url: `/offline-audio/${trackId}`,
            blob
          });
        }
        
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to save audio blob');
        reject(request.error);
      };
    });
  }

  async getAudioBlob(trackId: string): Promise<Blob | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([AUDIO_STORE], 'readonly');
      const store = transaction.objectStore(AUDIO_STORE);
      const request = store.get(trackId);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.blob : null);
      };

      request.onerror = () => {
        console.error('Failed to get audio blob');
        reject(request.error);
      };
    });
  }

  async clearOfflineData(): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction([TRACKS_STORE, AUDIO_STORE, PLAYLISTS_STORE], 'readwrite');
    
    await Promise.all([
      new Promise<void>((resolve) => {
        transaction.objectStore(TRACKS_STORE).clear().onsuccess = () => resolve();
      }),
      new Promise<void>((resolve) => {
        transaction.objectStore(AUDIO_STORE).clear().onsuccess = () => resolve();
      }),
      new Promise<void>((resolve) => {
        transaction.objectStore(PLAYLISTS_STORE).clear().onsuccess = () => resolve();
      })
    ]);

    console.log('Cleared all offline data');
  }

  async getStorageInfo(): Promise<{ used: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return { used: 0, quota: 0 };
  }
}