import { useState, useCallback } from 'react';
import { ID3Parser } from '@/lib/id3-parser';
import { Track } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { OfflineStorage } from '@/lib/offline-storage';
import { useQueryClient } from '@tanstack/react-query';

interface ScanState {
  isScanning: boolean;
  scanProgress: number;
  foundFiles: number;
  processedFiles: number;
  error: string | null;
}

// This interface is internal to the hook for processing
interface DeviceTrack extends Omit<Track, 'id' | 'createdAt'> {
  localFile: File;
}

export function useDeviceScanner() {
  const [state, setState] = useState<ScanState>({
    isScanning: false,
    scanProgress: 0,
    foundFiles: 0,
    processedFiles: 0,
    error: null,
  });

  const { toast } = useToast();
  const offlineStorage = new OfflineStorage();
  const queryClient = useQueryClient(); // ADDED: To invalidate local queries

  const isFileSystemAccessSupported = 'showDirectoryPicker' in window;

  const processAudioFile = async (file: File): Promise<DeviceTrack | null> => {
    try {
      const tags = await ID3Parser.parseFile(file);
      const duration = await ID3Parser.getDuration(file);

      const track: DeviceTrack = {
        title: tags.title || file.name.replace(/\.[^/.]+$/, ""),
        artist: tags.artist || 'Unknown Artist',
        album: tags.album || 'Unknown Album',
        genre: tags.genre || 'Unknown',
        duration: Math.round(duration),
        fileUrl: '', // This will be generated from the blob later
        fileSource: 'device' as const,
        albumArt: tags.albumArt || null,
        metadata: { ...tags },
        localFile: file,
      };
      return track;
    } catch (err) {
      console.error(`Error processing ${file.name}:`, err);
      return null;
    }
  };

  const isAudioFile = (filename: string): boolean => {
    const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.opus'];
    return audioExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  };
  
  const scanWithFileSystemAPI = useCallback(async (): Promise<DeviceTrack[]> => {
    const tracks: DeviceTrack[] = [];
    
    try {
      // Check if the API is available and working
      if (!('showDirectoryPicker' in window)) {
        throw new Error('File System Access API not supported');
      }
      
      const dirHandle = await (window as any).showDirectoryPicker();
      const audioFiles: File[] = [];

      const scanDirectory = async (handle: any) => {
        for await (const entry of handle.values()) {
          if (entry.kind === 'file' && isAudioFile(entry.name)) {
            const file = await entry.getFile();
            audioFiles.push(file);
          } else if (entry.kind === 'directory') {
            await scanDirectory(entry);
          }
        }
      };
      
      await scanDirectory(dirHandle);
      setState(prev => ({ ...prev, foundFiles: audioFiles.length }));

      for (let i = 0; i < audioFiles.length; i++) {
          const file = audioFiles[i];
          setState(prev => ({ ...prev, scanProgress: Math.round(((i + 1) / audioFiles.length) * 100) }));
          const track = await processAudioFile(file);
          if (track) tracks.push(track);
      }
      return tracks;
    } catch (error: any) {
      // If File System Access API fails (cross-origin, security, etc.), throw to fallback
      console.warn('File System Access API failed:', error.message);
      throw new Error('Folder scanning not available in this context. Please use file selection instead.');
    }
  }, []);

  const scanWithFileInput = useCallback(async (files: FileList): Promise<DeviceTrack[]> => {
      const tracks: DeviceTrack[] = [];
      const audioFiles = Array.from(files).filter(file => isAudioFile(file.name));
      setState(prev => ({ ...prev, foundFiles: audioFiles.length }));

      for (let i = 0; i < audioFiles.length; i++) {
          const file = audioFiles[i];
          setState(prev => ({ ...prev, scanProgress: Math.round(((i + 1) / audioFiles.length) * 100) }));
          const track = await processAudioFile(file);
          if (track) tracks.push(track);
      }
      return tracks;
  }, []);


  const scanDevice = useCallback(async (method: 'folder' | 'files') => {
    if (state.isScanning) {
      toast({
        title: "Scan in Progress",
        description: "A device scan is already running.",
      });
      return;
    }
    setState({ isScanning: true, scanProgress: 0, foundFiles: 0, processedFiles: 0, error: null });

    try {
      let deviceTracks: DeviceTrack[] = [];

      if (method === 'folder') {
        if (!isFileSystemAccessSupported) {
          toast({ 
            title: "Folder Scanning Not Supported", 
            description: "Your browser does not support directory access. Please try selecting files instead.",
            variant: "destructive"
          });
          setState(prev => ({ ...prev, isScanning: false }));
          return [];
        }
        try {
          deviceTracks = await scanWithFileSystemAPI();
        } catch (error: any) {
          console.warn('Folder scanning failed:', error.message);
          toast({ 
            title: "Folder Scan Cancelled or Failed", 
            description: "Could not access the selected folder. This can happen if you cancel the prompt or due to browser security settings.",
            variant: "destructive"
          });
          setState(prev => ({ ...prev, isScanning: false }));
          return [];
        }
      } else { // method === 'files'
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'audio/*';
        
        const selectedFiles = await new Promise<FileList | null>((resolve) => {
            input.onchange = () => resolve(input.files);
            input.onabort = () => resolve(null);
            input.oncancel = () => resolve(null);
            input.click();
        });
        
        if (selectedFiles && selectedFiles.length > 0) {
            deviceTracks = await scanWithFileInput(selectedFiles);
        } else {
          // User cancelled file selection
          setState(prev => ({ ...prev, isScanning: false }));
          return [];
        }
      }

      // CHANGED: Save tracks directly to IndexedDB instead of making an API request.
      const savedTracks: Track[] = [];
      for (const track of deviceTracks) {
        const { localFile, ...trackData } = track;
        const savedTrack = await offlineStorage.addTrackWithAudio(trackData, localFile);
        savedTracks.push(savedTrack);
        setState(prev => ({ ...prev, processedFiles: prev.processedFiles + 1 }));
      }

      setState(prev => ({ ...prev, isScanning: false, scanProgress: 100 }));
      
      // CHANGED: Invalidate the local query to refresh the UI with new tracks from IndexedDB.
      await queryClient.invalidateQueries({ queryKey: ['local-tracks'] });

      if (savedTracks.length > 0) {
        toast({
          title: "Scan Complete",
          description: `Added ${savedTracks.length} new track(s) to your local library.`,
        });
      } else {
        toast({ title: "No new audio files found." });
      }

      return savedTracks;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setState({ isScanning: false, scanProgress: 0, foundFiles: 0, processedFiles: 0, error: errorMessage });
      toast({ title: "Scan Failed", description: errorMessage, variant: "destructive" });
      return [];
    }
  }, [isFileSystemAccessSupported, scanWithFileSystemAPI, scanWithFileInput, toast, queryClient, offlineStorage]);

  return { ...state, scanDevice, isFileSystemAccessSupported };
}
