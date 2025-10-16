import { Track } from '@shared/schema';

const DB_NAME = 'SoundWaveDB';
const DB_VERSION = 2; // Incremented version to trigger onupgradeneeded
const TRACKS_STORE = 'tracks';
const AUDIO_STORE = 'audioBlobs';
const PLAYLISTS_STORE = 'playlists';
const OFFLINE_QUEUE_STORE = 'offlineQueue'; // For background sync

export class OfflineStorage {
  private db: IDBDatabase | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(TRACKS_STORE)) {
          db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(AUDIO_STORE)) {
          db.createObjectStore(AUDIO_STORE, { keyPath: 'trackId' });
        }
        if (!db.objectStoreNames.contains(PLAYLISTS_STORE)) {
          db.createObjectStore(PLAYLISTS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(OFFLINE_QUEUE_STORE)) {
          db.createObjectStore(OFFLINE_QUEUE_STORE, { autoIncrement: true });
        }
      };
    });
  }

  // ADDED: A new method to add a track and its audio blob in a single transaction.
  async addTrackWithAudio(track: Omit<Track, 'id' | 'createdAt'>, audioFile: File): Promise<Track> {
    const db = await this.getDB();
    const newId = crypto.randomUUID();
    const newTrack: Track = {
      ...track,
      id: newId,
      createdAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TRACKS_STORE, AUDIO_STORE], 'readwrite');
      const trackStore = transaction.objectStore(TRACKS_STORE);
      const audioStore = transaction.objectStore(AUDIO_STORE);

      const trackRequest = trackStore.add(newTrack);
      trackRequest.onerror = () => reject(transaction.error);

      const audioRequest = audioStore.add({ trackId: newId, blob: audioFile });
      audioRequest.onerror = () => reject(transaction.error);

      transaction.oncomplete = () => {
        console.log(`Successfully stored track and audio for ${newTrack.title}`);
        resolve(newTrack);
      };
      transaction.onerror = () => {
        console.error('Transaction error:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  async getTracks(): Promise<Track[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TRACKS_STORE], 'readonly');
      const store = transaction.objectStore(TRACKS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getAudioBlob(trackId: string): Promise<Blob | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([AUDIO_STORE], 'readonly');
      const store = transaction.objectStore(AUDIO_STORE);
      const request = store.get(trackId);

      request.onsuccess = () => resolve(request.result ? request.result.blob : null);
      request.onerror = () => reject(request.error);
    });
  }
  
  // Existing methods (saveTracks, clearOfflineData, etc.) remain largely the same
  // but we will prefer using `addTrackWithAudio` for new additions.

  async saveTracks(tracks: Track[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TRACKS_STORE], 'readwrite');
      const store = transaction.objectStore(TRACKS_STORE);
      tracks.forEach(track => store.add(track));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async saveAudioBlob(trackId: string, blob: Blob): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([AUDIO_STORE], 'readwrite');
      const store = transaction.objectStore(AUDIO_STORE);
      const request = store.add({ trackId, blob });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getStorageInfo(): Promise<{ usage: number; quota: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimation = await navigator.storage.estimate();
      return {
        usage: estimation.usage || 0,
        quota: estimation.quota || 0,
      };
    }
    return { usage: 0, quota: 0 };
  }

  async clearOfflineData(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TRACKS_STORE, AUDIO_STORE, PLAYLISTS_STORE, OFFLINE_QUEUE_STORE], 'readwrite');
      transaction.objectStore(TRACKS_STORE).clear();
      transaction.objectStore(AUDIO_STORE).clear();
      transaction.objectStore(PLAYLISTS_STORE).clear();
      transaction.objectStore(OFFLINE_QUEUE_STORE).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}