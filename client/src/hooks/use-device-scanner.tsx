import { useState, useCallback } from 'react';
import { ID3Parser } from '@/lib/id3-parser';
import { Track } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { OfflineStorage } from '@/lib/offline-storage';

interface ScanState {
  isScanning: boolean;
  scanProgress: number;
  foundFiles: number;
  processedFiles: number;
  error: string | null;
}

interface DeviceTrack extends Omit<Track, 'id' | 'createdAt'> {
  fileHandle?: FileSystemFileHandle;
  localFile?: File;
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

  // Check if File System Access API is available
  const isFileSystemAccessSupported = 'showDirectoryPicker' in window;

  // Scan using File System Access API (for desktop browsers)
  const scanWithFileSystemAPI = useCallback(async (): Promise<DeviceTrack[]> => {
    const tracks: DeviceTrack[] = [];
    
    try {
      // Request directory access
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'read',
        startIn: 'music'
      });

      // Recursively scan directory
      const audioFiles: FileSystemFileHandle[] = [];
      const scanDirectory = async (dirHandle: any, depth = 0) => {
        if (depth > 5) return; // Limit recursion depth
        
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            if (isAudioFile(file.name)) {
              audioFiles.push(entry);
            }
          } else if (entry.kind === 'directory') {
            await scanDirectory(entry, depth + 1);
          }
        }
      };

      await scanDirectory(dirHandle);
      
      setState(prev => ({ 
        ...prev, 
        foundFiles: audioFiles.length 
      }));

      // Process found audio files
      for (let i = 0; i < audioFiles.length; i++) {
        const fileHandle = audioFiles[i];
        const file = await fileHandle.getFile();
        
        setState(prev => ({ 
          ...prev, 
          scanProgress: Math.round((i / audioFiles.length) * 100),
          processedFiles: i + 1
        }));

        try {
          const track = await processAudioFile(file, fileHandle);
          if (track) {
            tracks.push(track);
          }
        } catch (err) {
          console.warn(`Failed to process ${file.name}:`, err);
        }
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled the picker
        return [];
      }
      throw err;
    }

    return tracks;
  }, []);

  // Scan using traditional file input (fallback for mobile and unsupported browsers)
  const scanWithFileInput = useCallback(async (files: FileList): Promise<DeviceTrack[]> => {
    const tracks: DeviceTrack[] = [];
    const audioFiles = Array.from(files).filter(file => isAudioFile(file.name));
    
    setState(prev => ({ 
      ...prev, 
      foundFiles: audioFiles.length 
    }));

    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      
      setState(prev => ({ 
        ...prev, 
        scanProgress: Math.round((i / audioFiles.length) * 100),
        processedFiles: i + 1
      }));

      try {
        const track = await processAudioFile(file);
        if (track) {
          tracks.push(track);
        }
      } catch (err) {
        console.warn(`Failed to process ${file.name}:`, err);
      }
    }

    return tracks;
  }, []);

  // Process individual audio file
  const processAudioFile = async (
    file: File, 
    fileHandle?: FileSystemFileHandle
  ): Promise<DeviceTrack | null> => {
    try {
      // Parse ID3 tags
      const tags = await ID3Parser.parseFile(file);
      const duration = await ID3Parser.getDuration(file);
      
      // Create object URL for playback (not data URL to save memory)
      const fileUrl = URL.createObjectURL(file);
      
      // Extract folder/path information if available
      const pathInfo = fileHandle ? fileHandle.name : file.name;
      const folderPath = file.webkitRelativePath ? 
        file.webkitRelativePath.substring(0, file.webkitRelativePath.lastIndexOf('/')) : 
        '';
      
      const track: DeviceTrack = {
        title: tags.title || file.name.replace(/\.[^/.]+$/, ""),
        artist: tags.artist || 'Unknown Artist',
        album: tags.album || folderPath || 'Unknown Album',
        genre: tags.genre || 'Unknown',
        duration: Math.round(duration),
        fileUrl,
        fileSource: 'device' as const,
        albumArt: tags.albumArt || null,
        metadata: {
          originalFileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          devicePath: folderPath,
          lastModified: new Date(file.lastModified).toISOString(),
          isDeviceScan: true,
          ...tags,
        },
        fileHandle,
        localFile: file,
      };



      return track;
    } catch (err) {
      console.error(`Error processing ${file.name}:`, err);
      return null;
    }
  };

  // Check if file is audio
  const isAudioFile = (filename: string): boolean => {
    const audioExtensions = [
      '.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.opus', 
      '.wma', '.alac', '.aiff', '.ape', '.webm'
    ];
    const lowerName = filename.toLowerCase();
    return audioExtensions.some(ext => lowerName.endsWith(ext));
  };

  // Main scan function
  const scanDevice = useCallback(async (method: 'folder' | 'files' = 'folder', files?: FileList) => {
    setState({ 
      isScanning: true, 
      scanProgress: 0, 
      foundFiles: 0,
      processedFiles: 0,
      error: null 
    });

    try {
      let deviceTracks: DeviceTrack[] = [];

      if (method === 'folder' && isFileSystemAccessSupported) {
        // Use File System Access API for folder selection
        deviceTracks = await scanWithFileSystemAPI();
      } else if (files) {
        // Use provided files from input
        deviceTracks = await scanWithFileInput(files);
      } else {
        // Fallback to file input
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'audio/*';
        input.webkitdirectory = true; // Enable directory selection on supported browsers
        
        const filesPromise = new Promise<FileList | null>((resolve) => {
          input.onchange = () => resolve(input.files);
          input.oncancel = () => resolve(null);
        });
        
        input.click();
        const selectedFiles = await filesPromise;
        
        if (!selectedFiles) {
          setState(prev => ({ ...prev, isScanning: false }));
          return [];
        }
        
        deviceTracks = await scanWithFileInput(selectedFiles);
      }

      // Save tracks to backend with device source
      const savedTracks: Track[] = [];
      for (const track of deviceTracks) {
        try {
          const { fileHandle, localFile, ...trackData } = track;
          
          // Save track metadata to backend
          const response = await apiRequest('POST', '/api/tracks', trackData);
          const savedTrack = await response.json();
          savedTracks.push(savedTrack);
          
          // Store file reference in IndexedDB for offline/persistent access
          if (localFile) {
            try {
              await offlineStorage.saveAudioBlob(savedTrack.id, localFile, track.fileUrl);
              console.log(`[DeviceScanner] Cached audio blob for offline playback: ${localFile.name}`);
            } catch (err) {
              console.warn('[DeviceScanner] Failed to save audio for offline use:', err);
            }
          }
        } catch (err) {
          console.error('Failed to save track:', err);
        }
      }

      setState({ 
        isScanning: false, 
        scanProgress: 100, 
        foundFiles: deviceTracks.length,
        processedFiles: deviceTracks.length,
        error: null 
      });

      // Invalidate tracks cache
      queryClient.invalidateQueries({ queryKey: ['/api/tracks'] });

      if (savedTracks.length > 0) {
        toast({
          title: "Scan Complete",
          description: `Found and added ${savedTracks.length} track(s) from your device`,
        });
      } else if (deviceTracks.length === 0) {
        toast({
          title: "No Audio Files Found",
          description: "No audio files were found in the selected location",
          variant: "default",
        });
      }

      return savedTracks;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Scan failed';
      setState({ 
        isScanning: false, 
        scanProgress: 0, 
        foundFiles: 0,
        processedFiles: 0,
        error: errorMessage 
      });
      
      toast({
        title: "Scan Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      return [];
    }
  }, [isFileSystemAccessSupported, scanWithFileSystemAPI, scanWithFileInput, toast]);

  // Quick scan for recently added files
  const quickScan = useCallback(async () => {
    if (!isFileSystemAccessSupported) {
      toast({
        title: "Quick Scan Not Available",
        description: "Your browser doesn't support quick scanning. Please use the regular scan option.",
        variant: "default",
      });
      return [];
    }

    // Try to access recently used directories from localStorage
    const recentPaths = localStorage.getItem('recentAudioPaths');
    if (!recentPaths) {
      return scanDevice('folder');
    }

    // Implementation would require persistent permissions which are browser-specific
    // For now, fall back to regular scan
    return scanDevice('folder');
  }, [isFileSystemAccessSupported, scanDevice, toast]);

  return {
    isScanning: state.isScanning,
    scanProgress: state.scanProgress,
    foundFiles: state.foundFiles,
    processedFiles: state.processedFiles,
    error: state.error,
    scanDevice,
    quickScan,
    isFileSystemAccessSupported,
  };
}