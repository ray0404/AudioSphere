import { useState, useCallback } from 'react';
import { Track } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
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
      // Try to access the folder using the Drive API without authentication
      // This works for publicly shared folders
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
      
      // Try without API key first (for public folders)
      let url = new URL('https://www.googleapis.com/drive/v3/files');
      url.searchParams.append('q', query);
      url.searchParams.append('fields', 'files(id,name,mimeType,size,thumbnailLink)');
      url.searchParams.append('pageSize', '100');

      let response = await fetch(url.toString());
      
      // If that fails, try with API key if available
      if (!response.ok && GOOGLE_DRIVE_API_KEY) {
        url.searchParams.append('key', GOOGLE_DRIVE_API_KEY);
        response = await fetch(url.toString());
      }
      
      if (!response.ok) {
        throw new Error(`Unable to access folder. Make sure it's shared publicly with "Anyone with the link can view" permissions.`);
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
        description: `Found ${driveFiles.length} audio files in the shared folder`,
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
        title: "Google Drive Error",
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

        // Create track data for Google Drive file
        const trackData = {
          title: driveFile.name.replace(/\.[^/.]+$/, ""),
          artist: 'Unknown Artist',
          album: 'Google Drive Import',
          genre: 'Unknown',
          duration: 0, // Will be set when file is loaded
          fileUrl: driveFile.downloadUrl,
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

        try {
          const response = await apiRequest('POST', '/api/tracks', trackData);
          const savedTrack = await response.json();
          importedTracks.push(savedTrack);
        } catch (trackError) {
          console.error(`Failed to import track ${driveFile.name}:`, trackError);
        }
      }

      setState(prev => ({ ...prev, isLoading: false }));

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
