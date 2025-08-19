import { useEffect, useState } from 'react';
import { OfflineStorage } from '@/lib/offline-storage';
import { Track } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';

export function useOfflineSync() {
  const [offlineStorage] = useState(() => new OfflineStorage());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');

  // Get tracks from API
  const { data: onlineTracks } = useQuery({
    queryKey: ['/api/tracks'],
    enabled: isOnline
  });

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('App is online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('App is offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync tracks when online
  useEffect(() => {
    if (isOnline && onlineTracks && onlineTracks.length > 0) {
      setSyncStatus('syncing');
      
      offlineStorage.saveTracks(onlineTracks).then(() => {
        setSyncStatus('synced');
        console.log('Tracks synced for offline use');
        
        // Reset status after 3 seconds
        setTimeout(() => setSyncStatus('idle'), 3000);
      }).catch((error) => {
        console.error('Failed to sync tracks:', error);
        setSyncStatus('idle');
      });
    }
  }, [isOnline, onlineTracks, offlineStorage]);

  // Get tracks (offline or online)
  const getTracks = async (): Promise<Track[]> => {
    if (isOnline && onlineTracks) {
      return onlineTracks;
    }
    
    // Try to get from offline storage
    try {
      const offlineTracks = await offlineStorage.getTracks();
      if (offlineTracks.length > 0) {
        console.log('Serving tracks from offline storage');
        return offlineTracks;
      }
    } catch (error) {
      console.error('Failed to get offline tracks:', error);
    }

    return [];
  };

  // Save audio blob for offline playback
  const saveAudioForOffline = async (trackId: string, blob: Blob) => {
    try {
      await offlineStorage.saveAudioBlob(trackId, blob);
      console.log(`Audio saved for offline: ${trackId}`);
    } catch (error) {
      console.error('Failed to save audio for offline:', error);
    }
  };

  // Get audio blob from offline storage
  const getOfflineAudio = async (trackId: string): Promise<Blob | null> => {
    try {
      return await offlineStorage.getAudioBlob(trackId);
    } catch (error) {
      console.error('Failed to get offline audio:', error);
      return null;
    }
  };

  // Get storage info
  const getStorageInfo = async () => {
    return await offlineStorage.getStorageInfo();
  };

  // Clear offline data
  const clearOfflineData = async () => {
    await offlineStorage.clearOfflineData();
    
    // Also clear service worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  };

  return {
    isOnline,
    syncStatus,
    getTracks,
    saveAudioForOffline,
    getOfflineAudio,
    getStorageInfo,
    clearOfflineData
  };
}