import { useState, useCallback } from 'react';
import { Track } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface GoogleDriveState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  files: GoogleDriveFile[];
}

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  downloadUrl: string;
  thumbnailLink?: string;
}

export function useGoogleDrive() {
  const [state, setState] = useState<GoogleDriveState>({
    isConnected: false,
    isLoading: false,
    error: null,
    files: [],
  });

  const { toast } = useToast();

  const GOOGLE_DRIVE_API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY || '';
  const SHARED_FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID || '';

  const extractFolderIdFromUrl = (url: string): string | null => {
    // Extract folder ID from various Google Drive URL formats
    const patterns = [
      /\/folders\/([a-zA-Z0-9-_]+)/,
      /id=([a-zA-Z0-9-_]+)/,
      /^([a-zA-Z0-9-_]+)$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  };

  const loadGoogleDriveFilesByUrl = useCallback(async (folderUrl: string) => {
    const folderId = extractFolderIdFromUrl(folderUrl);
    if (!folderId) {
      setState(prev => ({ 
        ...prev, 
        error: 'Invalid Google Drive folder URL' 
      }));
      toast({
        title: "Invalid URL",
        description: "Please provide a valid Google Drive folder URL",
        variant: "destructive",
      });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Use a more reliable approach for accessing public folders
      // Try the Google Drive API with key first, then fallback to web scraping approach
      let files: GoogleDriveFile[] = [];
      
      if (GOOGLE_DRIVE_API_KEY) {
        try {
          const audioMimeTypes = [
            'audio/mpeg',
            'audio/wav', 
            'audio/flac',
            'audio/m4a',
            'audio/aac',
            'audio/ogg'
          ];

          const mimeTypeQuery = audioMimeTypes.map(type => `mimeType='${type}'`).join(' or ');
          const query = `'${folderId}' in parents and (${mimeTypeQuery}) and trashed=false`;
          
          const url = new URL('https://www.googleapis.com/drive/v3/files');
          url.searchParams.append('q', query);
          url.searchParams.append('key', GOOGLE_DRIVE_API_KEY);
          url.searchParams.append('fields', 'files(id,name,mimeType,size,thumbnailLink)');
          url.searchParams.append('pageSize', '100');

          const response = await fetch(url.toString());
          
          if (response.ok) {
            const data = await response.json();
            files = data.files.map((file: any) => ({
              id: file.id,
              name: file.name,
              mimeType: file.mimeType,
              size: file.size || '0',
              downloadUrl: `https://drive.google.com/uc?id=${file.id}&export=download`,
              thumbnailLink: file.thumbnailLink,
            }));
          }
        } catch (apiError) {
          console.warn('API approach failed, will try alternative method');
        }
      }

      // If API didn't work or no key available, try alternative approach
      if (files.length === 0) {
        // Create mock files for demonstration - in a real app, you'd implement web scraping or use OAuth
        // For now, we'll show the user how to manually add files
        throw new Error(`To access Google Drive folders, please:
1. Get a Google Drive API key from Google Cloud Console
2. Add it as VITE_GOOGLE_DRIVE_API_KEY in your environment
3. Or manually download files and upload them locally

The folder link appears valid but requires API authentication to access programmatically.`);
      }

      setState(prev => ({
        ...prev,
        isConnected: true,
        isLoading: false,
        files: files,
      }));

      toast({
        title: "Google Drive Connected",
        description: `Found ${files.length} audio files in the shared folder`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Google Drive folder';
      setState(prev => ({
        ...prev,
        isConnected: false,
        isLoading: false,
        error: errorMessage,
      }));

      toast({
        title: "Google Drive Access Required",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  const loadGoogleDriveFiles = useCallback(async () => {
    if (!GOOGLE_DRIVE_API_KEY || !SHARED_FOLDER_ID) {
      setState(prev => ({ 
        ...prev, 
        error: 'Google Drive API key or folder ID not configured' 
      }));
      toast({
        title: "Configuration Error",
        description: "Google Drive API credentials are not properly configured",
        variant: "destructive",
      });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Query Google Drive API for files in the shared folder
      const audioMimeTypes = [
        'audio/mpeg',
        'audio/wav',
        'audio/flac',
        'audio/m4a',
        'audio/aac',
        'audio/ogg'
      ];

      const mimeTypeQuery = audioMimeTypes.map(type => `mimeType='${type}'`).join(' or ');
      const query = `'${SHARED_FOLDER_ID}' in parents and (${mimeTypeQuery}) and trashed=false`;
      
      const url = new URL('https://www.googleapis.com/drive/v3/files');
      url.searchParams.append('q', query);
      url.searchParams.append('key', GOOGLE_DRIVE_API_KEY);
      url.searchParams.append('fields', 'files(id,name,mimeType,size,thumbnailLink)');
      url.searchParams.append('pageSize', '100');

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      const driveFiles: GoogleDriveFile[] = data.files.map((file: any) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size || '0',
        downloadUrl: `https://drive.google.com/uc?id=${file.id}&export=download`,
        thumbnailLink: file.thumbnailLink,
      }));

      setState(prev => ({
        ...prev,
        isConnected: true,
        isLoading: false,
        files: driveFiles,
      }));

      toast({
        title: "Google Drive Connected",
        description: `Found ${driveFiles.length} audio files`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Google Drive';
      setState(prev => ({
        ...prev,
        isConnected: false,
        isLoading: false,
        error: errorMessage,
      }));

      toast({
        title: "Google Drive Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [GOOGLE_DRIVE_API_KEY, SHARED_FOLDER_ID, toast]);

  const importTracksFromDrive = useCallback(async (fileIds: string[]): Promise<Track[]> => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    const importedTracks: Track[] = [];

    try {
      for (const fileId of fileIds) {
        const driveFile = state.files.find(f => f.id === fileId);
        if (!driveFile) continue;

        // Download file to extract metadata
        let trackData;
        try {
          // Use our proxy endpoint for better authentication handling
          const downloadUrl = `/api/drive-proxy/${driveFile.id}`;
          
          // Parse metadata from filename
          const nameWithoutExt = driveFile.name.replace(/\.[^/.]+$/, "");
          let title = nameWithoutExt;
          let artist = 'Unknown Artist';
          let album = 'Unknown Album';
          
          // Common filename patterns:
          // "Artist - Title"
          if (nameWithoutExt.includes(' - ')) {
            const parts = nameWithoutExt.split(' - ');
            if (parts.length === 2) {
              artist = parts[0].trim();
              title = parts[1].trim();
            } else if (parts.length === 3) {
              // "Artist - Album - Title"
              artist = parts[0].trim();
              album = parts[1].trim();
              title = parts[2].trim();
            }
          }
          // "01. Title" or "01 Title"
          else if (/^\d{1,2}[\.\s]/.test(nameWithoutExt)) {
            title = nameWithoutExt.replace(/^\d{1,2}[\.\s]+/, '').trim();
          }
          
          trackData = {
            title: title,
            artist: artist,
            album: album,
            genre: 'Unknown',
            duration: 0,
            fileUrl: downloadUrl, // Use API endpoint instead of uc URL
            fileSource: 'google_drive' as const,
            albumArt: driveFile.thumbnailLink || null,
            metadata: {
              googleDriveId: driveFile.id,
              originalFileName: driveFile.name,
              fileSize: parseInt(driveFile.size),
              mimeType: driveFile.mimeType,
              importDate: new Date().toISOString(),
            },
          };
        } catch (error) {
          console.error('Error processing Google Drive file:', error);
          // Fallback to basic track data
          trackData = {
            title: driveFile.name.replace(/\.[^/.]+$/, ""),
            artist: 'Unknown Artist',
            album: 'Google Drive Import',
            genre: 'Unknown',
            duration: 0,
            fileUrl: `/api/drive-proxy/${driveFile.id}`,
            fileSource: 'google_drive' as const,
            albumArt: driveFile.thumbnailLink || null,
            metadata: {
              googleDriveId: driveFile.id,
              originalFileName: driveFile.name,
              fileSize: parseInt(driveFile.size),
              mimeType: driveFile.mimeType,
              importDate: new Date().toISOString(),
            },
          };
        }

        try {
          const response = await apiRequest('POST', '/api/tracks', trackData);
          const savedTrack = await response.json();
          importedTracks.push(savedTrack);
        } catch (trackError) {
          console.error(`Failed to import track ${driveFile.name}:`, trackError);
        }
      }

      setState(prev => ({ ...prev, isLoading: false }));

      // Invalidate tracks cache to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/tracks'] });

      if (importedTracks.length > 0) {
        toast({
          title: "Import Successful",
          description: `Successfully imported ${importedTracks.length} track(s) from Google Drive`,
        });
      }

      return importedTracks;

    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      return [];
    }
  }, [state.files, toast]);

  const disconnect = useCallback(() => {
    setState({
      isConnected: false,
      isLoading: false,
      error: null,
      files: [],
    });
  }, []);

  return {
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    error: state.error,
    files: state.files,
    loadGoogleDriveFiles,
    loadGoogleDriveFilesByUrl,
    importTracksFromDrive,
    disconnect,
  };
}
